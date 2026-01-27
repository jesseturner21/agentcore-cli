import { Text } from 'ink';
import Link from 'ink-link';
import path from 'node:path';
import React from 'react';

interface LogLinkProps {
  /** Absolute file path to the log file */
  filePath: string;
  /** Display text (defaults to relative path from cwd) */
  displayText?: string;
  /** Whether to show the "Log: " prefix (defaults to true) */
  showPrefix?: boolean;
}

/**
 * A clickable link to a log file.
 * Uses ink-link for terminal hyperlink support.
 * Displays a relative path but links to the full file:// URL.
 */
export function LogLink({ filePath, displayText, showPrefix = true }: LogLinkProps) {
  const url = `file://${filePath}`;
  // Show relative path for cleaner display, or use provided displayText
  const text = displayText ?? path.relative(process.cwd(), filePath);

  return (
    <Text color="gray">
      {showPrefix && 'Log: '}
      <Link url={url} fallback={false}>
        <Text color="cyan">{text}</Text>
      </Link>
    </Text>
  );
}
