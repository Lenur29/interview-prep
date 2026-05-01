import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/cli.ts'],
  tsconfig: './tsconfig.json',
  outDir: 'dist',
  dts: true,
  clean: true,
  sourcemap: true,
  format: 'esm',
});
