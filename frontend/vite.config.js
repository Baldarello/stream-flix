import { fileURLToPath, URL } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Environment variables are loaded by `loadEnv` and exposed to the client
    // via Vite's `define` option. This is necessary for `process.env.API_KEY` and other variables to be available in the app.
    const env = loadEnv(mode, '.', '');

    return {
        base: './',
        plugins: [react()],
        define: {
            'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
            'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID ?? ''),
            'process.env.API_KEY': JSON.stringify(env.API_KEY ?? ''),
            'process.env.TND_TURN_URL': JSON.stringify(env.TND_TURN_URL ?? ''),
            'process.env.VITE_WS_URL': JSON.stringify(env.VITE_WS_URL ?? ''),
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./components', import.meta.url)),
            },
        },
        server: {
            port: 3002,
            strictPort: true,
            proxy: {
                '/api': {
                    target: 'http://localhost:3011',
                    changeOrigin: true,
                },
            },
        },
    };
});
