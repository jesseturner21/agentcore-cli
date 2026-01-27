import { ConfigIO } from '../../../lib';
import type { AgentCoreProjectSpec, RemovalPolicy } from '../../../schema';
import type { RemovalBlocker, RemovalPreview, RemovalResult, SchemaChange } from './types';

/**
 * Represents an identity provider that can be removed.
 */
export interface RemovableIdentity {
  name: string;
  ownerAgent: string;
  userAgents: string[];
  variant: string;
  removalPolicy: RemovalPolicy;
}

/**
 * Get list of identity providers available for removal.
 * Only returns identities that are owned (relation: 'own').
 */
export async function getRemovableIdentities(): Promise<RemovableIdentity[]> {
  try {
    const configIO = new ConfigIO();
    const projectSpec = await configIO.readProjectSpec();
    const identities: RemovableIdentity[] = [];

    // Find owned identities
    for (const agent of projectSpec.agents) {
      for (const identity of agent.identityProviders) {
        if (identity.relation === 'own') {
          // Find agents that use this identity
          const userAgents: string[] = [];
          for (const otherAgent of projectSpec.agents) {
            if (otherAgent.name === agent.name) continue;
            const usesIdentity = otherAgent.identityProviders.some(
              i => i.relation === 'use' && i.name === identity.name
            );
            if (usesIdentity) {
              userAgents.push(otherAgent.name);
            }
          }

          identities.push({
            name: identity.name,
            ownerAgent: agent.name,
            userAgents,
            variant: identity.variant,
            removalPolicy: identity.removalPolicy ?? 'cascade',
          });
        }
      }
    }

    return identities;
  } catch {
    return [];
  }
}

/**
 * Compute the preview of what will be removed when removing an identity.
 * Checks for restrict policy and returns blockers if applicable.
 */
export async function previewRemoveIdentity(identityName: string): Promise<RemovalPreview> {
  const configIO = new ConfigIO();
  const projectSpec = await configIO.readProjectSpec();

  // Find the identity
  let ownerAgent: string | undefined;
  let variant: string | undefined;
  let removalPolicy: RemovalPolicy = 'cascade';
  const userAgents: string[] = [];

  for (const agent of projectSpec.agents) {
    for (const identity of agent.identityProviders) {
      if (identity.name === identityName) {
        if (identity.relation === 'own') {
          ownerAgent = agent.name;
          variant = identity.variant;
          removalPolicy = identity.removalPolicy ?? 'cascade';
        } else {
          userAgents.push(agent.name);
        }
      }
    }
  }

  if (!ownerAgent) {
    throw new Error(`Identity "${identityName}" not found.`);
  }

  const summary: string[] = [`Removing identity: ${identityName}`];
  const schemaChanges: SchemaChange[] = [];

  summary.push(`Owner: ${ownerAgent}`);
  summary.push(`Type: ${variant}`);
  summary.push(`Policy: ${removalPolicy}`);

  // Check for restrict policy with dependents
  if (removalPolicy === 'restrict' && userAgents.length > 0) {
    const blockers: RemovalBlocker[] = [
      {
        resourceType: 'identity',
        resourceName: identityName,
        policy: 'restrict',
        dependents: userAgents,
      },
    ];
    summary.push(`BLOCKED: Identity has removalPolicy: restrict and is used by: ${userAgents.join(', ')}`);
    return { summary, directoriesToDelete: [], schemaChanges: [], blockers };
  }

  if (userAgents.length > 0) {
    summary.push(`[cascade] Removing references from ${userAgents.length} user agent(s): ${userAgents.join(', ')}`);
  }

  // Note about .env
  summary.push(`Note: .env file will not be modified`);

  // Compute schema change
  const afterSpec = computeRemovedIdentitySpec(projectSpec, identityName);
  schemaChanges.push({
    file: 'agentcore/agentcore.json',
    before: projectSpec,
    after: afterSpec,
  });

  return { summary, directoriesToDelete: [], schemaChanges };
}

/**
 * Compute the project spec after removing an identity.
 */
function computeRemovedIdentitySpec(projectSpec: AgentCoreProjectSpec, identityName: string): AgentCoreProjectSpec {
  const agents = projectSpec.agents.map(agent => ({
    ...agent,
    identityProviders: agent.identityProviders.filter(i => i.name !== identityName),
  }));

  return { ...projectSpec, agents };
}

/**
 * Remove an identity provider from the project.
 * Respects removal policy - fails if restrict policy with dependents.
 */
export async function removeIdentity(identityName: string): Promise<RemovalResult> {
  try {
    const configIO = new ConfigIO();
    const projectSpec = await configIO.readProjectSpec();

    // Find identity and check policy
    let ownerAgent: string | undefined;
    let removalPolicy: RemovalPolicy = 'cascade';
    const userAgents: string[] = [];

    for (const agent of projectSpec.agents) {
      for (const identity of agent.identityProviders) {
        if (identity.name === identityName) {
          if (identity.relation === 'own') {
            ownerAgent = agent.name;
            removalPolicy = identity.removalPolicy ?? 'cascade';
          } else {
            userAgents.push(agent.name);
          }
        }
      }
    }

    if (!ownerAgent) {
      return { ok: false, error: `Identity "${identityName}" not found.` };
    }

    // Check for restrict policy with dependents
    if (removalPolicy === 'restrict' && userAgents.length > 0) {
      return {
        ok: false,
        error: `Cannot remove identity "${identityName}": removalPolicy is "restrict" and it is used by: ${userAgents.join(', ')}`,
      };
    }

    // Compute and write new spec
    const newSpec = computeRemovedIdentitySpec(projectSpec, identityName);
    await configIO.writeProjectSpec(newSpec);

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
