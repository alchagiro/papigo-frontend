import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
    },
  },
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL || "http://localhost:3001/api"),
    "import.meta.env.VITE_SOCKET_URL": JSON.stringify(process.env.VITE_SOCKET_URL || "http://localhost:3001"),
  },
});
