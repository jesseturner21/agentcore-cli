import { useResponsive } from '../hooks';
import { useShellContext } from './ShellContext';
import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';

// Default reserve: header(2) + input(1) + indicator(1) + padding(2) + buffer(2)
const DEFAULT_RESERVED_LINES = 8;

function TruncatedIndicator() {
  const line = '─'.repeat(10);
  return (
    <Text dimColor>
      {line} output truncated {line}
    </Text>
  );
}

function RunningIndicator() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d % 3) + 1);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return <Text dimColor>running{'.'.repeat(dots)}</Text>;
}

interface ShellOutputProps {
  reservedLines?: number;
}

/**
 * Component to render shell command output.
 */
export function ShellOutput({ reservedLines = DEFAULT_RESERVED_LINES }: ShellOutputProps) {
  const { mode, output } = useShellContext();
  const { height: terminalHeight } = useResponsive();

  if (mode === 'inactive') {
    return null;
  }

  // Calculate max lines based on terminal height, always reserve 1 for truncation indicator
  const maxLines = Math.max(5, terminalHeight - reservedLines - 1);
  const truncated = output.length > maxLines;
  const visibleOutput = output.slice(-maxLines);

  // Show running indicator when command is executing but no output yet
  const showRunningIndicator = mode === 'running' && output.length === 0;

  return (
    <Box flexDirection="column" paddingLeft={2}>
      {showRunningIndicator && <RunningIndicator />}
      {visibleOutput.map((line, idx) => (
        <Text key={`${output.length}-${idx}`}>{line || ' '}</Text>
      ))}
      {truncated && <TruncatedIndicator />}
    </Box>
  );
}
