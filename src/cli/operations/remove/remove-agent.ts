import { ConfigIO } from '../../../lib';
import type { AgentCoreProjectSpec, AgentEnvSpec, IdentityProvider, MemoryProvider } from '../../../schema';
import type { RemovalBlocker, RemovalPreview, RemovalResult, SchemaChange } from './types';

/**
 * Get list of agents available for removal.
 */
export async function getRemovableAgents(): Promise<string[]> {
  try {
    const configIO = new ConfigIO();
    const project = await configIO.readProjectSpec();
    return project.agents.map(a => a.name);
  } catch {
    return [];
  }
}

/**
 * Owned resource with its removal policy.
 */
interface OwnedResource {
  name: string;
  removalPolicy: 'cascade' | 'restrict';
}

/**
 * Find memories owned by a specific agent with their removal policies.
 */
function findOwnedMemories(agent: AgentEnvSpec): OwnedResource[] {
  return agent.memoryProviders
    .filter((m): m is MemoryProvider & { relation: 'own' } => m.relation === 'own')
    .map(m => ({
      name: m.name,
      removalPolicy: m.removalPolicy ?? 'cascade',
    }));
}

/**
 * Find identities owned by a specific agent with their removal policies.
 */
function findOwnedIdentities(agent: AgentEnvSpec): OwnedResource[] {
  return agent.identityProviders
    .filter((i): i is IdentityProvider & { relation: 'own' } => i.relation === 'own')
    .map(i => ({
      name: i.name,
      removalPolicy: i.removalPolicy ?? 'cascade',
    }));
}

/**
 * Find agents that use a given memory (excluding the owner).
 */
function findMemoryUsers(projectSpec: AgentCoreProjectSpec, memoryName: string, ownerName: string): string[] {
  return projectSpec.agents
    .filter(a => a.name !== ownerName)
    .filter(a => a.memoryProviders.some(m => m.name === memoryName && m.relation === 'use'))
    .map(a => a.name);
}

/**
 * Find agents that use a given identity (excluding the owner).
 */
function findIdentityUsers(projectSpec: AgentCoreProjectSpec, identityName: string, ownerName: string): string[] {
  return projectSpec.agents
    .filter(a => a.name !== ownerName)
    .filter(a => a.identityProviders.some(i => i.name === identityName && i.relation === 'use'))
    .map(a => a.name);
}

/**
 * Check for removal blockers based on restrict policies.
 */
function checkRemovalBlockers(
  projectSpec: AgentCoreProjectSpec,
  agentName: string,
  ownedMemories: OwnedResource[],
  ownedIdentities: OwnedResource[]
): RemovalBlocker[] {
  const blockers: RemovalBlocker[] = [];

  // Check memories with restrict policy
  for (const memory of ownedMemories) {
    if (memory.removalPolicy === 'restrict') {
      const users = findMemoryUsers(projectSpec, memory.name, agentName);
      if (users.length > 0) {
        blockers.push({
          resourceType: 'memory',
          resourceName: memory.name,
          policy: 'restrict',
          dependents: users,
        });
      }
    }
  }

  // Check identities with restrict policy
  for (const identity of ownedIdentities) {
    if (identity.removalPolicy === 'restrict') {
      const users = findIdentityUsers(projectSpec, identity.name, agentName);
      if (users.length > 0) {
        blockers.push({
          resourceType: 'identity',
          resourceName: identity.name,
          policy: 'restrict',
          dependents: users,
        });
      }
    }
  }

  return blockers;
}

/**
 * Compute the preview of what will be removed when removing an agent.
 * This includes cascading removals for owned memories/identities.
 * If any owned resource has a restrict policy with dependents, blockers are returned.
 */
export async function previewRemoveAgent(agentName: string): Promise<RemovalPreview> {
  const configIO = new ConfigIO();
  const projectSpec = await configIO.readProjectSpec();

  const agent = projectSpec.agents.find(a => a.name === agentName);
  if (!agent) {
    throw new Error(`Agent "${agentName}" not found.`);
  }

  const summary: string[] = [`Removing agent: ${agentName}`];
  const schemaChanges: SchemaChange[] = [];

  // Find owned memories and identities with their removal policies
  const ownedMemories = findOwnedMemories(agent);
  const ownedIdentities = findOwnedIdentities(agent);

  // Check for blockers (restrict policy with dependents)
  const blockers = checkRemovalBlockers(projectSpec, agentName, ownedMemories, ownedIdentities);

  // If there are blockers, return early with blocker info
  if (blockers.length > 0) {
    for (const blocker of blockers) {
      summary.push(
        `BLOCKED: ${blocker.resourceType} "${blocker.resourceName}" has removalPolicy: restrict and is used by: ${blocker.dependents.join(', ')}`
      );
    }
    return { summary, directoriesToDelete: [], schemaChanges: [], blockers };
  }

  // List owned resources with their removal policies
  if (ownedMemories.length > 0) {
    summary.push('Owned memories:');
    for (const memory of ownedMemories) {
      summary.push(`  ${memory.name} [${memory.removalPolicy}]`);
    }
  }

  if (ownedIdentities.length > 0) {
    summary.push('Owned identities:');
    for (const identity of ownedIdentities) {
      summary.push(`  ${identity.name} [${identity.removalPolicy}]`);
    }
  }

  // Compute schema change
  const ownedMemoryNames = ownedMemories.map(m => m.name);
  const ownedIdentityNames = ownedIdentities.map(i => i.name);
  const afterSpec = computeRemovedAgentSpec(projectSpec, agentName, ownedMemoryNames, ownedIdentityNames);
  schemaChanges.push({
    file: 'agentcore/agentcore.json',
    before: projectSpec,
    after: afterSpec,
  });

  // Note: We no longer delete agent directories on remove
  return { summary, directoriesToDelete: [], schemaChanges };
}

/**
 * Compute the project spec after removing an agent.
 */
function computeRemovedAgentSpec(
  projectSpec: AgentCoreProjectSpec,
  agentName: string,
  ownedMemories: string[],
  ownedIdentities: string[]
): AgentCoreProjectSpec {
  // Remove the agent
  const agents = projectSpec.agents.filter(a => a.name !== agentName);

  // Remove references to owned memories/identities from other agents
  for (const agent of agents) {
    // Remove memory references
    agent.memoryProviders = agent.memoryProviders.filter(m => !ownedMemories.includes(m.name));

    // Remove identity references
    agent.identityProviders = agent.identityProviders.filter(i => !ownedIdentities.includes(i.name));

    // Remove agent invocation references to the removed agent
    agent.remoteTools = agent.remoteTools.filter(
      t => !(t.type === 'AgentCoreAgentInvocation' && t.targetAgentName === agentName)
    );
  }

  return { ...projectSpec, agents };
}

/**
 * Remove an agent from the project.
 * Respects removal policies on owned resources.
 */
export async function removeAgent(agentName: string): Promise<RemovalResult> {
  try {
    const configIO = new ConfigIO();
    const projectSpec = await configIO.readProjectSpec();

    const agent = projectSpec.agents.find(a => a.name === agentName);
    if (!agent) {
      return { ok: false, error: `Agent "${agentName}" not found.` };
    }

    // Find owned resources for cascade deletion
    const ownedMemories = findOwnedMemories(agent);
    const ownedIdentities = findOwnedIdentities(agent);

    // Check for blockers (restrict policy with dependents)
    const blockers = checkRemovalBlockers(projectSpec, agentName, ownedMemories, ownedIdentities);
    if (blockers.length > 0) {
      const blockerMessages = blockers.map(
        b =>
          `${b.resourceType} "${b.resourceName}" has removalPolicy: restrict and is used by: ${b.dependents.join(', ')}`
      );
      return { ok: false, error: `Cannot remove agent: ${blockerMessages.join('; ')}` };
    }

    // Compute new spec (only cascade resources that allow it)
    const ownedMemoryNames = ownedMemories.map(m => m.name);
    const ownedIdentityNames = ownedIdentities.map(i => i.name);
    const newSpec = computeRemovedAgentSpec(projectSpec, agentName, ownedMemoryNames, ownedIdentityNames);

    // Write updated spec
    await configIO.writeProjectSpec(newSpec);

    // Note: We no longer delete agent directories on remove
    // Users can manually delete directories if needed

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
