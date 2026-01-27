import { getCredentialProvider } from './account';
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore';

export interface InvokeAgentRuntimeOptions {
  region: string;
  runtimeArn: string;
  payload: string;
}

/**
 * Parse a single SSE data line and extract the content.
 * Returns null if the line is not a data line or contains an error.
 */
function parseSSELine(line: string): { content: string | null; error: string | null } {
  if (!line.startsWith('data: ')) {
    return { content: null, error: null };
  }
  const content = line.slice(6);
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed === 'string') {
      return { content: parsed, error: null };
    } else if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      return { content: null, error: String((parsed as { error: unknown }).error) };
    }
  } catch {
    return { content, error: null };
  }
  return { content: null, error: null };
}

/**
 * Parse SSE response into combined text.
 */
function parseSSE(text: string): string {
  const parts: string[] = [];
  for (const line of text.split('\n')) {
    const { content, error } = parseSSELine(line);
    if (error) {
      return `Error: ${error}`;
    }
    if (content) {
      parts.push(content);
    }
  }
  return parts.join('');
}

/**
 * Invoke an AgentCore Runtime and stream the response chunks.
 * Yields text chunks as they arrive from the SSE stream.
 */
export async function* invokeAgentRuntimeStreaming(
  options: InvokeAgentRuntimeOptions
): AsyncGenerator<string, void, unknown> {
  const client = new BedrockAgentCoreClient({
    region: options.region,
    credentials: getCredentialProvider(),
  });

  const command = new InvokeAgentRuntimeCommand({
    agentRuntimeArn: options.runtimeArn,
    payload: new TextEncoder().encode(JSON.stringify({ prompt: options.payload })),
    contentType: 'application/json',
    accept: 'application/json',
  });

  const response = await client.send(command);

  if (!response.response) {
    throw new Error('No response from AgentCore Runtime');
  }

  const webStream = response.response.transformToWebStream();
  const reader = webStream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value as Uint8Array, { stream: true });

      // Process complete lines from the buffer
      const lines = buffer.split('\n');
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const { content, error } = parseSSELine(line);
        if (error) {
          yield `Error: ${error}`;
          return;
        }
        if (content) {
          yield content;
        }
      }
    }

    // Process any remaining content in the buffer
    if (buffer) {
      const { content, error } = parseSSELine(buffer);
      if (error) {
        yield `Error: ${error}`;
      } else if (content) {
        yield content;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Invoke an AgentCore Runtime and return the response.
 */
export async function invokeAgentRuntime(options: InvokeAgentRuntimeOptions): Promise<string> {
  const client = new BedrockAgentCoreClient({
    region: options.region,
    credentials: getCredentialProvider(),
  });

  const command = new InvokeAgentRuntimeCommand({
    agentRuntimeArn: options.runtimeArn,
    payload: new TextEncoder().encode(JSON.stringify({ prompt: options.payload })),
    contentType: 'application/json',
    accept: 'application/json',
  });

  const response = await client.send(command);

  if (!response.response) {
    throw new Error('No response from AgentCore Runtime');
  }

  const bytes = await response.response.transformToByteArray();
  const text = new TextDecoder().decode(bytes);

  // Parse SSE format if present
  if (text.includes('data: ')) {
    return parseSSE(text);
  }

  return text;
}
