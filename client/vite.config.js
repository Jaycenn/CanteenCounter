import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // lets tablets on the shop wifi open the dev server
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
