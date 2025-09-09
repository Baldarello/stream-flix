/// <reference types="node" />

import { URL, fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // FIX: The original code had a TypeScript error because `process.cwd()` was not recognized.
    // Adding `/// <reference types="node" />` resolves this.
    // Additionally, environment variables loaded by `loadEnv` were not being used.
    // This has been corrected by creating a `processEnv` object to expose them to the client
    // via Vite's `define` option. This is necessary for `process.env.API_KEY` to be available in the app.
    const env = loadEnv(mode, process.cwd(), '');

    const processEnv: { [key: string]: string } = {};
    for (const key in env) {
        processEnv[`process.env.${key}`] = JSON.stringify(env[key]);
    }

    return {
        base: './',
        plugins: [react()],
        define: {
            ...processEnv,
            'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version)
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./components', import.meta.url)),
            }
        }
    };
});
