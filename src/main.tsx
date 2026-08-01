import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@uiw/react-textarea-code-editor/dist.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
