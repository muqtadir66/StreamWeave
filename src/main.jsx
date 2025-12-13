import './polyfills';
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SolanaProvider } from './components/SolanaProvider' 

console.log('[StreamWeave] Booting app...')

const RootWrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode

createRoot(document.getElementById('root')).render(
  <RootWrapper>
    <SolanaProvider>
        <App />
    </SolanaProvider>
  </RootWrapper>,
)
