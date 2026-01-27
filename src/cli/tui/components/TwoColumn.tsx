import { useResponsive } from '../hooks/useResponsive';
import { Box } from 'ink';
import type { ReactNode } from 'react';

export function TwoColumn({
  left,
  right,
  marginTop,
  collapseBelow = 80,
  ratio = [1, 1],
}: {
  left: ReactNode;
  right?: ReactNode;
  marginTop?: number;
  collapseBelow?: number;
  /** Flex ratio for [left, right] columns. Default is [1, 1] for equal sizing. */
  ratio?: [number, number];
}) {
  const { isNarrow, width } = useResponsive();
  const shouldStack = isNarrow || width < collapseBelow;

  if (!right) {
    return <Box marginTop={marginTop}>{left}</Box>;
  }

  return (
    <Box flexDirection={shouldStack ? 'column' : 'row'} gap={2} marginTop={marginTop}>
      <Box flexGrow={ratio[0]} flexBasis={shouldStack ? undefined : 0}>
        {left}
      </Box>
      <Box flexGrow={ratio[1]} flexBasis={shouldStack ? undefined : 0}>
        {right}
      </Box>
    </Box>
  );
}
