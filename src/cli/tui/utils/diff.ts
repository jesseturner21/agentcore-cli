/**
 * Simple line-based diff utility using LCS (Longest Common Subsequence).
 * Used by schema editors to show changes before saving.
 */

export interface DiffLine {
  prefix: string;
  value: string;
  color?: 'green' | 'red';
}

/**
 * Computes a line-based diff between original and current text.
 * Returns an array of lines with prefixes (+, -, or space) and optional colors.
 */
export function diffLines(original: string[], current: string[]): DiffLine[] {
  const rows = original.length;
  const cols = current.length;
  const dp: number[][] = Array.from({ length: rows + 1 }, () => Array.from({ length: cols + 1 }, () => 0));

  for (let i = rows - 1; i >= 0; i -= 1) {
    const row = dp[i];
    if (!row) continue;
    for (let j = cols - 1; j >= 0; j -= 1) {
      const originalLine = original[i] ?? '';
      const currentLine = current[j] ?? '';
      if (originalLine === currentLine) {
        row[j] = (dp[i + 1]?.[j + 1] ?? 0) + 1;
      } else {
        row[j] = Math.max(dp[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
      }
    }
  }

  const ops: { type: 'equal' | 'add' | 'remove'; value: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    const originalLine = original[i];
    const currentLine = current[j];
    if (originalLine !== undefined && currentLine !== undefined && originalLine === currentLine) {
      ops.push({ type: 'equal', value: currentLine });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      if (originalLine !== undefined) {
        ops.push({ type: 'remove', value: originalLine });
      }
      i += 1;
    } else {
      if (currentLine !== undefined) {
        ops.push({ type: 'add', value: currentLine });
      }
      j += 1;
    }
  }
  while (i < rows) {
    const originalLine = original[i];
    if (originalLine !== undefined) {
      ops.push({ type: 'remove', value: originalLine });
    }
    i += 1;
  }
  while (j < cols) {
    const currentLine = current[j];
    if (currentLine !== undefined) {
      ops.push({ type: 'add', value: currentLine });
    }
    j += 1;
  }

  return ops.map(op => {
    switch (op.type) {
      case 'add':
        return { prefix: '+', value: op.value, color: 'green' as const };
      case 'remove':
        return { prefix: '-', value: op.value, color: 'red' as const };
      case 'equal':
        return { prefix: ' ', value: op.value };
    }
  });
}
