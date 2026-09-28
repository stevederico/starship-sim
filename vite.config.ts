import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

// Absolute site address for canonical and social card tags in index.html.
process.env.VITE_SITE_URL ??= 'https://starship-sim.grok.me';

export default defineConfig({
  // Relative paths so dist/ works from any host or sub-path.
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1'
  }
});
