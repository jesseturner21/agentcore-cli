import { ConfigIO, setEnvVar } from '../../../lib';
import type { IdentityCredentialVariant, OwnedIdentityProvider, ReferencedIdentityProvider } from '../../../schema';
import type { AddIdentityConfig } from '../../tui/screens/identity/types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Identity Builders (SOT for identity provider creation)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the default runtime env var name for an identity provider.
 * Pattern: AGENTCORE_IDENTITY_{NAME}
 */
export function computeDefaultIdentityEnvVarName(providerName: string): string {
  return `AGENTCORE_IDENTITY_${providerName.toUpperCase()}`;
}

/**
 * Build an owned identity provider object.
 * Used by both add agent and add identity flows.
 */
export function buildOwnedIdentityProvider(
  name: string,
  variant: IdentityCredentialVariant = 'ApiKeyCredentialProvider'
): OwnedIdentityProvider {
  return {
    type: 'AgentCoreIdentity',
    variant,
    relation: 'own',
    name,
    description: `API key credential provider for ${name}`,
    envVarName: computeDefaultIdentityEnvVarName(name),
  };
}

/**
 * Build a referenced identity provider object (for agents that use but don't own).
 */
export function buildReferencedIdentityProvider(
  name: string,
  variant: IdentityCredentialVariant = 'ApiKeyCredentialProvider'
): ReferencedIdentityProvider {
  return {
    type: 'AgentCoreIdentity',
    variant,
    relation: 'use',
    name,
    description: `API key credential provider for ${name}`,
    envVarName: computeDefaultIdentityEnvVarName(name),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Identity Flow
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateIdentityResult {
  name: string;
  ownerAgent: string;
  userAgents: string[];
}

/**
 * Get list of existing identity provider names across all agents.
 */
export async function getAllIdentityNames(): Promise<string[]> {
  try {
    const configIO = new ConfigIO();
    const project = await configIO.readProjectSpec();
    const names: string[] = [];
    for (const agent of project.agents) {
      for (const identity of agent.identityProviders) {
        if (!names.includes(identity.name)) {
          names.push(identity.name);
        }
      }
    }
    return names;
  } catch {
    return [];
  }
}

/**
 * Create an identity provider and attach it to agents.
 * Owner agent gets relation: 'own', user agents get relation: 'use'.
 */
export async function createIdentityFromWizard(config: AddIdentityConfig): Promise<CreateIdentityResult> {
  const configIO = new ConfigIO();
  const project = await configIO.readProjectSpec();

  // Add owned identity provider to owner agent
  const ownerAgent = project.agents.find(a => a.name === config.ownerAgent);
  if (!ownerAgent) {
    throw new Error(`Owner agent "${config.ownerAgent}" not found in agentcore.json.`);
  }

  if (ownerAgent.identityProviders.some(p => p.name === config.name)) {
    throw new Error(`Identity provider "${config.name}" already exists on agent "${config.ownerAgent}".`);
  }

  ownerAgent.identityProviders.push(buildOwnedIdentityProvider(config.name, config.identityType));

  // Add referenced identity provider to user agents
  for (const userAgentName of config.userAgents) {
    const userAgent = project.agents.find(a => a.name === userAgentName);
    if (!userAgent) {
      throw new Error(`User agent "${userAgentName}" not found in agentcore.json.`);
    }

    if (userAgent.identityProviders.some(p => p.name === config.name)) {
      throw new Error(`Identity provider "${config.name}" already exists on agent "${userAgentName}".`);
    }

    userAgent.identityProviders.push(buildReferencedIdentityProvider(config.name, config.identityType));
  }

  // Write updated project spec
  await configIO.writeProjectSpec(project);

  // Write API key to .env file
  const envVarName = computeDefaultIdentityEnvVarName(config.name);
  await setEnvVar(envVarName, config.apiKey);

  return {
    name: config.name,
    ownerAgent: config.ownerAgent,
    userAgents: config.userAgents,
  };
}
