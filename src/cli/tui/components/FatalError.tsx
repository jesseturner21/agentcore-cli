import { Box, Text } from 'ink';
import React from 'react';

export interface FatalErrorProps {
  /** Main error message */
  message: string;
  /** Optional detail or explanation */
  detail?: string;
  /** Suggested command to fix the issue */
  suggestedCommand?: string;
}

/**
 * Non-interactive error display for fatal CLI errors.
 * Use this for validation failures, missing prerequisites, etc.
 * After rendering, the caller should call process.exit(1).
 *
 * @example
 * ```tsx
 * render(<FatalError
 *   message="No agentcore project found."
 *   suggestedCommand="agentcore create"
 * />);
 * process.exit(1);
 * ```
 */
export function FatalError({ message, detail, suggestedCommand }: FatalErrorProps) {
  return (
    <Box flexDirection="column">
      <Text color="red">{message}</Text>
      {detail && <Text>{detail}</Text>}
      {suggestedCommand && (
        <Text>
          Run <Text color="blue">{suggestedCommand}</Text> to fix this.
        </Text>
      )}
    </Box>
  );
}
