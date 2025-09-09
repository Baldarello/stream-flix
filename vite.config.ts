
import { URL, fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        base: './',
        plugins: [react()],
        define: {
            'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version)
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./components', import.meta.url)),
            }
        }
    };
});