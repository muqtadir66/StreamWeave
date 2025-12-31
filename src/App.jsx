import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Game from './pages/Game'
import Grid from './pages/Grid'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/game" element={<Game />} />
        <Route path="/streamweave" element={<Navigate to="/game" replace />} />
        <Route path="/grid" element={<Grid />} />
        <Route path="/weave" element={<Navigate to="/grid" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
