import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://snakechatbackend.up.railway.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Bỏ qua warnings về module level directives
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          bootstrap: ['react-bootstrap', 'bootstrap'],
          icons: ['react-icons'],
          socket: ['socket.io-client'],
          chart: ['chart.js', 'react-chartjs-2'],
          emoji: ['emoji-picker-react'],
          cloudinary: ['@cloudinary/react', '@cloudinary/url-gen'],
          toast: ['react-toastify'],
          axios: ['axios']
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Tăng giới hạn cảnh báo chunk size
    sourcemap: false, // Tắt sourcemap cho production để giảm kích thước
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});