export type EventIcon =
  | 'user'
  | 'http_out'
  | 'http_in'
  | 'db'
  | 'work'
  | 'queue'
  | 'cache'
  | 'auth'
  | 'error'
  | 'info';

/**
 * Event emitted by Hounddog.
 *
 * Notes:
 * - `timestampMs` is wall-clock epoch milliseconds for cross-service ordering.
 * - `durationMs` is a monotonic delta in milliseconds (perf-based) when applicable.
 * - `status` may be domain-specific (e.g. "error") or an HTTP status code.
 * - `attrs` should contain PII-safe, JSON-serializable structured data.
 */
export type HoundEvent = {
  /** Globally unique identifier for a flow (request/action/job). */
  flowId: string;
  /** Human-readable label for the flow (defaults to flowId if not set). */
  flowLabel?: string;
  /** Event name; prefer namespaced forms like "BE.http.start" / "BE.http.end". */
  type: string;
  /** Wall-clock timestamp in epoch milliseconds. */
  timestampMs: number;
  /** Name of the emitting service. */
  service: string;
  /** Optional component/module tag. */
  componentTag?: string;
  /** Duration in milliseconds (monotonic/perf-based) when relevant. */
  durationMs?: number;
  /** Domain-specific status or HTTP status code. */
  status?: string | number;
  /** Additional structured, PII-safe metadata. */
  attrs?: Record<string, unknown>;
  /** Marks this event as the terminal event of a flow (flow is complete). */
  flowTerminal?: boolean;
  /** Icon hint for CLI display. Falls back to type prefix detection (FE./BE./DB.). */
  icon?: EventIcon;
};

/**
 * Runtime configuration for Hounddog core.
 */
export type HoundConfig = {
  /** Enables/disables event emission globally. */
  enabled: boolean;
  /** Name of the current service (included on every event). */
  service: string;
  /** Optional default component tag for emitted events. */
  componentTag?: string;
  /** HTTP header used to propagate flow identifiers across boundaries. */
  propagationHeader: string;
  /** Behavior when `mark` is called without an active flow. */
  orphanMark: 'drop' | 'createFlow';
  /** Sink configuration (default: local JSONL). */
  sink?: HoundSinkConfig;
  /** Clock daemon URL for synchronized timestamps in dev (e.g., http://localhost:9999). */
  clockDaemon?: string;
};

export type HoundSinkConfig =
  | {
      kind: 'jsonl';
      filePath: string;
      rotateBytes?: number;
      retainFiles?: number;
      batchMax?: number;
      flushIntervalMs?: number;
    }
  | {
      kind: 'noop';
    }
  | {
      kind: 'http';
      /** Endpoint URL to POST events to (e.g. http://localhost:4000/__hound/events) */
      endpoint: string;
    };
