import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import App from '@/app/App'
import '@/styles/globals.css'
import './i18n.js'

// Set VITE_CONVEX_URL in .env.local to choose a deployment. The fallback matches .env.example.
// (The old fallback, acoustic-robin-329, runs an outdated backend without voice calls or predictions.)
const convexUrl = (import.meta.env.VITE_CONVEX_URL as string | undefined) || 'https://astute-panda-274.convex.cloud'
const convex = new ConvexReactClient(convexUrl)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>,
)
