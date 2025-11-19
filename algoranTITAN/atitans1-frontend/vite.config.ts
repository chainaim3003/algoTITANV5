import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],
  server: {
    proxy: {
      // Proxy for Algorand LocalNet API calls to bypass CSP
      '/api/algod': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/algod/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // ALWAYS add LocalNet token for all requests
            proxyReq.setHeader('X-Algo-API-Token', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
            
            // Also forward any existing token headers
            if (req.headers['x-algo-api-token']) {
              proxyReq.setHeader('X-Algo-API-Token', req.headers['x-algo-api-token']);
            }
            
            console.log('🔄 Proxying algod request:', req.url, 'to', proxyReq.getHeader('host'));
          });
          proxy.on('error', (err, req, res) => {
            console.error('❌ Algod proxy error:', err);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('✅ Algod proxy response:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/api/indexer': {
        target: 'http://localhost:8980',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/indexer/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // ALWAYS add LocalNet token for all requests
            proxyReq.setHeader('X-Indexer-API-Token', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
            
            // Also forward any existing token headers
            if (req.headers['x-indexer-api-token']) {
              proxyReq.setHeader('X-Indexer-API-Token', req.headers['x-indexer-api-token']);
            }
            
            console.log('🔄 Proxying indexer request:', req.url, 'to', proxyReq.getHeader('host'));
          });
          proxy.on('error', (err, req, res) => {
            console.error('❌ Indexer proxy error:', err);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('✅ Indexer proxy response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  }
})
