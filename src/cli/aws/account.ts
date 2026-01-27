import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { fromEnv, fromNodeProviderChain } from '@aws-sdk/credential-providers';
import type { AwsCredentialIdentityProvider } from '@smithy/types';

/**
 * Get the AWS credential provider to use for SDK clients.
 * Prioritizes environment variables when set, otherwise uses the full provider chain.
 * This ensures proper credential resolution without requiring ~/.aws directory.
 */
export function getCredentialProvider(): AwsCredentialIdentityProvider {
  const hasEnvCreds = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
  return hasEnvCreds ? fromEnv() : fromNodeProviderChain();
}

/**
 * Error thrown when AWS credentials are not configured or invalid.
 * Supports both a short message (for interactive mode) and detailed message (for CLI mode).
 */
export class AwsCredentialsError extends Error {
  /** Short message suitable for interactive mode where UI handles recovery */
  readonly shortMessage: string;

  constructor(shortMessage: string, detailedMessage?: string) {
    super(detailedMessage ?? shortMessage);
    this.name = 'AwsCredentialsError';
    this.shortMessage = shortMessage;
  }
}

/**
 * Get AWS account ID using STS GetCallerIdentity.
 * Uses the official AWS SDK credential provider chain which checks:
 * 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * 2. SSO credentials
 * 3. Shared credentials file (~/.aws/credentials)
 * 4. ECS container credentials
 * 5. EC2 instance metadata
 * Returns null if unable to detect (no credentials configured).
 */
export async function detectAccount(): Promise<string | null> {
  // Use region from env or default to us-east-1 (STS is global but SDK needs a region)
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1';

  try {
    const client = new STSClient({
      credentials: getCredentialProvider(),
      region,
    });
    const command = new GetCallerIdentityCommand({});
    const response = await client.send(command);
    return response.Account ?? null;
  } catch {
    return null;
  }
}

/**
 * Validate that AWS credentials are configured and working.
 * Throws AwsCredentialsError with a helpful message if not.
 */
export async function validateAwsCredentials(): Promise<void> {
  const account = await detectAccount();
  if (!account) {
    throw new AwsCredentialsError(
      'No AWS credentials configured.',
      'No AWS credentials configured.\n\n' +
        'To fix this:\n' +
        '  1. Run: aws login\n' +
        '  2. Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables'
    );
  }
}
