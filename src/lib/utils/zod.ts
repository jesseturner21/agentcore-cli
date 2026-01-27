import type { AgentEnvSpec } from '../../schema';
import { AgentEnvSpecSchema } from '../../schema';

/**
 * Pass spec through zod validator to assert it
 * @param spec Agent Spec to validate
 * @returns
 */
export function validateAgentEnvSchema(spec: unknown): AgentEnvSpec {
  const validationResult = AgentEnvSpecSchema.safeParse(spec);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map(e => `${String(e.path.join('.'))}: ${e.message}`).join('; ');
    throw new Error(`Invalid AgentEnvSpec: ${errors}`);
  }

  const validatedSpec = validationResult.data;
  return validatedSpec;
}
