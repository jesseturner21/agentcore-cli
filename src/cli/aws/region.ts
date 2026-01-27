import { type AgentCoreRegion, AgentCoreRegionSchema } from '../../schema';
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';

const DEFAULT_REGION: AgentCoreRegion = 'us-east-1';

export interface RegionDetectionResult {
  region: AgentCoreRegion;
  source: 'env' | 'config' | 'default';
}

/**
 * Type guard to check if a string is a valid AgentCore region
 */
function isAgentCoreRegion(region: string): region is AgentCoreRegion {
  return AgentCoreRegionSchema.safeParse(region).success;
}

/**
 * Detect AWS region from environment variables or AWS config.
 * Priority: AWS_REGION > AWS_DEFAULT_REGION > profile config > default (us-east-1)
 */
export async function detectRegion(): Promise<RegionDetectionResult> {
  // Check environment variables first
  const envRegion = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
  if (envRegion && isAgentCoreRegion(envRegion)) {
    return { region: envRegion, source: 'env' };
  }

  // Try to get region from AWS config files
  try {
    const profile = process.env.AWS_PROFILE ?? 'default';
    const config = await loadSharedConfigFiles();
    const profileConfig = config.configFile?.[profile];
    if (profileConfig?.region && isAgentCoreRegion(profileConfig.region)) {
      return { region: profileConfig.region, source: 'config' };
    }
  } catch {
    // Config file not available or parse error
  }

  return { region: DEFAULT_REGION, source: 'default' };
}
