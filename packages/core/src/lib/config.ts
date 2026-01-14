import type { HoundConfig } from '../types.js';

/**
 * Default configuration.
 */
const defaultConfig: HoundConfig = {
  enabled: true,
  service: 'app',
  propagationHeader: 'x-hound-flow',
  orphanMark: 'drop',
  sink: {
    kind: 'jsonl',
    filePath: '.hounddog/events.jsonl',
    rotateBytes: 5_000_000,
    retainFiles: 3,
    batchMax: 64,
    flushIntervalMs: 250,
  },
};

let currentConfig: HoundConfig = { ...defaultConfig };

/**
 * Configure Hounddog with partial options.
 * Merges with existing config; sink is replaced entirely if provided.
 */
export function configureHounddog(partial: Partial<HoundConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...partial,
    sink: partial.sink ?? currentConfig.sink,
  };
}

/**
 * Get current configuration.
 */
export function getConfig(): HoundConfig {
  return currentConfig;
}

/**
 * Check if Hounddog is enabled.
 */
export function isEnabled(): boolean {
  return currentConfig.enabled;
}
