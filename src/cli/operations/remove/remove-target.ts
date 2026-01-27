import { ConfigIO } from '../../../lib';
import type { AwsDeploymentTarget } from '../../../schema';
import type { RemovalPreview, RemovalResult, SchemaChange } from './types';

/**
 * Get list of deployment targets available for removal.
 */
export async function getRemovableTargets(): Promise<AwsDeploymentTarget[]> {
  try {
    const configIO = new ConfigIO();
    return await configIO.readAWSDeploymentTargets();
  } catch {
    return [];
  }
}

/**
 * Compute the preview of what will be removed when removing a target.
 */
export async function previewRemoveTarget(targetName: string): Promise<RemovalPreview> {
  const configIO = new ConfigIO();
  const targets = await configIO.readAWSDeploymentTargets();

  const target = targets.find(t => t.name === targetName);
  if (!target) {
    throw new Error(`Target "${targetName}" not found.`);
  }

  const summary: string[] = [
    `Removing target: ${targetName}`,
    `Account: ${target.account}`,
    `Region: ${target.region}`,
  ];

  if (target.description) {
    summary.push(`Description: ${target.description}`);
  }

  const schemaChanges: SchemaChange[] = [];

  // Compute schema change
  const afterTargets = targets.filter(t => t.name !== targetName);
  schemaChanges.push({
    file: 'agentcore/aws-targets.json',
    before: targets,
    after: afterTargets,
  });

  return { summary, directoriesToDelete: [], schemaChanges };
}

/**
 * Remove a deployment target from the project.
 */
export async function removeTarget(targetName: string): Promise<RemovalResult> {
  try {
    const configIO = new ConfigIO();
    const targets = await configIO.readAWSDeploymentTargets();

    const targetIndex = targets.findIndex(t => t.name === targetName);
    if (targetIndex === -1) {
      return { ok: false, error: `Target "${targetName}" not found.` };
    }

    // Remove target
    const newTargets = targets.filter(t => t.name !== targetName);
    await configIO.writeAWSDeploymentTargets(newTargets);

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
