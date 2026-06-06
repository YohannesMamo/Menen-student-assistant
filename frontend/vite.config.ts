import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite';

export default defineConfig({

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
	  fs: {
		  // Allow serving files from this specific project directory
		  allow: ['Textbooks']
		}
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/textbooks': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/Textbooks': {      // ← ADD THIS - matches capital T
      target: 'http://localhost:8000',
      changeOrigin: true
      },
      '/files': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
