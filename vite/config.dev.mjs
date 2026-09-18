import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
    base: './',
    plugins: [react(), tailwindcss()],
    server: {
        host: '127.0.0.1',
        port: 8080,
        strictPort: true,
        watch: {
            ignored: [
                '**/coverage/**',
                '**/test-results/**',
                '**/playwright-report/**',
                '**/.firecrawl/**',
            ],
        },
    },
});
