/**
 * ANSI escape codes for terminal colors and styles.
 */
export const colors = {
  // Modifiers
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background
  bgBlack: '\x1b[40m',
  bgBlue: '\x1b[44m',
  bgCyan: '\x1b[46m',
  bgYellow: '\x1b[43m',
  bgMagenta: '\x1b[45m',
} as const;

export type ColorName = keyof typeof colors;

/** Shorthand alias */
export const c = colors;
