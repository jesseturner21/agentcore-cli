import { ConfigIO, requireConfigRoot } from '../../../lib';
import type {
  AgentCoreCliMcpDefs,
  AgentCoreGateway,
  AgentCoreGatewayProvider,
  AgentCoreGatewayTarget,
  AgentCoreMcpRuntimeRef,
  AgentCoreMcpRuntimeTool,
  AgentCoreMcpSpec,
  CodeZipRuntimeConfig,
  DirectoryPath,
  FilePath,
} from '../../../schema';
import { AgentCoreCliMcpDefsSchema, ToolDefinitionSchema } from '../../../schema';
import { getTemplateToolDefinitions, renderMcpToolTemplate } from '../../templates/McpToolRenderer';
import type { AddGatewayConfig, AddMcpToolConfig } from '../../tui/screens/mcp/types';
import { DEFAULT_HANDLER, DEFAULT_NODE_VERSION, DEFAULT_PYTHON_VERSION } from '../../tui/screens/mcp/types';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

const MCP_DEFS_FILE = 'mcp-defs.json';

export interface CreateGatewayResult {
  name: string;
}

export interface CreateToolResult {
  mcpDefsPath: string;
  toolName: string;
  projectPath: string;
}

function resolveMcpDefsPath(): string {
  return join(requireConfigRoot(), MCP_DEFS_FILE);
}

async function readMcpDefs(filePath: string): Promise<AgentCoreCliMcpDefs> {
  if (!existsSync(filePath)) {
    return { tools: {} };
  }

  const raw = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;
  const result = AgentCoreCliMcpDefsSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('Invalid mcp-defs.json. Fix it before adding a new MCP tool.');
  }
  return result.data;
}

async function writeMcpDefs(filePath: string, data: AgentCoreCliMcpDefs): Promise<void> {
  const configRoot = requireConfigRoot();
  await mkdir(configRoot, { recursive: true });
  const content = JSON.stringify(data, null, 2);
  await writeFile(filePath, content, 'utf-8');
}

function resolveGatewayProviderName(agentName: string, existingProviders: { name: string }[]): string {
  const baseName = `${agentName}Gateway`;
  if (!existingProviders.some(provider => provider.name === baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (existingProviders.some(provider => provider.name === `${baseName}${suffix}`)) {
    suffix += 1;
  }
  return `${baseName}${suffix}`;
}

export function computeDefaultGatewayEnvVarName(gatewayName: string): string {
  const sanitized = gatewayName.toUpperCase().replace(/-/g, '_');
  return `AGENTCORE_GATEWAY_${sanitized}_URL`;
}

/**
 * Builds authorizer configuration from wizard config.
 * Returns undefined if not using CUSTOM_JWT or no JWT config provided.
 */
function buildAuthorizerConfiguration(config: AddGatewayConfig): AgentCoreGateway['authorizerConfiguration'] {
  if (config.authorizerType !== 'CUSTOM_JWT' || !config.jwtConfig) {
    return undefined;
  }

  return {
    customJwtAuthorizer: {
      discoveryUrl: config.jwtConfig.discoveryUrl,
      allowedAudience: config.jwtConfig.allowedAudience,
      allowedClients: config.jwtConfig.allowedClients,
    },
  };
}

function buildGatewayProvider(
  agentName: string,
  gatewayName: string,
  existingProviders: { name: string }[]
): AgentCoreGatewayProvider {
  return {
    type: 'AgentCoreGateway',
    name: resolveGatewayProviderName(agentName, existingProviders),
    description: `Gateway provider for ${gatewayName}`,
    gatewayName,
    envVarName: computeDefaultGatewayEnvVarName(gatewayName),
  };
}

/**
 * Get list of existing gateway names from project spec.
 */
export async function getExistingGateways(): Promise<string[]> {
  try {
    const configIO = new ConfigIO();
    if (!configIO.configExists('mcp')) {
      return [];
    }
    const mcpSpec = await configIO.readMcpSpec();
    return mcpSpec.agentCoreGateways.map(g => g.name);
  } catch {
    return [];
  }
}

/**
 * Get list of agent names from project spec.
 */
export async function getAvailableAgents(): Promise<string[]> {
  try {
    const configIO = new ConfigIO();
    const project = await configIO.readProjectSpec();
    return project.agents.map(agent => agent.name);
  } catch {
    return [];
  }
}

/**
 * Get list of existing tool names from MCP spec (both MCP runtime and gateway targets).
 */
export async function getExistingToolNames(): Promise<string[]> {
  try {
    const configIO = new ConfigIO();
    if (!configIO.configExists('mcp')) {
      return [];
    }
    const mcpSpec = await configIO.readMcpSpec();
    const toolNames: string[] = [];

    // MCP runtime tools
    for (const tool of mcpSpec.mcpRuntimeTools ?? []) {
      toolNames.push(tool.name);
    }

    // Gateway targets
    for (const gateway of mcpSpec.agentCoreGateways) {
      for (const target of gateway.targets) {
        for (const toolDef of target.toolDefinitions) {
          toolNames.push(toolDef.name);
        }
      }
    }

    return toolNames;
  } catch {
    return [];
  }
}

export function computeDefaultMcpRuntimeEnvVarName(runtimeName: string): string {
  const sanitized = runtimeName.toUpperCase().replace(/-/g, '_');
  return `AGENTCORE_MCPRUNTIME_${sanitized}_URL`;
}

function resolveMcpRuntimeRefName(agentName: string, existingRemoteTools: { name: string }[]): string {
  const baseName = `${agentName}McpRuntime`;
  if (!existingRemoteTools.some(tool => tool.name === baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (existingRemoteTools.some(tool => tool.name === `${baseName}${suffix}`)) {
    suffix += 1;
  }
  return `${baseName}${suffix}`;
}

function buildMcpRuntimeRef(
  agentName: string,
  mcpRuntimeName: string,
  existingRemoteTools: { name: string }[]
): AgentCoreMcpRuntimeRef {
  return {
    type: 'AgentCoreMcpRuntime',
    name: resolveMcpRuntimeRefName(agentName, existingRemoteTools),
    description: `MCP runtime reference for ${mcpRuntimeName}`,
    mcpRuntimeName,
    envVarName: computeDefaultMcpRuntimeEnvVarName(mcpRuntimeName),
  };
}

/**
 * Create a gateway (no tools attached).
 */
export async function createGatewayFromWizard(config: AddGatewayConfig): Promise<CreateGatewayResult> {
  const configIO = new ConfigIO();
  const mcpSpec: AgentCoreMcpSpec = configIO.configExists('mcp')
    ? await configIO.readMcpSpec()
    : { agentCoreGateways: [] };

  // Check if gateway already exists
  if (mcpSpec.agentCoreGateways.some(g => g.name === config.name)) {
    throw new Error(`Gateway "${config.name}" already exists.`);
  }

  const gateway: AgentCoreGateway = {
    name: config.name,
    description: config.description,
    targets: [],
    authorizerType: config.authorizerType,
    authorizerConfiguration: buildAuthorizerConfiguration(config),
  };

  mcpSpec.agentCoreGateways.push(gateway);
  await configIO.writeMcpSpec(mcpSpec);

  if (config.agents.length > 0) {
    const project = await configIO.readProjectSpec();

    for (const agentName of config.agents) {
      const agent = project.agents.find(candidate => candidate.name === agentName);
      if (!agent) {
        throw new Error(`Agent "${agentName}" not found in agentcore.json.`);
      }
      const alreadyLinked = agent.mcpProviders.some(
        provider => provider.type === 'AgentCoreGateway' && provider.gatewayName === config.name
      );
      if (alreadyLinked) {
        continue;
      }
      agent.mcpProviders.push(buildGatewayProvider(agent.name, config.name, agent.mcpProviders));
    }

    await configIO.writeProjectSpec(project);
  }

  return { name: config.name };
}

function validateMcpToolLanguage(language: string): asserts language is 'Python' | 'TypeScript' {
  if (language !== 'Python' && language !== 'TypeScript') {
    throw new Error(`MCP tools for language "${language}" are not yet supported.`);
  }
}

/**
 * Create an MCP tool (MCP runtime or behind gateway).
 */
export async function createToolFromWizard(config: AddMcpToolConfig): Promise<CreateToolResult> {
  validateMcpToolLanguage(config.language);

  const configIO = new ConfigIO();
  const mcpSpec: AgentCoreMcpSpec = configIO.configExists('mcp')
    ? await configIO.readMcpSpec()
    : { agentCoreGateways: [] };

  // Get tool definitions based on host type
  // Lambda template has multiple predefined tools; AgentCoreRuntime uses the user-provided definition
  const toolDefs =
    config.host === 'Lambda' ? getTemplateToolDefinitions(config.name, config.host) : [config.toolDefinition];

  // Validate tool definitions
  for (const toolDef of toolDefs) {
    ToolDefinitionSchema.parse(toolDef);
  }

  if (config.exposure === 'mcp-runtime') {
    // MCP Runtime tool - always AgentCoreRuntime (single tool)
    // Build explicit CodeZipRuntimeConfig - no CLI-managed placeholders
    const runtimeConfig: CodeZipRuntimeConfig = {
      artifact: 'CodeZip',
      pythonVersion: DEFAULT_PYTHON_VERSION,
      name: config.name,
      entrypoint: 'server.py:main' as FilePath,
      codeLocation: config.sourcePath as DirectoryPath,
      networkMode: 'PUBLIC',
    };

    const mcpRuntimeTool: AgentCoreMcpRuntimeTool = {
      name: config.name,
      toolDefinition: config.toolDefinition,
      compute: {
        host: 'AgentCoreRuntime',
        implementation: {
          path: config.sourcePath,
          language: config.language,
          handler: DEFAULT_HANDLER,
        },
        runtime: runtimeConfig,
      },
    };

    const mcpRuntimeTools = mcpSpec.mcpRuntimeTools ?? [];
    if (mcpRuntimeTools.some(tool => tool.name === mcpRuntimeTool.name)) {
      throw new Error(`MCP runtime tool "${mcpRuntimeTool.name}" already exists.`);
    }
    mcpSpec.mcpRuntimeTools = [...mcpRuntimeTools, mcpRuntimeTool];

    // Write mcp.json first
    await configIO.writeMcpSpec(mcpSpec);

    // If agents are selected, add AgentCoreMcpRuntime refs to their remoteTools
    if (config.selectedAgents.length > 0) {
      const project = await configIO.readProjectSpec();

      for (const agentName of config.selectedAgents) {
        const agent = project.agents.find(candidate => candidate.name === agentName);
        if (!agent) {
          throw new Error(`Agent "${agentName}" not found in agentcore.json.`);
        }
        // Check if agent already has this MCP runtime linked
        const alreadyLinked = agent.remoteTools.some(
          tool => tool.type === 'AgentCoreMcpRuntime' && tool.mcpRuntimeName === config.name
        );
        if (alreadyLinked) {
          continue;
        }
        agent.remoteTools.push(buildMcpRuntimeRef(agent.name, config.name, agent.remoteTools));
      }

      await configIO.writeProjectSpec(project);
    }
  } else {
    // Behind gateway
    if (!config.gateway) {
      throw new Error('Gateway name is required for tools behind a gateway.');
    }

    const gateway = mcpSpec.agentCoreGateways.find(g => g.name === config.gateway);
    if (!gateway) {
      throw new Error(`Gateway "${config.gateway}" not found.`);
    }

    // Check for duplicate target name
    if (gateway.targets.some(t => t.name === config.name)) {
      throw new Error(`Target "${config.name}" already exists in gateway "${gateway.name}".`);
    }

    // Check for duplicate tool names
    for (const toolDef of toolDefs) {
      for (const existingTarget of gateway.targets) {
        if (existingTarget.toolDefinitions.some(t => t.name === toolDef.name)) {
          throw new Error(`Tool "${toolDef.name}" already exists in gateway "${gateway.name}".`);
        }
      }
    }

    // Create a single target with all tool definitions
    const target: AgentCoreGatewayTarget = {
      name: config.name,
      targetType: config.host === 'AgentCoreRuntime' ? 'mcpServer' : 'lambda',
      toolDefinitions: toolDefs,
      compute:
        config.host === 'Lambda'
          ? {
              host: 'Lambda',
              implementation: {
                path: config.sourcePath,
                language: config.language,
                handler: DEFAULT_HANDLER,
              },
              ...(config.language === 'Python'
                ? { pythonVersion: DEFAULT_PYTHON_VERSION }
                : { nodeVersion: DEFAULT_NODE_VERSION }),
            }
          : {
              host: 'AgentCoreRuntime',
              implementation: {
                path: config.sourcePath,
                language: 'Python',
                handler: 'server.py:main',
              },
              runtime: {
                artifact: 'CodeZip',
                pythonVersion: DEFAULT_PYTHON_VERSION,
                name: config.name,
                entrypoint: 'server.py:main' as FilePath,
                codeLocation: config.sourcePath as DirectoryPath,
                networkMode: 'PUBLIC',
              },
            },
    };

    gateway.targets.push(target);

    // Write mcp.json for gateway case
    await configIO.writeMcpSpec(mcpSpec);
  }

  // Update mcp-defs.json with all tool definitions
  const mcpDefsPath = resolveMcpDefsPath();
  try {
    const mcpDefs = await readMcpDefs(mcpDefsPath);
    for (const toolDef of toolDefs) {
      if (mcpDefs.tools[toolDef.name]) {
        throw new Error(`Tool definition "${toolDef.name}" already exists in mcp-defs.json.`);
      }
      mcpDefs.tools[toolDef.name] = toolDef;
    }
    await writeMcpDefs(mcpDefsPath, mcpDefs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`MCP saved, but failed to update mcp-defs.json: ${message}`);
  }

  // Render MCP tool project template
  // Resolve absolute path from project root
  const configRoot = requireConfigRoot();
  const projectRoot = dirname(configRoot);
  const absoluteSourcePath = join(projectRoot, config.sourcePath);
  await renderMcpToolTemplate(config.name, absoluteSourcePath, config.language, config.host);

  return { mcpDefsPath, toolName: config.name, projectPath: config.sourcePath };
}
