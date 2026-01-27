import { ConfigIO, requireConfigRoot } from '../../../../lib';
import type { AgentCoreProjectSpec } from '../../../../schema';
import { SCHEMA_VERSION } from '../../../constants';
import { AgentAlreadyExistsError } from '../../../errors';
import type { GenerateConfig } from '../../../tui/screens/generate/types';
import { mapGenerateConfigToAgentEnvSpec } from './schema-mapper';

export interface WriteAgentOptions {
  /** Optional explicit config base directory. If not provided, uses requireConfigRoot() */
  configBaseDir?: string;
}

/**
 * Writes a new agent to the agentcore.json project config.
 *
 * This function:
 * 1. Maps GenerateConfig to AgentEnvSpec
 * 2. If project exists: read, check for duplicates, append new agent, write
 * 3. If project doesn't exist: create minimal AgentCoreProjectSpec with just this agent
 *
 * Uses requireConfigRoot() to locate the agentcore/ config directory, unless configBaseDir is provided.
 *
 * @throws {AgentAlreadyExistsError} If agent with same name exists
 * @throws {NoProjectError} If no agentcore project is found
 */
export async function writeAgentToProject(config: GenerateConfig, options?: WriteAgentOptions): Promise<void> {
  // Find existing agentcore/ directory
  const configBaseDir = options?.configBaseDir ?? requireConfigRoot();
  const configIO = new ConfigIO({ baseDir: configBaseDir });
  const agentEnvSpec = mapGenerateConfigToAgentEnvSpec(config);

  if (configIO.configExists('project')) {
    // Project exists - read, append, write
    const project = await configIO.readProjectSpec();

    // Check for duplicate agent name
    const existingAgent = project.agents.find(agent => agent.name === config.projectName);
    if (existingAgent) {
      throw new AgentAlreadyExistsError(config.projectName);
    }

    // Append new agent
    project.agents.push(agentEnvSpec);

    // Write updated project
    await configIO.writeProjectSpec(project);
  } else {
    // Project doesn't exist - create minimal project with just this agent
    const project: AgentCoreProjectSpec = {
      name: config.projectName,
      version: SCHEMA_VERSION,
      description: `AgentCore project: ${config.projectName}`,
      agents: [agentEnvSpec],
    };

    await configIO.writeProjectSpec(project);
  }
}
