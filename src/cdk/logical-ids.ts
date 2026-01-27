/**
 * Utilities for generating stable CloudFormation logical IDs and export names.
 *
 * Logical IDs must remain stable across deployments to ensure CloudFormation
 * correctly identifies resources for updates rather than replacements.
 *
 * CDK automatically generates logical IDs from construct paths. These utilities
 * are only needed when:
 * 1. Converting dynamic names (e.g., "my-agent") to valid PascalCase IDs
 * 2. Building CfnOutput logical IDs with the "Output" suffix
 * 3. Building CloudFormation export names
 *
 * For most construct IDs, use simple string literals (e.g., "Runtime", "Role").
 * CDK's construct tree provides scoping automatically.
 */
const LOGICAL_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;
const MAX_LOGICAL_ID_LENGTH = 255;

function assertLogicalId(id: string): void {
  if (id.length === 0 || id.length > MAX_LOGICAL_ID_LENGTH || !LOGICAL_ID_PATTERN.test(id)) {
    throw new Error(
      `Invalid CloudFormation logical ID: "${id}". Must start with a letter, contain only alphanumerics, and be <= ${MAX_LOGICAL_ID_LENGTH} characters.`
    );
  }
}

/**
 * Converts a name to a valid logical ID part by converting to PascalCase.
 * Examples: "my-gateway" -> "MyGateway", "my_tool" -> "MyTool"
 */
function toLogicalIdPart(name: string): string {
  return name
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Converts dynamic names to valid CloudFormation logical IDs in PascalCase.
 *
 * Use this when building construct IDs that include dynamic names from user
 * configuration (e.g., agent names like "my-agent" → "MyAgent").
 *
 * For static construct IDs, prefer simple string literals instead:
 *   new AgentCoreRuntime(this, 'Runtime', ...)  // Good - simple literal
 *   new AgentCoreRuntime(this, toPascalId('Runtime'), ...)  // Unnecessary
 *
 * @example
 * // Convert user-provided agent name to valid construct ID
 * new AgentEnvironment(this, toPascalId('Agent', spec.name), {...})
 * // "my-agent" -> "AgentMyAgent"
 */
export function toPascalId(...parts: string[]): string {
  if (parts.length === 0) {
    throw new Error('toPascalId requires at least one part');
  }

  const id = parts.map(toLogicalIdPart).join('');
  assertLogicalId(id);
  return id;
}

/**
 * Builds a CloudFormation logical ID for CfnOutput resources.
 * Appends 'Output' suffix to distinguish outputs from other resources.
 *
 * @example
 * new CfnOutput(this, outputId('RuntimeId'), { value: ... })
 * // -> "RuntimeIdOutput"
 */
export function outputId(...parts: string[]): string {
  return toPascalId(...parts, 'Output');
}

/**
 * Builds a CloudFormation export name from parts.
 * Export names allow: alphanumerics, colons, hyphens (max 255 chars).
 * Underscores are converted to hyphens; other invalid chars are removed.
 *
 * @example
 * exportName(stackName, agentName, 'RuntimeId')
 * // -> "MyStack-MyAgent-RuntimeId"
 */
export function exportName(...parts: string[]): string {
  const name = parts.map(part => part.replace(/_/g, '-').replace(/[^a-zA-Z0-9:-]/g, '')).join('-');

  if (name.length === 0 || name.length > 255) {
    throw new Error(`Invalid CloudFormation export name: "${name}". Must be 1-255 characters.`);
  }

  return name;
}
