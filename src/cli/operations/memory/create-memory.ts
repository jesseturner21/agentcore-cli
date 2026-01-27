import { ConfigIO } from '../../../lib';
import type { OwnedMemoryProvider, ReferencedMemoryProvider } from '../../../schema';
import type { AddMemoryConfig, AddMemoryStrategyConfig } from '../../tui/screens/memory/types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Memory Builders (SOT for memory provider creation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Computes the default environment variable name for a memory provider.
 * Formula: AGENTCORE_MEMORY_{SANITIZED_NAME}_ID
 */
export function computeDefaultMemoryEnvVarName(memoryName: string): string {
  const sanitized = memoryName.toUpperCase().replace(/-/g, '_');
  return `AGENTCORE_MEMORY_${sanitized}_ID`;
}

/**
 * Build an owned memory provider object.
 * Used by agents that own and manage the memory resource.
 */
export function buildOwnedMemoryProvider(
  name: string,
  description: string,
  eventExpiryDuration: number,
  strategies: AddMemoryStrategyConfig[]
): OwnedMemoryProvider {
  return {
    type: 'AgentCoreMemory',
    relation: 'own',
    name,
    description,
    config: {
      eventExpiryDuration,
      memoryStrategies: strategies.map(s => ({ type: s.type })),
    },
    envVarName: computeDefaultMemoryEnvVarName(name),
  };
}

/**
 * Build a referenced memory provider object (for agents that use but don't own).
 */
export function buildReferencedMemoryProvider(name: string, description: string): ReferencedMemoryProvider {
  return {
    type: 'AgentCoreMemory',
    relation: 'use',
    name,
    description,
    access: 'readwrite',
    envVarName: computeDefaultMemoryEnvVarName(name),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Memory Flow
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateMemoryResult {
  name: string;
  ownerAgent: string;
  userAgents: string[];
}

/**
 * Get list of existing memory provider names for a specific agent.
 */
export async function getExistingMemoryNames(agentName: string): Promise<string[]> {
  try {
    const configIO = new ConfigIO();
    const project = await configIO.readProjectSpec();
    const agent = project.agents.find(a => a.name === agentName);
    if (!agent) return [];
    return agent.memoryProviders.map(m => m.name);
  } catch {
    return [];
  }
}

/**
 * Get list of all memory provider names across all agents.
 */
export async function getAllMemoryNames(): Promise<string[]> {
  try {
    const configIO = new ConfigIO();
    const project = await configIO.readProjectSpec();
    const names: string[] = [];
    for (const agent of project.agents) {
      for (const memory of agent.memoryProviders) {
        if (!names.includes(memory.name)) {
          names.push(memory.name);
        }
      }
    }
    return names;
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
 * Create a memory provider and attach it to agents.
 * Owner agent gets relation: 'own', user agents get relation: 'use'.
 */
export async function createMemoryFromWizard(config: AddMemoryConfig): Promise<CreateMemoryResult> {
  const configIO = new ConfigIO();
  const project = await configIO.readProjectSpec();

  // Add owned memory provider to owner agent
  const ownerAgent = project.agents.find(a => a.name === config.ownerAgent);
  if (!ownerAgent) {
    throw new Error(`Owner agent "${config.ownerAgent}" not found in agentcore.json.`);
  }

  if (ownerAgent.memoryProviders.some(m => m.name === config.name)) {
    throw new Error(`Memory provider "${config.name}" already exists on agent "${config.ownerAgent}".`);
  }

  ownerAgent.memoryProviders.push(
    buildOwnedMemoryProvider(config.name, config.description, config.eventExpiryDuration, config.strategies)
  );

  // Add referenced memory provider to user agents
  for (const userAgentName of config.userAgents) {
    const userAgent = project.agents.find(a => a.name === userAgentName);
    if (!userAgent) {
      throw new Error(`User agent "${userAgentName}" not found in agentcore.json.`);
    }

    if (userAgent.memoryProviders.some(m => m.name === config.name)) {
      throw new Error(`Memory provider "${config.name}" already exists on agent "${userAgentName}".`);
    }

    userAgent.memoryProviders.push(buildReferencedMemoryProvider(config.name, config.description));
  }

  await configIO.writeProjectSpec(project);

  return {
    name: config.name,
    ownerAgent: config.ownerAgent,
    userAgents: config.userAgents,
  };
}
