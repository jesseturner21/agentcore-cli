import { ConfigIO } from '../../lib';
import type {
  Access,
  AgentCoreAgentInvocation,
  MCPProvider,
  McpRuntimeBinding,
  ReferencedIdentityProvider,
  ReferencedMemoryProvider,
} from '../../schema';

// ─────────────────────────────────────────────────────────────────────────────
// Data Loading Functions
// ─────────────────────────────────────────────────────────────────────────────

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
 * Get list of owned memories across all agents.
 * Returns { name, ownerAgent } for each owned memory.
 */
export async function getOwnedMemories(): Promise<{ name: string; ownerAgent: string }[]> {
  try {
    const configIO = new ConfigIO();
    const project = await configIO.readProjectSpec();
    const memories: { name: string; ownerAgent: string }[] = [];
    for (const agent of project.agents) {
      for (const memory of agent.memoryProviders) {
        if (memory.relation === 'own') {
          memories.push({ name: memory.name, ownerAgent: agent.name });
        }
      }
    }
    return memories;
  } catch {
    return [];
  }
}

/**
 * Get list of owned identities across all agents.
 * Returns { name, ownerAgent } for each owned identity.
 */
export async function getOwnedIdentities(): Promise<{ name: string; ownerAgent: string }[]> {
  try {
    const configIO = new ConfigIO();
    const project = await configIO.readProjectSpec();
    const identities: { name: string; ownerAgent: string }[] = [];
    for (const agent of project.agents) {
      for (const identity of agent.identityProviders) {
        if (identity.relation === 'own') {
          identities.push({ name: identity.name, ownerAgent: agent.name });
        }
      }
    }
    return identities;
  } catch {
    return [];
  }
}

/**
 * Get list of MCP runtime tools from mcp.json.
 */
export async function getMcpRuntimeTools(): Promise<string[]> {
  try {
    const configIO = new ConfigIO();
    const mcpSpec = await configIO.readMcpSpec();
    if (!mcpSpec?.mcpRuntimeTools) return [];
    return mcpSpec.mcpRuntimeTools.map(tool => tool.name);
  } catch {
    return [];
  }
}

/**
 * Get list of gateways from mcp.json.
 */
export async function getGateways(): Promise<string[]> {
  try {
    const configIO = new ConfigIO();
    const mcpSpec = await configIO.readMcpSpec();
    if (!mcpSpec?.agentCoreGateways) return [];
    return mcpSpec.agentCoreGateways.map(gw => gw.name);
  } catch {
    return [];
  }
}

/**
 * Get what's already attached to a specific agent.
 */
export async function getAgentAttachments(agentName: string) {
  const configIO = new ConfigIO();
  const project = await configIO.readProjectSpec();
  const agent = project.agents.find(a => a.name === agentName);

  if (!agent) {
    return {
      memories: [] as string[],
      identities: [] as string[],
      remoteTools: [] as string[],
      mcpProviders: [] as string[],
    };
  }

  return {
    memories: agent.memoryProviders.map(m => m.name),
    identities: agent.identityProviders.map(i => i.name),
    remoteTools: agent.remoteTools.map(t => t.name),
    mcpProviders: agent.mcpProviders.map(p => p.name),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Attach Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface AttachAgentConfig {
  targetAgent: string;
  name: string;
  description: string;
  envVarName: string;
}

/**
 * Attach an agent (as a remote tool) to another agent.
 */
export async function attachAgentToAgent(sourceAgentName: string, config: AttachAgentConfig): Promise<void> {
  const configIO = new ConfigIO();
  const project = await configIO.readProjectSpec();

  const sourceAgent = project.agents.find(a => a.name === sourceAgentName);
  if (!sourceAgent) {
    throw new Error(`Source agent "${sourceAgentName}" not found.`);
  }

  const targetAgent = project.agents.find(a => a.name === config.targetAgent);
  if (!targetAgent) {
    throw new Error(`Target agent "${config.targetAgent}" not found.`);
  }

  if (sourceAgentName === config.targetAgent) {
    throw new Error('Cannot attach an agent to itself.');
  }

  // Check if already attached
  if (sourceAgent.remoteTools.some(t => t.name === config.name)) {
    throw new Error(`Remote tool "${config.name}" already exists on agent "${sourceAgentName}".`);
  }

  const invocation: AgentCoreAgentInvocation = {
    type: 'AgentCoreAgentInvocation',
    targetAgentName: config.targetAgent,
    name: config.name,
    description: config.description,
    envVarName: config.envVarName,
  };

  sourceAgent.remoteTools.push(invocation);
  await configIO.writeProjectSpec(project);
}

export interface BindMcpRuntimeConfig {
  agentName: string;
  envVarName: string;
}

/**
 * Bind an agent to an MCP runtime tool.
 * Adds the binding to the MCP runtime's bindings array in mcp.json.
 */
export async function bindMcpRuntimeToAgent(mcpRuntimeName: string, config: BindMcpRuntimeConfig): Promise<void> {
  const configIO = new ConfigIO();

  // Validate the agent exists
  const project = await configIO.readProjectSpec();
  const agent = project.agents.find(a => a.name === config.agentName);
  if (!agent) {
    throw new Error(`Agent "${config.agentName}" not found.`);
  }

  // Find the MCP runtime tool
  const mcpSpec = await configIO.readMcpSpec();
  const runtimeTool = mcpSpec.mcpRuntimeTools?.find(t => t.name === mcpRuntimeName);
  if (!runtimeTool) {
    throw new Error(`MCP runtime tool "${mcpRuntimeName}" not found in mcp.json.`);
  }

  // Initialize bindings array if needed
  runtimeTool.bindings ??= [];

  // Check if already bound
  if (runtimeTool.bindings.some(b => b.agentName === config.agentName)) {
    throw new Error(`Agent "${config.agentName}" is already bound to MCP runtime "${mcpRuntimeName}".`);
  }

  const binding: McpRuntimeBinding = {
    agentName: config.agentName,
    envVarName: config.envVarName,
  };

  runtimeTool.bindings.push(binding);
  await configIO.writeMcpSpec(mcpSpec);
}

export interface AttachMemoryConfig {
  memoryName: string;
  access: Access;
  namespaces?: string[];
  envVarName: string;
}

/**
 * Attach memory reference to an agent.
 */
export async function attachMemoryToAgent(agentName: string, config: AttachMemoryConfig): Promise<void> {
  const configIO = new ConfigIO();
  const project = await configIO.readProjectSpec();

  const agent = project.agents.find(a => a.name === agentName);
  if (!agent) {
    throw new Error(`Agent "${agentName}" not found.`);
  }

  // Check if already attached
  if (agent.memoryProviders.some(m => m.name === config.memoryName)) {
    throw new Error(`Memory "${config.memoryName}" already attached to agent "${agentName}".`);
  }

  const memoryRef: ReferencedMemoryProvider = {
    type: 'AgentCoreMemory',
    relation: 'use',
    name: config.memoryName,
    description: `Reference to memory ${config.memoryName}`,
    access: config.access,
    envVarName: config.envVarName,
    ...(config.namespaces && config.namespaces.length > 0 ? { namespaces: config.namespaces } : {}),
  };

  agent.memoryProviders.push(memoryRef);
  await configIO.writeProjectSpec(project);
}

export interface AttachIdentityConfig {
  identityName: string;
  envVarName: string;
}

/**
 * Attach identity reference to an agent.
 */
export async function attachIdentityToAgent(agentName: string, config: AttachIdentityConfig): Promise<void> {
  const configIO = new ConfigIO();
  const project = await configIO.readProjectSpec();

  const agent = project.agents.find(a => a.name === agentName);
  if (!agent) {
    throw new Error(`Agent "${agentName}" not found.`);
  }

  // Check if already attached
  if (agent.identityProviders.some(i => i.name === config.identityName)) {
    throw new Error(`Identity "${config.identityName}" already attached to agent "${agentName}".`);
  }

  const identityRef: ReferencedIdentityProvider = {
    type: 'AgentCoreIdentity',
    variant: 'ApiKeyCredentialProvider',
    relation: 'use',
    name: config.identityName,
    description: `Reference to identity ${config.identityName}`,
    envVarName: config.envVarName,
  };

  agent.identityProviders.push(identityRef);
  await configIO.writeProjectSpec(project);
}

export interface AttachGatewayConfig {
  gatewayName: string;
  name: string;
  description: string;
  envVarName: string;
}

/**
 * Attach gateway to an agent.
 */
export async function attachGatewayToAgent(agentName: string, config: AttachGatewayConfig): Promise<void> {
  const configIO = new ConfigIO();
  const project = await configIO.readProjectSpec();

  const agent = project.agents.find(a => a.name === agentName);
  if (!agent) {
    throw new Error(`Agent "${agentName}" not found.`);
  }

  // Check if already attached
  if (agent.mcpProviders.some(p => p.name === config.name)) {
    throw new Error(`MCP provider "${config.name}" already exists on agent "${agentName}".`);
  }

  const gatewayProvider: MCPProvider = {
    type: 'AgentCoreGateway',
    gatewayName: config.gatewayName,
    name: config.name,
    description: config.description,
    envVarName: config.envVarName,
  };

  agent.mcpProviders.push(gatewayProvider);
  await configIO.writeProjectSpec(project);
}
