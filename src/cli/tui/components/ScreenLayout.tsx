import { useResponsive } from '../hooks/useResponsive';
import { Box, useInput } from 'ink';
import type { ReactNode } from 'react';

interface ScreenLayoutProps {
  children: ReactNode;
  /** Optional exit handler - when provided, Escape key triggers this callback */
  onExit?: () => void;
}

export function ScreenLayout({ children, onExit }: ScreenLayoutProps) {
  const { isNarrow } = useResponsive();

  // Only active when onExit is provided
  useInput(
    (input, key) => {
      if (key.escape && onExit) {
        onExit();
      }
    },
    { isActive: !!onExit }
  );

  return (
    <Box flexDirection="column" paddingX={isNarrow ? 1 : 2} paddingY={1}>
      {children}
    </Box>
  );
}
