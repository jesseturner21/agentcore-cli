/**
 * Centralized color definitions for the TUI.
 * All color values should be referenced from here to ensure consistency.
 */

/**
 * Semantic status colors for indicating state/progress.
 */
export const STATUS_COLORS = {
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
  pending: 'gray',
} as const;

/**
 * Colors for interactive elements like selections and highlights.
 */
export const INTERACTIVE_COLORS = {
  selection: 'cyan',
  cursor: 'white',
  highlight: 'cyan',
} as const;

/**
 * Text colors for general content.
 */
export const TEXT_COLORS = {
  primary: 'white',
  muted: 'gray',
  directory: 'blue',
} as const;

/**
 * Combined theme object for convenient access.
 */
export const THEME = {
  status: STATUS_COLORS,
  interactive: INTERACTIVE_COLORS,
  text: TEXT_COLORS,
} as const;
