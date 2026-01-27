import { useShellContext } from './ShellContext';
import { Text } from 'ink';

/**
 * Unified prompt component that renders:
 * - `>` (cyan) in normal mode
 * - `!` (yellow) in shell mode
 */
export function ShellPrompt() {
  const { isActive } = useShellContext();

  if (isActive) {
    return <Text color="yellow">! </Text>;
  }

  return <Text color="cyan">&gt; </Text>;
}
