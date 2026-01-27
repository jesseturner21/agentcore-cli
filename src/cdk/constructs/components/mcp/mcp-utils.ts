import type { NodeRuntime, PythonRuntime } from '../../../../schema';
import { Fn } from 'aws-cdk-lib';

/** Default Python version for MCP runtimes */
export const DEFAULT_MCP_PYTHON_VERSION: PythonRuntime = 'PYTHON_3_12';

/** Runtime endpoint URL template - ARN must be URL-encoded */
export const RUNTIME_ENDPOINT_URL_TEMPLATE =
  'https://bedrock-agentcore.${AWS::Region}.amazonaws.com/runtimes/${EncodedArn}/invocations?qualifier=DEFAULT';

/**
 * URL-encodes an ARN for use in runtime endpoint URLs.
 * Replaces : with %3A and / with %2F using CloudFormation intrinsic functions.
 */
export function urlEncodeArn(arn: string): string {
  const colonReplaced = Fn.join('%3A', Fn.split(':', arn));
  const fullyEncoded = Fn.join('%2F', Fn.split('/', colonReplaced));
  return fullyEncoded;
}

/**
 * Maps Python runtime constant to Lambda runtime string.
 * Example: PYTHON_3_12 -> python3.12
 */
export function mapPythonRuntime(pythonVersion: PythonRuntime): string {
  return `python${pythonVersion.replace('PYTHON_', '').replace('_', '.').toLowerCase()}`;
}

/**
 * Maps Node runtime constant to Lambda runtime string.
 * Example: NODE_20 -> nodejs20.x
 */
export function mapNodeRuntime(nodeVersion: NodeRuntime): string {
  return `nodejs${nodeVersion.replace('NODE_', '').toLowerCase()}.x`;
}

/**
 * Generates the runtime endpoint URL from an ARN.
 */
export function getRuntimeEndpointUrl(runtimeArn: string): string {
  const encodedArn = urlEncodeArn(runtimeArn);
  return Fn.sub(RUNTIME_ENDPOINT_URL_TEMPLATE, { EncodedArn: encodedArn });
}
