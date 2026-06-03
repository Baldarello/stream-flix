import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': new URL('./components', import.meta.url).pathname,
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.{test,spec}.{js,jsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['store/**', 'utils/**', 'hooks/**', 'services/**'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.{js,jsx}'],
        },
    },
});
