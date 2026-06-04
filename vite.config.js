import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5172, // Unique port for download
    strictPort: true,
    host: true,
    cors: true,
    origin: "http://localhost:8000",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:19119", // Backend server
        changeOrigin: true, // Ensure the request appears to come from the frontend server
      },
    },
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
    sourcemap: true,
  },
  base: "/clients/download/",
});
