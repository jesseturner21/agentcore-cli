import { uniqueBy } from '../zod-util';
import { z } from 'zod';

// ============================================================================
// Memory Strategy Types
// ============================================================================

export const MemoryStrategyTypeSchema = z.enum(['SEMANTIC', 'SUMMARIZATION', 'USER_PREFERENCE', 'CUSTOM']);
export type MemoryStrategyType = z.infer<typeof MemoryStrategyTypeSchema>;

/**
 * Memory Strategy Types
 *
 * CloudFormation defines memory strategies with separate optional properties:
 * - SemanticMemoryStrategy
 * - SummaryMemoryStrategy (note: CloudFormation uses "Summary", not "Summarization")
 * - UserPreferenceMemoryStrategy
 * - CustomMemoryStrategy
 *
 * Our schema uses a discriminated union for easier validation and type safety.
 *
 * Optional properties:
 * - name: Strategy name (defaults to <memoryName>-<StrategyType> in CDK)
 * - description: Strategy description
 * - namespaces: Array of namespace strings (minimum 1 if provided)
 */

/**
 * Memory strategy name validation.
 * Pattern: ^[a-zA-Z][a-zA-Z0-9_]{0,47}$
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-bedrockagentcore-memory.html#cfn-bedrockagentcore-memory-name
 */
const MemoryStrategyNameSchema = z
  .string()
  .min(1)
  .max(48)
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]{0,47}$/,
    'Must begin with a letter and contain only alphanumeric characters and underscores (max 48 chars)'
  );

export const MemoryStrategySchema = z.object({
  type: MemoryStrategyTypeSchema,
  name: MemoryStrategyNameSchema.optional(),
  description: z.string().optional(),
  namespaces: z.array(z.string()).min(1).optional(),
});

export type MemoryStrategy = z.infer<typeof MemoryStrategySchema>;

/**
 * AgentCore Memory Configuration
 *
 * Required properties:
 * - eventExpiryDuration: Number of days before events expire (7-365)
 * - memoryStrategies: Array of memory strategies (at least one required)
 *
 * Optional properties:
 * - description: Memory description (can also be set at provider level)
 */
export const AgentCoreMemoryConfigSchema = z.object({
  eventExpiryDuration: z.number().int().min(7).max(365),
  memoryStrategies: z
    .array(MemoryStrategySchema)
    .min(1)
    .superRefine(
      uniqueBy(
        strategy => strategy.type,
        type => `Duplicate memory strategy type: ${type}`
      )
    ),
  description: z.string().optional(),
});

export type AgentCoreMemoryConfig = z.infer<typeof AgentCoreMemoryConfigSchema>;
