import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        react()
    ],
    base: '/',
    server: {
        port: 3000
    },
    build: {
        outDir: 'build', // CRA's default build output
    },
});
