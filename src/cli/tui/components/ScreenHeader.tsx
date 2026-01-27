import { Box, Text } from 'ink';
import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  color?: string;
  children?: ReactNode;
}

/**
 * Standard header component for screens.
 * Displays a title line with optional metadata content (no borders).
 */
export function ScreenHeader({ title, color = 'cyan', children }: ScreenHeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={color}>
        {title}
      </Text>
      {children && <Box marginTop={1}>{children}</Box>}
    </Box>
  );
}
