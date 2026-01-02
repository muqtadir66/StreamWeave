import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  define: {
    global: 'window',
  },
  resolve: {
    alias: [
      { find: '@solana/web3.js', replacement: path.resolve(__dirname, 'node_modules/@solana/web3.js') },
      { find: /^rpc-websockets\/dist\/lib\/client\/websocket\.browser$/, replacement: path.resolve(__dirname, 'node_modules/rpc-websockets/dist/lib/client/websocket.browser.cjs') },
      { find: /^rpc-websockets\/dist\/lib\/client$/, replacement: path.resolve(__dirname, 'node_modules/rpc-websockets/dist/lib/client.cjs') },
    ],
    dedupe: ['@solana/web3.js', '@coral-xyz/anchor'],
  },
  server: {
    host: true, // Listen on all network interfaces (0.0.0.0)
    allowedHosts: true, // Disable host checking entirely
  },
})
