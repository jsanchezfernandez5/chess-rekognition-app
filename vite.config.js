import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

// Path absoluto de __dirname para usarlo en alias "@/" para los imports.
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configuración de Vite.
export default defineConfig(
    {
        plugins: [
            react(),
            tailwindcss(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
    })