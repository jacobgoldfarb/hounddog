import { HoundConfig } from './types';

const defaultConfig: HoundConfig = {
  enabled: true,
  service: 'app',
  propagationHeader: 'x-hound-flow',
  orphanMark: 'drop',
  sink: {
    kind: 'jsonl',
    filePath: '.hounddog/events.jsonl',
    rotateBytes: 5000000,
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
}

export function getConfig(): HoundConfig {
  return currentConfig;
}

export function isEnabled(): boolean {
  return currentConfig.enabled;
}
