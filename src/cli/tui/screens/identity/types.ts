import type { IdentityCredentialVariant } from '../../../../schema';

// ─────────────────────────────────────────────────────────────────────────────
// Identity Flow Types
// ─────────────────────────────────────────────────────────────────────────────

export type AddIdentityStep = 'type' | 'name' | 'apiKey' | 'ownerAgent' | 'userAgents' | 'confirm';

export interface AddIdentityConfig {
  identityType: IdentityCredentialVariant;
  name: string;
  apiKey: string;
  /** Agent that owns and manages this identity (relation: 'own') */
  ownerAgent: string;
  /** Agents granted read-only access (relation: 'use') */
  userAgents: string[];
}

export const IDENTITY_STEP_LABELS: Record<AddIdentityStep, string> = {
  type: 'Type',
  name: 'Name',
  apiKey: 'API Key',
  ownerAgent: 'Owner',
  userAgents: 'Grant Access',
  confirm: 'Confirm',
};

// ─────────────────────────────────────────────────────────────────────────────
// UI Option Constants
// ─────────────────────────────────────────────────────────────────────────────

export const IDENTITY_TYPE_OPTIONS = [
  { id: 'ApiKeyCredentialProvider' as const, title: 'API Key', description: 'Store and manage API key credentials' },
] as const;
