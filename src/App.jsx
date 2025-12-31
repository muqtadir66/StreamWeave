import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Game from './pages/Game';
import Grid from './pages/Grid';

/**
 * App - Main application with multi-page routing
 * 
 * Routes:
 * /      - Landing portal (ecosystem gateway)
 * /game  - StreamWeave game
 * /grid  - The Weave digital billboard
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/game" element={<Game />} />
        <Route path="/grid" element={<Grid />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
