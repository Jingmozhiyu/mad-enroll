import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

restoreRedirectedPath()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

function restoreRedirectedPath() {
  const redirectedPath = sessionStorage.getItem('spa-redirect-path')

  if (!redirectedPath) {
    return
  }

  sessionStorage.removeItem('spa-redirect-path')
  window.history.replaceState(null, '', redirectedPath)
}
