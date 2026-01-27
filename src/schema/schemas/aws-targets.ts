import { uniqueBy } from './zod-util';
import { z } from 'zod';

// ============================================================================
// AgentCore Regions
// ============================================================================

export const AgentCoreRegionSchema = z.enum([
  'ap-northeast-1',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'eu-central-1',
  'eu-west-1',
  'us-east-1',
  'us-east-2',
  'us-west-2',
]);
export type AgentCoreRegion = z.infer<typeof AgentCoreRegionSchema>;

// ============================================================================
// Deployment Target Name
// ============================================================================

export const DeploymentTargetNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_-]*$/,
    'Name must start with a letter and contain only alphanumeric characters, hyphens, and underscores'
  )
  .describe('Unique identifier for the deployment target');

// ============================================================================
// AWS Account ID
// ============================================================================

export const AwsAccountIdSchema = z
  .string()
  .regex(/^[0-9]{12}$/, 'AWS account ID must be exactly 12 digits')
  .describe('AWS account ID');

// ============================================================================
// Referenced Resources
// ============================================================================

/**
 * Schema for image reference name.
 * Must match keys used in agent-env.json imageRef fields.
 */
const ImageRefNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_-]*$/,
    'Image ref name must start with letter, contain only alphanumeric characters, hyphens, and underscores'
  );

/**
 * Schema for ECR image URI.
 * Format: {account}.dkr.ecr.{region}.amazonaws.com/{repository}:{tag}
 */
const EcrImageUriSchema = z
  .string()
  .min(1)
  .regex(
    /^[0-9]+\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\/.+$/,
    'Must be a valid ECR image URI (e.g., 123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:tag)'
  );

/**
 * External resources referenced by this deployment target.
 * These resources exist outside the project and are not managed by CDK.
 */
export const ReferencedResourcesSchema = z.object({
  /** Map of image reference names to ECR URIs */
  ecrImages: z.record(ImageRefNameSchema, EcrImageUriSchema).optional(),
});

export type ReferencedResources = z.infer<typeof ReferencedResourcesSchema>;

// ============================================================================
// AWS Deployment Target
// ============================================================================

export const AwsDeploymentTargetSchema = z.object({
  name: DeploymentTargetNameSchema,
  description: z.string().max(256).optional(),
  account: AwsAccountIdSchema,
  region: AgentCoreRegionSchema,

  /** External resources referenced by this deployment target (not managed by CDK) */
  referencedResources: ReferencedResourcesSchema.optional(),
});

export type AwsDeploymentTarget = z.infer<typeof AwsDeploymentTargetSchema>;

// ============================================================================
// AWS Deployment Targets Array
// ============================================================================

export const AwsDeploymentTargetsSchema = z.array(AwsDeploymentTargetSchema).superRefine(
  uniqueBy(
    target => target.name,
    name => `Duplicate deployment target name: ${name}`
  )
);

export type AwsDeploymentTargets = z.infer<typeof AwsDeploymentTargetsSchema>;
