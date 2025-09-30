import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: [['babel-plugin-react-compiler']],
            },
        }),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('/react/')) return 'react';
                        if (id.includes('@tanstack/react-router'))
                            return 'router';
                        if (id.includes('firebase')) return 'firebase';
                        if (
                            id.includes('lucide-react') ||
                            id.includes('sonner')
                        )
                            return 'ui';
                        return 'vendor';
                    }
                },
            },
        },
    },
});
