import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  server: {
    port: 5550,
    open: true,
    // Add logic to handle 404s in development
    proxy: {}
  },
  plugins: [
    {
      name: '404-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // After Vite's internal middle-wares, if no file is found:
          next();
        });

        // We use a post-middleware to catch unhandled requests
        return () => {
          server.middlewares.use((req, res, next) => {
            const url = req.url.split('?')[0];
            // Only handle HTML requests or clean URLs
            if (url.endsWith('.html') || !url.includes('.')) {
              const cleanUrl = url.endsWith('.html') ? url : url + '.html';
              const filePath = path.join(process.cwd(), cleanUrl.replace(/^\//, ''));
              // If the file doesn't exist, redirect to 404.html
              if (!fs.existsSync(filePath) && url !== '/404.html') {
                req.url = '/404.html';
              }
            }
            next();
          });
        };
      }
    }
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: Object.fromEntries(
        fs.readdirSync(__dirname)
          .filter(file => file.endsWith('.html'))
          .map(file => [
            path.basename(file, path.extname(file)),
            path.resolve(__dirname, file)
          ])
      )
    }
  },
  define: {
    __VITE_APP_ENV__: JSON.stringify(process.env.VITE_APP_ENV || 'development')
  }
})
