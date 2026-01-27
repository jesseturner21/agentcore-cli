import { ConfigIO } from '../../../lib';
import type { AgentCoreProjectSpec, RemovalPolicy } from '../../../schema';
import type { RemovalBlocker, RemovalPreview, RemovalResult, SchemaChange } from './types';

/**
 * Represents a memory provider that can be removed.
 */
export interface RemovableMemory {
  name: string;
  ownerAgent: string;
  userAgents: string[];
  removalPolicy: RemovalPolicy;
}

/**
 * Get list of memory providers available for removal.
 * Only returns memories that are owned (relation: 'own').
 */
export async function getRemovableMemories(): Promise<RemovableMemory[]> {
  try {
    const configIO = new ConfigIO();
    const projectSpec = await configIO.readProjectSpec();
    const memories: RemovableMemory[] = [];

    // Find owned memories
    for (const agent of projectSpec.agents) {
      for (const memory of agent.memoryProviders) {
        if (memory.relation === 'own') {
          // Find agents that use this memory
          const userAgents: string[] = [];
          for (const otherAgent of projectSpec.agents) {
            if (otherAgent.name === agent.name) continue;
            const usesMemory = otherAgent.memoryProviders.some(m => m.relation === 'use' && m.name === memory.name);
            if (usesMemory) {
              userAgents.push(otherAgent.name);
            }
          }

          memories.push({
            name: memory.name,
            ownerAgent: agent.name,
            userAgents,
            removalPolicy: memory.removalPolicy ?? 'cascade',
          });
        }
      }
    }

    return memories;
  } catch {
    return [];
  }
}

/**
 * Compute the preview of what will be removed when removing a memory.
 * Checks for restrict policy and returns blockers if applicable.
 */
export async function previewRemoveMemory(memoryName: string): Promise<RemovalPreview> {
  const configIO = new ConfigIO();
  const projectSpec = await configIO.readProjectSpec();

  // Find the memory
  let ownerAgent: string | undefined;
  let removalPolicy: RemovalPolicy = 'cascade';
  const userAgents: string[] = [];

  for (const agent of projectSpec.agents) {
    for (const memory of agent.memoryProviders) {
      if (memory.name === memoryName) {
        if (memory.relation === 'own') {
          ownerAgent = agent.name;
          removalPolicy = memory.removalPolicy ?? 'cascade';
        } else {
          userAgents.push(agent.name);
        }
      }
    }
  }

  if (!ownerAgent) {
    throw new Error(`Memory "${memoryName}" not found.`);
  }

  const summary: string[] = [`Removing memory: ${memoryName}`];
  const schemaChanges: SchemaChange[] = [];

  summary.push(`Owner: ${ownerAgent}`);
  summary.push(`Policy: ${removalPolicy}`);

  // Check for restrict policy with dependents
  if (removalPolicy === 'restrict' && userAgents.length > 0) {
    const blockers: RemovalBlocker[] = [
      {
        resourceType: 'memory',
        resourceName: memoryName,
        policy: 'restrict',
        dependents: userAgents,
      },
    ];
    summary.push(`BLOCKED: Memory has removalPolicy: restrict and is used by: ${userAgents.join(', ')}`);
    return { summary, directoriesToDelete: [], schemaChanges: [], blockers };
  }

  if (userAgents.length > 0) {
    summary.push(`[cascade] Removing references from ${userAgents.length} user agent(s): ${userAgents.join(', ')}`);
  }

  // Compute schema change
  const afterSpec = computeRemovedMemorySpec(projectSpec, memoryName);
  schemaChanges.push({
    file: 'agentcore/agentcore.json',
    before: projectSpec,
    after: afterSpec,
  });

  return { summary, directoriesToDelete: [], schemaChanges };
}

/**
 * Compute the project spec after removing a memory.
 */
function computeRemovedMemorySpec(projectSpec: AgentCoreProjectSpec, memoryName: string): AgentCoreProjectSpec {
  const agents = projectSpec.agents.map(agent => ({
    ...agent,
    memoryProviders: agent.memoryProviders.filter(m => m.name !== memoryName),
  }));

  return { ...projectSpec, agents };
}

/**
 * Remove a memory provider from the project.
 * Respects removal policy - fails if restrict policy with dependents.
 */
export async function removeMemory(memoryName: string): Promise<RemovalResult> {
  try {
    const configIO = new ConfigIO();
    const projectSpec = await configIO.readProjectSpec();

    // Find memory and check policy
    let ownerAgent: string | undefined;
    let removalPolicy: RemovalPolicy = 'cascade';
    const userAgents: string[] = [];

    for (const agent of projectSpec.agents) {
      for (const memory of agent.memoryProviders) {
        if (memory.name === memoryName) {
          if (memory.relation === 'own') {
            ownerAgent = agent.name;
            removalPolicy = memory.removalPolicy ?? 'cascade';
          } else {
            userAgents.push(agent.name);
          }
        }
      }
    }

    if (!ownerAgent) {
      return { ok: false, error: `Memory "${memoryName}" not found.` };
    }

    // Check for restrict policy with dependents
    if (removalPolicy === 'restrict' && userAgents.length > 0) {
      return {
        ok: false,
        error: `Cannot remove memory "${memoryName}": removalPolicy is "restrict" and it is used by: ${userAgents.join(', ')}`,
      };
    }

    // Compute and write new spec
    const newSpec = computeRemovedMemorySpec(projectSpec, memoryName);
    await configIO.writeProjectSpec(newSpec);

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
