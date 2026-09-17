import { defineConfig, loadEnv } from 'vite';

// INFERRED development configuration. Production requests remain same-origin.
// All build output is local to this recovered project, never ../dist.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '/',
    esbuild: { jsx: 'automatic' },
    build: { outDir: 'build', emptyOutDir: true, sourcemap: true },
    server: {
      proxy: env.BACKEND_ORIGIN
        ? { '/api': { target: env.BACKEND_ORIGIN, changeOrigin: false } }
        : undefined,
    },
  };
});
