import { Box, Text, useInput, useStdout } from 'ink';
import React, { useCallback, useMemo, useState } from 'react';

// Scrollbar characters
const SCROLLBAR_THUMB = '█';
const SCROLLBAR_TRACK = '░';

interface ScrollableTextProps {
  /** Text content to display (will be split by newlines) */
  content: string;
  /** Color for the text */
  color?: string;
  /** Fixed height in lines (defaults to auto-calculated from terminal) */
  height?: number;
  /** Whether content is currently streaming (enables auto-scroll) */
  isStreaming?: boolean;
  /** Whether this component should handle input (default true) */
  isActive?: boolean;
  /** Minimum height in lines */
  minHeight?: number;
  /** Maximum height in lines */
  maxHeight?: number;
  /** Whether to show the scrollbar (default true when scrolling needed) */
  showScrollbar?: boolean;
}

/**
 * Word-wrap a single line to fit within maxWidth.
 * Returns array of wrapped line segments.
 */
function wrapLine(line: string, maxWidth: number): string[] {
  if (!line) return [''];
  if (line.length <= maxWidth) return [line];

  const wrapped: string[] = [];
  const words = line.split(' ');
  let currentLine = '';

  for (const word of words) {
    // If word itself is longer than maxWidth, break it
    if (word.length > maxWidth) {
      if (currentLine) {
        wrapped.push(currentLine);
        currentLine = '';
      }
      // Break long word into chunks
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
 * Preserves original line breaks and adds new ones for long lines.
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

/**
 * Calculate scrollbar thumb position and size.
 */
function calculateScrollbar(
  totalLines: number,
  displayHeight: number,
  scrollOffset: number
): { thumbStart: number; thumbSize: number } {
  if (totalLines <= displayHeight) {
    return { thumbStart: 0, thumbSize: displayHeight };
  }

  // Thumb size proportional to visible content
  const thumbSize = Math.max(1, Math.round((displayHeight / totalLines) * displayHeight));

  // Thumb position proportional to scroll position
  const maxScroll = totalLines - displayHeight;
  const scrollRatio = maxScroll > 0 ? scrollOffset / maxScroll : 0;
  const thumbStart = Math.round(scrollRatio * (displayHeight - thumbSize));

  return { thumbStart, thumbSize };
}

/**
 * Scrollable text display for multi-line content.
 * Auto-scrolls to bottom during streaming, allows manual scroll with ↑↓ and mouse wheel.
 * Handles text wrapping based on terminal width.
 * Displays a visual scrollbar when content overflows.
 */
export function ScrollableText({
  content,
  color,
  height: fixedHeight,
  isStreaming = false,
  isActive = true,
  minHeight = 5,
  maxHeight = 20,
  showScrollbar = true,
}: ScrollableTextProps) {
  const { stdout } = useStdout();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [userScrolled, setUserScrolled] = useState(false);

  // Get terminal width (with buffer for margins and scrollbar)
  const terminalWidth = useMemo(() => {
    const width = stdout?.columns ?? 80;
    // Leave margin for borders and scrollbar (3 chars for scrollbar area)
    return Math.max(40, width - 6);
  }, [stdout?.columns]);

  // Wrap content into display lines based on terminal width
  const lines = useMemo(() => {
    return wrapText(content, terminalWidth);
  }, [content, terminalWidth]);

  // Calculate display height
  const displayHeight = useMemo(() => {
    if (fixedHeight) return fixedHeight;
    // Use terminal height minus buffer for header/footer
    const terminalHeight = stdout?.rows ?? 24;
    const availableHeight = Math.max(minHeight, terminalHeight - 12);
    return Math.min(maxHeight, availableHeight);
  }, [fixedHeight, stdout?.rows, minHeight, maxHeight]);

  const totalLines = lines.length;
  const maxScroll = Math.max(0, totalLines - displayHeight);
  const needsScroll = totalLines > displayHeight;

  // Determine effective scroll position:
  // - When streaming and user hasn't scrolled: show bottom (maxScroll)
  // - When user has scrolled: show their position (clamped to valid range)
  // - When content is empty: show top (0)
  const effectiveOffset = useMemo(() => {
    if (totalLines === 0) return 0;
    if (isStreaming && !userScrolled) return maxScroll;
    // Clamp scroll offset to valid range (content may have shrunk)
    return Math.min(scrollOffset, maxScroll);
  }, [totalLines, isStreaming, userScrolled, scrollOffset, maxScroll]);

  // Calculate scrollbar position
  const { thumbStart, thumbSize } = useMemo(
    () => calculateScrollbar(totalLines, displayHeight, effectiveOffset),
    [totalLines, displayHeight, effectiveOffset]
  );

  // Scroll handler for both keyboard and mouse
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

  // Handle keyboard scroll input
  useInput(
    (_input, key) => {
      if (!needsScroll) return;

      if (key.upArrow) {
        scrollUp(1);
      } else if (key.downArrow) {
        scrollDown(1);
      } else if (key.pageUp) {
        scrollUp(displayHeight);
      } else if (key.pageDown) {
        scrollDown(displayHeight);
      }
    },
    { isActive: isActive && needsScroll }
  );

  // Get visible lines based on effective offset
  const visibleLines = useMemo(() => {
    return lines.slice(effectiveOffset, effectiveOffset + displayHeight);
  }, [lines, effectiveOffset, displayHeight]);

  // Generate scrollbar for each line
  const renderScrollbar = useCallback(
    (lineIndex: number): string => {
      if (!needsScroll || !showScrollbar) return '';
      const isThumb = lineIndex >= thumbStart && lineIndex < thumbStart + thumbSize;
      return isThumb ? SCROLLBAR_THUMB : SCROLLBAR_TRACK;
    },
    [needsScroll, showScrollbar, thumbStart, thumbSize]
  );

  if (!content) {
    return null;
  }

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        {/* Content area */}
        <Box flexDirection="column" flexGrow={1} height={needsScroll ? displayHeight : undefined}>
          {visibleLines.map((line, idx) => (
            <Text key={effectiveOffset + idx} color={color} wrap="truncate">
              {line || ' '}
            </Text>
          ))}
        </Box>

        {/* Scrollbar */}
        {needsScroll && showScrollbar && (
          <Box flexDirection="column" marginLeft={1}>
            {Array.from({ length: displayHeight }).map((_, idx) => (
              <Text key={idx} color="gray">
                {renderScrollbar(idx)}
              </Text>
            ))}
          </Box>
        )}
      </Box>

      {/* Status line */}
      {needsScroll && (
        <Text dimColor>
          [{effectiveOffset + 1}-{Math.min(effectiveOffset + displayHeight, totalLines)} of {totalLines}] ↑↓ PgUp/PgDn
        </Text>
      )}
    </Box>
  );
}
