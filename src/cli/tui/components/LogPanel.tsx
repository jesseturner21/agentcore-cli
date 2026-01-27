import { Box, Text, useInput } from 'ink';
import { useMemo, useState } from 'react';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'system' | 'response';
  message: string;
}

interface LogPanelProps {
  logs: LogEntry[];
  maxLines?: number;
  /**
   * If true, only show important logs (system, response, simple errors).
   * Hides JSON debug logs. Default true.
   */
  minimal?: boolean;
  /**
   * Whether this component should handle scroll input. Default true.
   */
  isActive?: boolean;
}

const LOG_COLORS: Record<LogEntry['level'], string | undefined> = {
  error: 'red',
  warn: 'yellow',
  system: 'cyan',
  info: 'gray',
  response: 'green',
};

/**
 * Check if a log message is a JSON debug log that should be hidden in minimal mode.
 */
function isJsonDebugLog(log: LogEntry): boolean {
  // Response and system logs are always shown
  if (log.level === 'response' || log.level === 'system') {
    return false;
  }

  // Check if message contains JSON (starts with { after trimming)
  const trimmed = log.message.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return true;
  }

  // Check for JSON embedded in the message (common pattern: "level": "INFO")
  if (trimmed.includes('"timestamp"') || trimmed.includes('"level"')) {
    return true;
  }

  return false;
}

/**
 * Filter logs to only show important ones for the minimal TUI view.
 * Only shows: system messages, responses, and warnings.
 * Hides: all INFO logs, JSON debug logs.
 */
function filterForMinimalView(logs: LogEntry[]): LogEntry[] {
  return logs.filter(log => {
    // Always show system and response logs
    if (log.level === 'system' || log.level === 'response') {
      return true;
    }

    // Show warn logs (but not if they're JSON debug)
    if (log.level === 'warn' && !isJsonDebugLog(log)) {
      return true;
    }

    // Show error logs only if they're not JSON debug logs
    if (log.level === 'error' && !isJsonDebugLog(log)) {
      return true;
    }

    // Hide all info logs and everything else
    return false;
  });
}

/**
 * Renders log entries with scrolling support.
 * Auto-scrolls to bottom when new logs arrive, allows manual scroll with ↑↓.
 */
export function LogPanel({ logs, maxLines = 15, minimal = true, isActive = true }: LogPanelProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [userScrolled, setUserScrolled] = useState(false);

  // Filter logs for minimal view
  const filteredLogs = minimal ? filterForMinimalView(logs) : logs;
  const totalLogs = filteredLogs.length;
  const maxScroll = Math.max(0, totalLogs - maxLines);
  const needsScroll = totalLogs > maxLines;

  // Compute effective scroll offset - auto-scroll to bottom unless user scrolled up
  const effectiveScrollOffset = useMemo(() => {
    if (!userScrolled) {
      return maxScroll;
    }
    return Math.min(scrollOffset, maxScroll);
  }, [userScrolled, scrollOffset, maxScroll]);

  // Handle scroll input
  useInput(
    (input, key) => {
      if (!needsScroll) return;

      if (key.upArrow || input === 'k') {
        setUserScrolled(true);
        setScrollOffset(prev => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setScrollOffset(prev => {
          const next = Math.min(maxScroll, prev + 1);
          // Reset user scroll flag when reaching bottom
          if (next >= maxScroll) {
            setUserScrolled(false);
          }
          return next;
        });
      } else if (key.pageUp) {
        setUserScrolled(true);
        setScrollOffset(prev => Math.max(0, prev - maxLines));
      } else if (key.pageDown) {
        setScrollOffset(prev => {
          const next = Math.min(maxScroll, prev + maxLines);
          if (next >= maxScroll) {
            setUserScrolled(false);
          }
          return next;
        });
      }
    },
    { isActive: isActive && needsScroll }
  );

  // Calculate visible window
  const visibleLogs = filteredLogs.slice(effectiveScrollOffset, effectiveScrollOffset + maxLines);
  const hasLogs = visibleLogs.length > 0;

  if (!hasLogs) {
    return <Text dimColor>No output yet</Text>;
  }

  return (
    <Box flexDirection="column">
      {needsScroll && effectiveScrollOffset > 0 && (
        <Box>
          <Text dimColor>↑ {effectiveScrollOffset} more above</Text>
        </Box>
      )}
      {visibleLogs.map((log, idx) => {
        if (log.level === 'response') {
          return (
            <Box key={effectiveScrollOffset + idx} flexDirection="column" marginTop={1}>
              <Text color="green" bold>
                ─── Response ───
              </Text>
              <Text wrap="wrap">{log.message}</Text>
            </Box>
          );
        }

        return (
          <Box key={effectiveScrollOffset + idx} flexDirection="row">
            {log.level !== 'system' && <Text color={LOG_COLORS[log.level]}>{log.level.toUpperCase().padEnd(6)} </Text>}
            <Text color={LOG_COLORS[log.level]} wrap="wrap">
              {log.message}
            </Text>
          </Box>
        );
      })}
      {needsScroll && effectiveScrollOffset < maxScroll && (
        <Box>
          <Text dimColor>↓ {maxScroll - effectiveScrollOffset} more below</Text>
        </Box>
      )}
      {needsScroll && (
        <Box marginTop={1}>
          <Text dimColor>↑↓ scroll</Text>
        </Box>
      )}
    </Box>
  );
}
