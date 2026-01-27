import { Text } from 'ink';
import { useEffect, useState } from 'react';

interface CursorProps {
  /** Blink interval in milliseconds (default: 500) */
  interval?: number;
}

export function Cursor({ interval = 500 }: CursorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setVisible(prev => !prev), interval);
    return () => clearInterval(timer);
  }, [interval]);

  return <Text color="white">{visible ? '▋' : ' '}</Text>;
}
