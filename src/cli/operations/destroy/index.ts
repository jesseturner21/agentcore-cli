import { CONFIG_DIR, ConfigIO } from '../../../lib';
import type { AwsDeploymentTarget } from '../../../schema';
import { CdkToolkitWrapper, silentIoHost } from '../../cdk/toolkit-lib';
import { type DiscoveredStack, findStack } from '../../cloudformation/stack-discovery';
import { StackSelectionStrategy } from '@aws-cdk/toolkit-lib';
import { existsSync } from 'fs';
import { join } from 'path';

export interface DeployedTarget {
  target: AwsDeploymentTarget;
  stack: DiscoveredStack;
}

export interface DiscoverDeployedResult {
  projectName: string;
  deployedTargets: DeployedTarget[];
}

/**
 * Discover all deployed stacks for the current project.
 * Returns targets that have corresponding CloudFormation stacks.
 */
export async function discoverDeployedTargets(configBaseDir?: string): Promise<DiscoverDeployedResult> {
  const configIO = new ConfigIO(configBaseDir ? { baseDir: configBaseDir } : undefined);
  const projectSpec = await configIO.readProjectSpec();
  const targets = await configIO.readAWSDeploymentTargets();

  const deployedTargets: DeployedTarget[] = [];
  for (const target of targets) {
    try {
      const stack = await findStack(target.region, projectSpec.name, target.name);
      if (stack) {
        deployedTargets.push({ target, stack });
      }
    } catch {
      // Ignore errors checking individual targets (e.g., no credentials)
    }
  }

  return { projectName: projectSpec.name, deployedTargets };
}

export interface DestroyTargetOptions {
  target: DeployedTarget;
  cdkProjectDir: string;
}

/**
 * Destroy a specific target's CloudFormation stack.
 */
export async function destroyTarget(options: DestroyTargetOptions): Promise<void> {
  const { target, cdkProjectDir } = options;

  if (!existsSync(cdkProjectDir)) {
    throw new Error('CDK project not found. Cannot destroy without CDK project.');
  }

  const toolkit = new CdkToolkitWrapper({
    projectDir: cdkProjectDir,
    ioHost: silentIoHost,
  });

  await toolkit.initialize();
  await toolkit.destroy({
    stacks: {
      strategy: StackSelectionStrategy.PATTERN_MUST_MATCH,
      patterns: [target.stack.stackName],
    },
  });
}

/**
 * Get the CDK project directory path.
 */
export function getCdkProjectDir(cwd?: string): string {
  const baseDir = cwd ?? process.cwd();
  return join(baseDir, CONFIG_DIR, 'cdk');
}
