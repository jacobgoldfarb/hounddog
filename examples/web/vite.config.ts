import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tsconfigPaths()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      external: ['node:fs', 'node:fs/promises', 'node:path'],
    },
  },
});
