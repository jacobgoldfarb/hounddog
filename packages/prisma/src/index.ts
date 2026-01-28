import { clock, mark } from '@tailchi/core';

const MAX_SQL_PREVIEW = 100;
const QUERY_EVENT_STALENESS_MS = 50;

function truncateSql(sql: string): string {
  if (sql.length <= MAX_SQL_PREVIEW) return sql;
  return sql.slice(0, MAX_SQL_PREVIEW) + '…';
}

type QueryEvent = { query: string; params: string; duration: number };
type PrismaClientLike = {
  $on: (event: 'query', callback: (e: QueryEvent) => void) => void;
  $extends: (extension: unknown) => unknown;
};

export function instrumentPrisma<T extends PrismaClientLike>(client: T): T {
  let lastQuery: { sql: string; ts: number } | null = null;

  client.$on('query', (e) => {
    lastQuery = { sql: e.query, ts: clock.nowPerfMs() };
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: {
          model: string;
          operation: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) {
          await mark(`db.${operation}`, { attrs: { model } });

          const startPerf = clock.nowPerfMs();

          try {
            const result = await query(args);
            const durationMs = clock.nowPerfMs() - startPerf;
            const sql = lastQuery && clock.nowPerfMs() - lastQuery.ts < QUERY_EVENT_STALENESS_MS
              ? truncateSql(lastQuery.sql)
              : undefined;

            await mark(`db.${operation}.done`, {
              attrs: { model, sql },
              durationMs,
            });

            return result;
          } catch (error) {
            await mark(`db.${operation}.done`, {
              attrs: { model },
              status: 'error',
              durationMs: clock.nowPerfMs() - startPerf,
            });
            throw error;
          }
        },
      },
    },
  }) as T;
}
