import { useShellContext } from './ShellContext';
import { Text } from 'ink';

/**
 * Renders the current shell command with proper handling of multi-line pastes.
 *
 * For multi-line input (e.g., pasting multiple export statements), shows only
 * the last line where the cursor is. This matches traditional terminal behavior
 * and prevents layout issues from multi-line content in a single-line input area.
 *
 * The full command (including all lines) is preserved in state and executed
 * when the user presses Enter.
 *
 * Also sanitizes the display text to remove carriage returns which can cause
 * rendering artifacts when text overwrites itself.
 */
export function ShellCommandText() {
  const { command } = useShellContext();

  // Split on both \r\n (Windows) and \n (Unix), filter empty lines
  // This handles pasted content that may have carriage returns
  const lines = command.split(/\r?\n/);

  // Show only the last non-empty line (where cursor is)
  const lastLine = lines.filter(Boolean).pop() ?? '';

  // Remove any remaining carriage returns that could cause display issues
  const displayCommand = lastLine.replace(/\r/g, '');

  return <Text wrap="truncate">{displayCommand}</Text>;
}
