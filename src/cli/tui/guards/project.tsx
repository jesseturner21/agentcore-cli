import { findConfigRoot, getWorkingDirectory } from '../../../lib';
import { FatalError } from '../components';
import { Box, Text, render } from 'ink';
import React from 'react';

/**
 * Check if the agentcore/ project directory exists.
 * Walks up from baseDir to find the agentcore directory.
 */
export function projectExists(baseDir: string = getWorkingDirectory()): boolean {
  return findConfigRoot(baseDir) !== null;
}

interface MissingProjectMessageProps {
  /** If true, shows "create" instead of "agentcore create" (for use inside TUI app) */
  inTui?: boolean;
}

/**
 * Inline message component for missing project.
 * Used within TUI screens to show a notice (not for fatal exits).
 */
export function MissingProjectMessage({ inTui }: MissingProjectMessageProps) {
  const createCommand = inTui ? 'create' : 'agentcore create';
  return (
    <Box flexDirection="column">
      <Text color="red">No agentcore project found.</Text>
      <Text>
        Run <Text color="blue">{createCommand}</Text> first.
      </Text>
    </Box>
  );
}

/**
 * Guard that checks for project and exits with error message if not found.
 * Call this early in command handlers before rendering screens.
 *
 * @param inTui - If true, shows "create" instead of "agentcore create"
 */
export function requireProject(inTui = false): void {
  if (projectExists()) {
    return;
  }

  const suggestedCommand = inTui ? 'create' : 'agentcore create';
  render(<FatalError message="No agentcore project found." suggestedCommand={suggestedCommand} />);
  process.exit(1);
}
