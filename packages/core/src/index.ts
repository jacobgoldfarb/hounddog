// Configuration
export { configureHounddog, getConfig } from './lib/config.js';

// Timing
export { clock } from './lib/clock.js';

// Flow context
export { withFlow, getFlowId, makeFlowId } from './lib/context.js';

// Event API
export { mark, markAndEndFlow, run, action } from './api/index.js';
export type { MarkOptions } from './api/index.js';

// Sink management
export { emitEvent, flushSink, closeSink } from './sink/manager.js';

// Types
export type { HoundEvent, HoundConfig, HoundSinkConfig } from './types.js';
