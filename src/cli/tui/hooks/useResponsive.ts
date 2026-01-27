import { useStdout } from 'ink';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ResponsiveState {
  width: number;
  height: number;
  isNarrow: boolean;
}

/**
 * Hook that tracks terminal dimensions and triggers re-render on resize.
 * Uses debouncing to prevent render corruption during rapid resize events.
 */
export function useResponsive(): ResponsiveState {
  const { stdout } = useStdout();
  const debounceMs = 100;

  const getSize = useCallback(
    () => ({
      width: stdout?.columns ?? 100,
      height: stdout?.rows ?? 24,
    }),
    [stdout]
  );

  const [size, setSize] = useState(getSize);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!stdout) return;

    const handleResize = () => {
      // Clear any pending debounced update
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the state update to prevent rapid re-renders during resize
      timeoutRef.current = setTimeout(() => {
        setSize(prev => {
          const next = getSize();
          if (prev.width === next.width && prev.height === next.height) return prev;
          return next;
        });
      }, debounceMs);
    };

    stdout.on('resize', handleResize);

    return () => {
      stdout.off('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [stdout, getSize]);

  return {
    width: size.width,
    height: size.height,
    isNarrow: size.width < 80,
  };
}
