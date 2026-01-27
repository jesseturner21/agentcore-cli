import { Box, Text } from 'ink';

export function Header(props: { title: string; subtitle?: string; version?: string }) {
  return (
    <Box>
      <Box flexDirection="column">
        <Text bold>{props.title}</Text>
        {props.subtitle && <Text dimColor>{props.subtitle}</Text>}
        {props.version && <Text dimColor>{props.version}</Text>}
      </Box>
    </Box>
  );
}
