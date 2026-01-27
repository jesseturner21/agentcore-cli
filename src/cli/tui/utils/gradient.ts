export function createGradient(text: string): string {
  const colors = [
    '\x1b[33m', // Standard ANSI Yellow (matches Ink's yellow)
    '\x1b[38;2;255;255;0m', // Bright Yellow
    '\x1b[38;2;255;255;85m', // Slightly muted
    '\x1b[38;2;218;218;0m', // Darker yellow
    '\x1b[33m', // Back to ANSI Yellow
  ];

  const reset = '\x1b[0m';
  const chars = text.split('');

  return chars
    .map((char, i) => {
      // Distributes the yellow hues across the length of the string
      const colorIndex = Math.floor((i / chars.length) * (colors.length - 1));
      return colors[colorIndex] + char + reset;
    })
    .join('');
}
