import { URL, fileURLToPath } from 'url';
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
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./components', import.meta.url)),
            }
        }
    };
});