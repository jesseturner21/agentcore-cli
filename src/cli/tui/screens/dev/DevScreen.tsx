import { GradientText, LogLink, Screen, TextInput } from '../../components';
import { type ConversationMessage, useDevServer } from '../../hooks/useDevServer';
import { Box, Text, useInput, useStdout } from 'ink';
import React, { useCallback, useMemo, useRef, useState } from 'react';

type Mode = 'chat' | 'input';

interface DevScreenProps {
  /** Whether running in interactive TUI mode (from App.tsx) vs CLI mode */
  isInteractive: boolean;
  onBack: () => void;
  workingDir?: string;
  port?: number;
}

/**
 * Render conversation as a single string for scrolling.
 */
function formatConversation(
  conversation: ConversationMessage[],
  streamingResponse: string | null,
  isStreaming: boolean
): string {
  const lines: string[] = [];

  for (const msg of conversation) {
    if (msg.role === 'user') {
      lines.push(`> ${msg.content}`);
    } else {
      lines.push(msg.content);
    }
    lines.push(''); // blank line between messages
  }

  // Add streaming response if in progress
  if (isStreaming && streamingResponse) {
    lines.push(streamingResponse);
  }

  return lines.join('\n');
}

/**
 * Word-wrap a single line to fit within maxWidth.
 */
function wrapLine(line: string, maxWidth: number): string[] {
  if (!line) return [''];
  if (line.length <= maxWidth) return [line];

  const wrapped: string[] = [];
  const words = line.split(' ');
  let currentLine = '';

  for (const word of words) {
    if (word.length > maxWidth) {
      if (currentLine) {
        wrapped.push(currentLine);
        currentLine = '';
      }
      for (let i = 0; i < word.length; i += maxWidth) {
        wrapped.push(word.slice(i, i + maxWidth));
      }
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        wrapped.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    wrapped.push(currentLine);
  }

  return wrapped.length > 0 ? wrapped : [''];
}

/**
 * Wrap multi-line text to fit within maxWidth.
 */
function wrapText(text: string, maxWidth: number): string[] {
  if (!text) return [];
  const lines = text.split('\n');
  const wrapped: string[] = [];
  for (const line of lines) {
    wrapped.push(...wrapLine(line, maxWidth));
  }
  return wrapped;
}

export function DevScreen(props: DevScreenProps) {
  const [mode, setMode] = useState<Mode>('chat');
  const [scrollOffset, setScrollOffset] = useState(0);
  // Track if user manually scrolled up (false = auto-scroll to bottom)
  const [userScrolled, setUserScrolled] = useState(false);
  const { stdout } = useStdout();
  // Track when we just cancelled input to prevent double-escape quit
  const justCancelledRef = useRef(false);

  const workingDir = props.workingDir ?? process.cwd();
  const {
    status,
    isStreaming,
    conversation,
    streamingResponse,
    config,
    configLoaded,
    actualPort,
    invoke,
    clearConversation,
    restart,
    stop,
    logFilePath,
  } = useDevServer({
    workingDir,
    port: props.port ?? 8080,
  });

  // Calculate available height for conversation display
  const terminalHeight = stdout?.rows ?? 24;
  const terminalWidth = stdout?.columns ?? 80;
  // Reserve lines for: header (4-5), help text (1), input area when active (2), margins
  // Reduce height when in input mode to make room for input field
  const baseHeight = Math.max(5, terminalHeight - 12);
  const displayHeight = mode === 'input' ? Math.max(3, baseHeight - 2) : baseHeight;
  const contentWidth = Math.max(40, terminalWidth - 4);

  // Format conversation content
  const conversationText = useMemo(
    () => formatConversation(conversation, streamingResponse, isStreaming),
    [conversation, streamingResponse, isStreaming]
  );

  // Wrap text for display
  const lines = useMemo(() => wrapText(conversationText, contentWidth), [conversationText, contentWidth]);

  const totalLines = lines.length;
  const maxScroll = Math.max(0, totalLines - displayHeight);
  const needsScroll = totalLines > displayHeight;

  // Auto-scroll to bottom when streaming or user hasn't scrolled
  const effectiveOffset = useMemo(() => {
    if (totalLines === 0) return 0;
    if ((isStreaming || !userScrolled) && totalLines > displayHeight) return maxScroll;
    return Math.min(scrollOffset, maxScroll);
  }, [totalLines, isStreaming, userScrolled, scrollOffset, maxScroll, displayHeight]);

  const scrollUp = useCallback(
    (amount = 1) => {
      if (!needsScroll) return;
      setUserScrolled(true);
      setScrollOffset(prev => Math.max(0, prev - amount));
    },
    [needsScroll]
  );

  const scrollDown = useCallback(
    (amount = 1) => {
      if (!needsScroll) return;
      setScrollOffset(prev => {
        const next = Math.min(maxScroll, prev + amount);
        if (next >= maxScroll) {
          setUserScrolled(false);
        }
        return next;
      });
    },
    [needsScroll, maxScroll]
  );

  const handleInvoke = async (message: string) => {
    setMode('chat');
    setUserScrolled(false); // Auto-scroll for new message
    await invoke(message);
  };

  useInput(
    (input, key) => {
      // In chat mode
      if (mode === 'chat') {
        // Esc or q to quit (but skip if we just cancelled from input mode)
        if (key.escape || input === 'q' || (key.ctrl && input === 'c')) {
          if (justCancelledRef.current) {
            // Skip this escape - it's from the input cancel
            justCancelledRef.current = false;
            return;
          }
          stop();
          props.onBack();
          return;
        }

        // Clear the flag on any other key
        justCancelledRef.current = false;

        // Enter to start typing (only when not streaming)
        if (key.return && !isStreaming) {
          setMode('input');
          return;
        }

        // Scroll controls
        if (key.upArrow) {
          scrollUp(1);
        } else if (key.downArrow) {
          scrollDown(1);
        } else if (key.pageUp) {
          scrollUp(displayHeight);
        } else if (key.pageDown) {
          scrollDown(displayHeight);
        }

        // Other hotkeys (only when not streaming)
        if (!isStreaming) {
          if (input === 'c') {
            clearConversation();
            setScrollOffset(0);
            setUserScrolled(false);
            return;
          }
          if (input === 'r') {
            restart();
            return;
          }
        }
      }
    },
    { isActive: mode === 'chat' }
  );

  // Return null while loading
  if (!configLoaded) {
    return null;
  }

  const statusColor = { starting: 'yellow', running: 'green', error: 'red', stopped: 'gray' }[status];

  // Visible lines for display
  const visibleLines = lines.slice(effectiveOffset, effectiveOffset + displayHeight);

  // Dynamic help text
  const helpText =
    mode === 'input'
      ? 'Enter send · Esc cancel'
      : isStreaming
        ? '↑↓ scroll'
        : conversation.length > 0
          ? '↑↓ scroll · Enter invoke · C clear · R restart · Esc quit'
          : 'Enter to send a message · R restart · Esc quit';

  const headerContent = (
    <Box flexDirection="column">
      <Box>
        <Text>Agent: </Text>
        <Text color="green">{config.agentName}</Text>
      </Box>
      <Box>
        <Text>Server: </Text>
        <Text color="cyan">http://localhost:{actualPort}/invocations</Text>
      </Box>
      {status !== 'starting' && (
        <Box>
          <Text>Status: </Text>
          <Text color={statusColor}>{status}</Text>
        </Box>
      )}
      {logFilePath && <LogLink filePath={logFilePath} />}
    </Box>
  );

  return (
    <Screen title="Dev Server" onExit={props.onBack} helpText={helpText} headerContent={headerContent}>
      <Box flexDirection="column" flexGrow={1}>
        {/* Conversation display - always visible when there's content */}
        {(conversation.length > 0 || isStreaming) && (
          <Box flexDirection="column" height={displayHeight}>
            {visibleLines.map((line, idx) => {
              // Detect user messages (start with "> ")
              const isUserMessage = line.startsWith('> ');
              return (
                <Text key={effectiveOffset + idx} color={isUserMessage ? 'blue' : 'green'} wrap="truncate">
                  {line || ' '}
                </Text>
              );
            })}
            {/* Thinking indicator - shows while waiting for response to start */}
            {isStreaming && !streamingResponse && <GradientText text="Thinking..." />}
          </Box>
        )}

        {/* Scroll indicator */}
        {needsScroll && (
          <Text dimColor>
            [{effectiveOffset + 1}-{Math.min(effectiveOffset + displayHeight, totalLines)} of {totalLines}]
          </Text>
        )}

        {/* Input line - always visible at bottom */}
        {/* Unfocused: dim arrow, press Enter to focus */}
        {/* Focused: blue arrow with cursor, type and press Enter to send */}
        {mode === 'chat' && !isStreaming && (
          <Box>
            <Text dimColor>&gt; </Text>
          </Box>
        )}
        {mode === 'input' && (
          <Box>
            <Text color="blue">&gt; </Text>
            <TextInput
              prompt=""
              hideArrow
              onSubmit={text => {
                if (text.trim()) {
                  void handleInvoke(text);
                } else {
                  setMode('chat');
                }
              }}
              onCancel={() => {
                justCancelledRef.current = true;
                setMode('chat');
              }}
            />
          </Box>
        )}
      </Box>
    </Screen>
  );
}
