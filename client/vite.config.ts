import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: [
      'chunk-ZHGN7TRK', 
      'chunk-4MU4PHTW', 
      'chunk-AQR2IIH3',
      'chunk-5F3OJTDZ'
    ],
    force: true,
    include: [
      'react',
      'react-dom',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'lucide-react'
    ]
  },
}));
