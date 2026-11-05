import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Tidy addresses like "//reset-password" (e.g. from an email template whose
// Site URL ends in "/") before the router sees them, so links still open the
// right page instead of falling through to sign-in.
if (window.location.pathname.includes('//')) {
  const { pathname, search, hash } = window.location
  window.history.replaceState(null, '', pathname.replace(/\/{2,}/g, '/') + search + hash)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
