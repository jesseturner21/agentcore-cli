import { getCredentialProvider } from './account';
import { BedrockAgentCoreControlClient, GetAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore-control';

export interface GetAgentRuntimeStatusOptions {
  region: string;
  runtimeId: string;
}

export interface AgentRuntimeStatusResult {
  runtimeId: string;
  status: string;
}

/**
 * Fetch the status of an AgentCore Runtime by runtime ID.
 */
export async function getAgentRuntimeStatus(options: GetAgentRuntimeStatusOptions): Promise<AgentRuntimeStatusResult> {
  const client = new BedrockAgentCoreControlClient({
    region: options.region,
    credentials: getCredentialProvider(),
  });

  const command = new GetAgentRuntimeCommand({
    agentRuntimeId: options.runtimeId,
  });

  const response = await client.send(command);

  if (!response.status) {
    throw new Error(`No status returned for runtime ${options.runtimeId}`);
  }

  return {
    runtimeId: options.runtimeId,
    status: response.status,
  };
}
