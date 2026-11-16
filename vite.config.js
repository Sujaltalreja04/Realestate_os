import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { Readable } from 'node:stream'
import assistant from './api/assistant.ts'

/** Serves the Vercel functions in /api during `npm run dev` (Vercel runs them in production). */
function devApi(env) {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      // Server-only secret; in dev it may come from .env / .env.local.
      process.env.SARVAM_API_KEY ??= env.SARVAM_API_KEY || env.VITE_SARVAM_API_KEY
      server.middlewares.use('/api/assistant', async (req, res) => {
        const chunks = []
        for await (const c of req) chunks.push(c)
        const request = new Request(`http://localhost${req.url ?? ''}`, {
          method: req.method,
          headers: { 'Content-Type': req.headers['content-type'] ?? 'application/json' },
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        })
        const response = await assistant(request)
        res.statusCode = response.status
        response.headers.forEach((v, k) => res.setHeader(k, v))
        if (response.body) Readable.fromWeb(response.body).pipe(res)
        else res.end()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), devApi(loadEnv(mode, process.cwd(), ''))],
  base: '/',
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src'), '@convex': path.resolve(import.meta.dirname, 'convex') },
  },
}))
