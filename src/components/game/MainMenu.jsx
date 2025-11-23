import React from 'react';
import { useGameStore } from '../../stores/gameStore';

const MainMenu = () => {
  const status = useGameStore((s) => s.status);
  const start = useGameStore((s) => s.start);
  const reset = useGameStore((s) => s.reset);
  const score = useGameStore((s) => s.score);
  const bestScore = useGameStore((s) => s.bestScore);

  const handleStart = () => {
    start();
  };

  // Show menu when game is idle or crashed
  if (status !== 'idle' && status !== 'crashed') return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      backgroundColor: '#0f0f23', // Very dark blue-black
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>

      {/* Game Title */}
      <h1 style={{
        fontSize: 'clamp(2.5rem, 8vw, 4rem)',
        margin: '0 0 20px 0',
        color: '#ffffff',
        fontWeight: '300',
        letterSpacing: '0.1em',
        textAlign: 'center',
        lineHeight: 1.2
      }}>
        STREAMWEAVE
      </h1>

      {/* Best Score */}
      <div style={{
        fontSize: 'clamp(1rem, 3vw, 1.25rem)',
        color: '#00d4aa',
        marginBottom: '30px',
        textAlign: 'center',
        fontWeight: '500'
      }}>
        Best Score: <span style={{ fontWeight: '700', color: '#ffffff' }}>{bestScore || 0}</span>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        style={{
          fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
          padding: '16px 40px',
          background: 'linear-gradient(135deg, #006a99 0%, #00a3cc 100%)',
          border: 'none',
          borderRadius: '12px',
          color: '#ffffff',
          fontWeight: '600',
          cursor: 'pointer',
          marginBottom: '40px',
          minHeight: '60px',
          minWidth: '200px',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 20px rgba(0, 163, 204, 0.3)'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 25px rgba(0, 163, 204, 0.4)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 20px rgba(0, 163, 204, 0.3)';
        }}
      >
        {status === 'idle' ? 'START GAME' : 'PLAY AGAIN'}
      </button>

      {/* Controls */}
      <div style={{
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <div style={{
          fontSize: 'clamp(0.8rem, 2vw, 1rem)',
          color: '#00d4aa',
          marginBottom: '10px',
          fontWeight: '500'
        }}>
          CONTROLS
        </div>
        <div style={{
          fontSize: 'clamp(0.7rem, 2vw, 0.85rem)',
          color: '#b0b0b0',
          lineHeight: '1.6',
          textAlign: 'left'
        }}>
          <div>• Mouse/Touch: Steer Ship</div>
          <div>• Space: Boost Engines</div>
          <div>• Esc: Emergency Stop</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          div[style*="position: fixed"] {
            justify-content: flex-start !important;
            padding-top: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default MainMenu;
