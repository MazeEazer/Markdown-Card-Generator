import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'

import '@uiw/react-textarea-code-editor/dist.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
        <AuthProvider>
      <App />
    </AuthProvider>

  </StrictMode>,
)
