import type { CommandMeta } from '../utils/commands';
import { Box, Text, useInput } from 'ink';
import React from 'react';

export function PlaceholderScreen(props: { command: CommandMeta; onBack: () => void }) {
  useInput((input, key) => {
    if (key.escape || input === 'b') props.onBack();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>{props.command.title}</Text>
      <Text dimColor>{props.command.description}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>TODO: implement {props.command.id}</Text>
        <Text dimColor>Esc/B back</Text>
      </Box>
    </Box>
  );
}
