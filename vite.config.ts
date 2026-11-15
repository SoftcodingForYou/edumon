import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the production build works from any folder or static host.
  base: './',
  test: {
    environment: 'node',
  },
});
