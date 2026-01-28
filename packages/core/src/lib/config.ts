import type { HoundConfig } from '../types.js';
import { syncClock } from './clock.js';

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

export function configureHounddog(partial: Partial<HoundConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...partial,
    sink: partial.sink ?? currentConfig.sink,
  };

  if (partial.clockDaemon) {
    void syncClock(partial.clockDaemon);
  }
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
