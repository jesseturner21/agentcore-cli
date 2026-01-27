/**
 * Parse a single SSE data line and extract the content.
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
 * Parses Server-Sent Events (SSE) formatted text into combined content.
 * SSE format: "data: content\n\ndata: more content\n\n"
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
  return parts.length > 0 ? parts.join('') : text;
}

/**
 * Sleep helper for retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Invokes an agent on the local dev server and streams the response.
 * Yields text chunks as they arrive from the SSE stream.
 */
export async function* invokeAgentStreaming(port: number, message: string): AsyncGenerator<string, void, unknown> {
  const maxRetries = 5;
  const baseDelay = 500;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`http://localhost:${port}/invocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message }),
      });

      if (!res.body) {
        yield '(empty response)';
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;

          const chunk = result.value as Uint8Array;
          buffer += decoder.decode(chunk, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split('\n');
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

        // Process remaining buffer
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

      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message.includes('fetch') || lastError.message.includes('ECONNREFUSED')) {
        await sleep(baseDelay * Math.pow(2, attempt));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error('Failed to connect to dev server after retries');
}

/**
 * Invokes an agent running on the local dev server.
 * Handles both JSON and streaming text responses.
 * Includes retry logic for server startup race conditions.
 */
export async function invokeAgent(port: number, message: string): Promise<string> {
  const maxRetries = 5;
  const baseDelay = 500; // ms
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`http://localhost:${port}/invocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message }),
      });

      const text = await res.text();
      if (!text) {
        return '(empty response)';
      }

      // Check if it's SSE format (streaming response)
      if (text.includes('data: ')) {
        return parseSSE(text);
      }

      // Try to parse as JSON, otherwise return raw text
      try {
        const data: unknown = JSON.parse(text);
        return JSON.stringify(data, null, 2);
      } catch {
        return text;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only retry on connection errors (server not ready)
      if (lastError.message.includes('fetch') || lastError.message.includes('ECONNREFUSED')) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      // For other errors, throw immediately
      throw lastError;
    }
  }

  throw lastError ?? new Error('Failed to connect to dev server after retries');
}
