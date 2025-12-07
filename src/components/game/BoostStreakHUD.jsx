import React from 'react';
import { useGameStore } from '../../stores/gameStore';

function BoostStreakHUD() {
  const boostStreak = useGameStore((s) => s.boostStreak);
  const fuel = useGameStore((s) => s.fuel);
  const currentTier = useGameStore((s) => s.currentTier);
  const isBoosting = useGameStore((s) => s.isBoosting);

  // Intuitive Tier Colors & Labels
  const tierConfig = {
    0: { color: '#ff4444', label: "RISK (0x)" },
    1: { color: '#ffffff', label: "SAFE (+0.5x)" },
    2: { color: '#00f6ff', label: "PROFIT (+1.5x)" },
    3: { color: '#d946ef', label: "MOON (+3.5x)" },
    4: { color: '#facc15', label: "MARS (+8.0x)" },
    5: { color: '#ff0000', label: "JACKPOT (+20x)" }, 
  };

  const currentConfig = tierConfig[currentTier] || tierConfig[0];

  return (
    <>
      {/* FUEL SYSTEM UI */}
      <div style={{
        position: 'absolute',
        bottom: '220px', // Positioned above controls
        left: '50%',
        transform: 'translateX(-50%)',
        width: '200px',
        height: '8px',
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '4px',
        overflow: 'hidden',
        zIndex: 20
      }}>
        <div style={{
          width: `${fuel}%`,
          height: '100%',
          background: fuel < 20 ? '#ff0000' : '#00f6ff',
          transition: 'width 0.1s linear, background 0.3s'
        }} />
        <div style={{
          position: 'absolute',
          top: '-18px',
          width: '100%',
          textAlign: 'center',
          color: fuel < 20 ? '#ff0000' : 'rgba(255,255,255,0.7)',
          fontSize: '9px',
          fontFamily: 'monospace',
          letterSpacing: '2px'
        }}>
          FUEL SYSTEM
        </div>
      </div>

      {/* BOOST STREAK TIMER & MULTIPLIER */}
      {isBoosting && (
        <div style={{
          position: 'absolute',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: currentConfig.color,
          textAlign: 'center',
          fontFamily: "'Courier New', 'Consolas', monospace",
          textShadow: `0 0 15px ${currentConfig.color}`,
          zIndex: 20
        }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {boostStreak.toFixed(2)}s
          </div>
          <div style={{ 
            fontSize: '18px', 
            letterSpacing: '0.1em', 
            marginTop: '5px', 
            fontWeight: 'bold',
            animation: currentTier >= 3 ? 'shake 0.2s infinite' : 'none'
          }}>
            {currentConfig.label}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes shake {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(2px, -2px); }
          75% { transform: translate(-2px, -2px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </>
  );
}

export default BoostStreakHUD;