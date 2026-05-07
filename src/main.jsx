import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

// When a new deploy happens, old chunk filenames become stale on the CDN.
// Vite fires this event when a dynamic import fails — auto-reload fetches fresh chunks.
window.addEventListener('vite:preloadError', () => { window.location.reload(); });

createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <BrowserRouter>
      <StrictMode>
        <App />
      </StrictMode>
    </BrowserRouter>
  </HelmetProvider>
)
