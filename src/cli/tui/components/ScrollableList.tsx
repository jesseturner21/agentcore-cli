import { Box, Text, useInput } from 'ink';
import React, { useState } from 'react';

interface Props {
  items: LogEntry[];
  height: number;
  title?: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
  color?: 'green' | 'red' | 'yellow' | 'white';
}

export function ScrollableList({ items, height, title }: Props) {
  const [manualOffset, setManualOffset] = useState(0);
  const [userScrolled, setUserScrolled] = useState(false);

  const maxScroll = Math.max(0, items.length - height);
  const offset = userScrolled ? Math.min(manualOffset, maxScroll) : maxScroll;

  useInput((input, key) => {
    if (key.upArrow) {
      setUserScrolled(true);
      setManualOffset(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setManualOffset(prev => {
        const next = Math.min(maxScroll, prev + 1);
        if (next >= maxScroll) setUserScrolled(false);
        return next;
      });
    }
  });

  const visibleItems = items.slice(offset, offset + height);

  return (
    <Box flexDirection="column">
      {title && (
        <Text bold underline>
          {title}
        </Text>
      )}
      <Box flexDirection="column" height={height}>
        {visibleItems.map((item, i) => (
          <Text key={offset + i} color={item.color}>
            [{item.timestamp}] {item.message}
          </Text>
        ))}
      </Box>
      {items.length > height && (
        <Text dimColor>
          [{offset + 1}-{Math.min(offset + height, items.length)} of {items.length}] Use ↑↓ to scroll
        </Text>
      )}
    </Box>
  );
}
