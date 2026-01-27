import { getCredentialProvider } from '../aws';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

export const CDK_TOOLKIT_STACK_NAME = 'CDKToolkit';

export interface BootstrapStatus {
  isBootstrapped: boolean;
  stackStatus?: string;
}

/**
 * Check if an AWS environment is bootstrapped by looking for the CDKToolkit stack.
 */
export async function checkBootstrapStatus(region: string): Promise<BootstrapStatus> {
  const cfn = new CloudFormationClient({ region, credentials: getCredentialProvider() });

  try {
    const resp = await cfn.send(new DescribeStacksCommand({ StackName: CDK_TOOLKIT_STACK_NAME }));

    const stack = resp.Stacks?.[0];
    if (!stack) {
      return { isBootstrapped: false };
    }

    const status = stack.StackStatus;
    const isUsable =
      status === 'CREATE_COMPLETE' || status === 'UPDATE_COMPLETE' || status === 'UPDATE_ROLLBACK_COMPLETE';

    return {
      isBootstrapped: isUsable,
      stackStatus: status,
    };
  } catch (err: unknown) {
    // Stack doesn't exist - not bootstrapped
    if (err instanceof Error && err.name === 'ValidationError') {
      return { isBootstrapped: false };
    }
    throw err;
  }
}

/**
 * Format environment string for CDK bootstrap.
 */
export function formatCdkEnvironment(accountId: string, region: string): string {
  return `aws://${accountId}/${region}`;
}
