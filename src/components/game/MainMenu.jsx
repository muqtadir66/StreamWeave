import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

const MainMenu = () => {
  const [activePanel, setActivePanel] = useState('main'); // main, options, stats
  const [isVisible, setIsVisible] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  const status = useGameStore((s) => s.status);
  const start = useGameStore((s) => s.start);
  const reset = useGameStore((s) => s.reset);
  const score = useGameStore((s) => s.score);
  const bestScore = useGameStore((s) => s.bestScore);
  const longestBoostStreak = useGameStore((s) => s.longestBoostStreak);

  useEffect(() => {
    // Animation sequence for menu appearance
    const timer1 = setTimeout(() => setAnimationPhase(1), 100);
    const timer2 = setTimeout(() => setAnimationPhase(2), 300);
    const timer3 = setTimeout(() => setAnimationPhase(3), 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  useEffect(() => {
    // Show menu when game is idle or crashed
    setIsVisible(status === 'idle' || status === 'crashed');
  }, [status]);

  if (!isVisible) return null;

  const handleStart = () => {
    start();
    setIsVisible(false);
  };

  const handleReset = () => {
    reset();
    setActivePanel('main');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(5, 8, 20, 0.9)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Courier New', 'Consolas', monospace"
    }}>
      {/* Animated background particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        opacity: 0.3
      }}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '2px',
              height: '2px',
              background: '#00f6ff',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `particleFloat ${3 + Math.random() * 4}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
              boxShadow: '0 0 4px #00f6ff'
            }}
          />
        ))}
      </div>

      {/* Main holographic interface */}
      <div style={{
        position: 'relative',
        width: '90vw',
        maxWidth: '800px',
        minHeight: '600px',
        background: 'rgba(0, 10, 20, 0.8)',
        border: '1px solid #00f6ff',
        borderRadius: '20px',
        boxShadow: '0 0 50px rgba(0, 246, 255, 0.3)',
        backdropFilter: 'blur(10px)',
        transform: animationPhase >= 1 ? 'translateY(0)' : 'translateY(50px)',
        opacity: animationPhase >= 1 ? 1 : 0,
        transition: 'all 0.5s ease-out'
      }}>

        {/* Header with animated logo */}
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          borderBottom: '1px solid rgba(0, 246, 255, 0.3)',
          position: 'relative'
        }}>
          <h1 style={{
            fontSize: '3.5em',
            margin: 0,
            background: 'linear-gradient(45deg, #00f6ff, #990000)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 20px rgba(0, 246, 255, 0.5)',
            animation: animationPhase >= 2 ? 'logoGlow 2s ease-in-out infinite alternate' : 'none'
          }}>
            STREAMWEAVE
          </h1>

          {/* Data streams */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            right: '20px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00f6ff, transparent)',
            animation: animationPhase >= 3 ? 'dataStream 3s linear infinite' : 'none'
          }} />

          {status === 'crashed' && (
            <div style={{
              marginTop: '20px',
              fontSize: '1.2em',
              color: '#ff4444',
              textShadow: '0 0 10px rgba(255, 68, 68, 0.8)'
            }}>
              FLIGHT TERMINATED • Score: {Math.floor(score)} • Best: {bestScore} • Session Streak: {longestBoostStreak.toFixed(2)}s
            </div>
          )}
        </div>

        {/* Navigation tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '20px',
          gap: '10px'
        }}>
          {[
            { id: 'main', label: 'FLIGHT DECK', icon: '🚀' },
            { id: 'options', label: 'SYSTEMS', icon: '⚙️' },
            { id: 'stats', label: 'RECORDS', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              style={{
                padding: '12px 24px',
                background: activePanel === tab.id ? 'rgba(0, 246, 255, 0.2)' : 'rgba(0, 246, 255, 0.1)',
                border: `1px solid ${activePanel === tab.id ? '#00f6ff' : 'rgba(0, 246, 255, 0.3)'}`,
                borderRadius: '10px',
                color: '#00f6ff',
                fontSize: '0.9em',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activePanel === tab.id ? '0 0 15px rgba(0, 246, 255, 0.5)' : 'none',
                transform: activePanel === tab.id ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content panels */}
        <div style={{ padding: '20px 40px', minHeight: '300px' }}>

          {/* Main Panel */}
          {activePanel === 'main' && (
            <div style={{
              textAlign: 'center',
              transform: animationPhase >= 2 ? 'translateY(0)' : 'translateY(20px)',
              opacity: animationPhase >= 2 ? 1 : 0,
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '40px'
              }}>
                <div style={{
                  background: 'rgba(0, 246, 255, 0.1)',
                  border: '1px solid rgba(0, 246, 255, 0.3)',
                  borderRadius: '15px',
                  padding: '30px',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '3em', marginBottom: '10px' }}>🚀</div>
                  <h3 style={{ color: '#00f6ff', margin: '10px 0' }}>START FLIGHT</h3>
                  <p style={{ color: 'rgba(0, 246, 255, 0.7)', fontSize: '0.9em' }}>
                    Begin your journey through the asteroid field
                  </p>
                  <button
                    onClick={handleStart}
                    style={{
                      marginTop: '20px',
                      padding: '15px 30px',
                      background: 'linear-gradient(45deg, #00f6ff, #0099cc)',
                      border: 'none',
                      borderRadius: '25px',
                      color: '#000',
                      fontSize: '1.1em',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 5px 15px rgba(0, 246, 255, 0.4)'
                    }}
                  >
                    {status === 'idle' ? 'LAUNCH' : 'RELAUNCH'}
                  </button>
                </div>

                <div style={{
                  background: 'rgba(153, 0, 0, 0.1)',
                  border: '1px solid rgba(153, 0, 0, 0.3)',
                  borderRadius: '15px',
                  padding: '30px'
                }}>
                  <div style={{ fontSize: '3em', marginBottom: '10px' }}>🏆</div>
                  <h3 style={{ color: '#ff4444', margin: '10px 0' }}>BEST SCORE</h3>
                  <p style={{
                    fontSize: '2em',
                    color: '#ff4444',
                    fontWeight: 'bold',
                    textShadow: '0 0 10px rgba(255, 68, 68, 0.5)'
                  }}>
                    {bestScore || 0}
                  </p>
                </div>
              </div>

              {/* Control instructions */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(0, 246, 255, 0.2)',
                borderRadius: '10px',
                padding: '20px',
                marginTop: '40px'
              }}>
                <h4 style={{ color: '#00f6ff', margin: '0 0 15px 0' }}>CONTROLS</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '10px',
                  fontSize: '0.9em',
                  color: 'rgba(0, 246, 255, 0.8)'
                }}>
                  <div>🕹️ Mouse/Touch: Steer Ship</div>
                  <div>Space: Boost Engines</div>
                  <div>Enter: Start Flight</div>
                  <div>Esc: Emergency Stop</div>
                </div>
              </div>
            </div>
          )}

          {/* Options Panel */}
          {activePanel === 'options' && (
            <OptionsPanel />
          )}

          {/* Statistics Panel */}
          {activePanel === 'stats' && (
            <StatisticsPanel />
          )}
        </div>

        {/* Bottom status bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '15px 40px',
          borderTop: '1px solid rgba(0, 246, 255, 0.3)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8em',
          color: 'rgba(0, 246, 255, 0.6)'
        }}>
          <div>StreamWeave v1.0 • Neural Flight Systems</div>
          <div>Status: {status === 'idle' ? 'STANDBY' : 'POST-FLIGHT'}</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes logoGlow {
          from { text-shadow: 0 0 20px rgba(0, 246, 255, 0.5); }
          to { text-shadow: 0 0 30px rgba(0, 246, 255, 0.8), 0 0 40px rgba(153, 0, 0, 0.3); }
        }

        @keyframes dataStream {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes particleFloat {
          0% { transform: translateY(100vh) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(100px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// Options Panel Component
const OptionsPanel = () => {
  const highQuality = useGameStore((s) => s.highQuality);
  const toggleHighQuality = useGameStore((s) => s.toggleHighQuality);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px'
    }}>
      <div style={{
        background: 'rgba(0, 246, 255, 0.1)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRadius: '15px',
        padding: '25px'
      }}>
        <h3 style={{ color: '#00f6ff', margin: '0 0 20px 0' }}>⚙️ GRAPHICS</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', color: '#00f6ff', marginBottom: '5px' }}>
            Quality Level
          </label>
          <button
            onClick={toggleHighQuality}
            style={{
              padding: '8px 16px',
              background: highQuality ? 'rgba(0, 246, 255, 0.3)' : 'rgba(0, 246, 255, 0.1)',
              border: '1px solid rgba(0, 246, 255, 0.5)',
              borderRadius: '5px',
              color: '#00f6ff',
              cursor: 'pointer'
            }}
          >
            {highQuality ? 'HIGH' : 'LOW'}
          </button>
        </div>
      </div>

      <div style={{
        background: 'rgba(153, 0, 0, 0.1)',
        border: '1px solid rgba(153, 0, 0, 0.3)',
        borderRadius: '15px',
        padding: '25px'
      }}>
        <h3 style={{ color: '#ff4444', margin: '0 0 20px 0' }}>🎵 AUDIO</h3>
        <div style={{ color: 'rgba(255, 68, 68, 0.7)' }}>
          <p>Audio system coming soon...</p>
          <p>Master Volume: 75%</p>
          <p>SFX Volume: 60%</p>
        </div>
      </div>
    </div>
  );
};

// Statistics Panel Component
const StatisticsPanel = () => {
  const bestScore = useGameStore((s) => s.bestScore);
  const allTimeLongestBoostStreak = useGameStore((s) => s.allTimeLongestBoostStreak);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px'
    }}>
      <div style={{
        background: 'rgba(0, 246, 255, 0.1)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRadius: '15px',
        padding: '25px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>🏆</div>
        <h3 style={{ color: '#00f6ff', margin: '10px 0' }}>BEST SCORE</h3>
        <p style={{
          fontSize: '2em',
          color: '#00f6ff',
          fontWeight: 'bold',
          textShadow: '0 0 10px rgba(0, 246, 255, 0.5)'
        }}>
          {bestScore || 0}
        </p>
      </div>

      <div style={{
        background: 'rgba(0, 246, 255, 0.1)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRadius: '15px',
        padding: '25px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>🔥</div>
        <h3 style={{ color: '#00f6ff', margin: '10px 0' }}>LONGEST STREAK</h3>
        <p style={{
          fontSize: '2em',
          color: '#00f6ff',
          fontWeight: 'bold',
          textShadow: '0 0 10px rgba(0, 246, 255, 0.5)'
        }}>
          {allTimeLongestBoostStreak ? allTimeLongestBoostStreak.toFixed(2) : 0}s
        </p>
      </div>

      <div style={{
        background: 'rgba(153, 0, 0, 0.1)',
        border: '1px solid rgba(153, 0, 0, 0.3)',
        borderRadius: '15px',
        padding: '25px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>⭐</div>
        <h3 style={{ color: '#ff4444', margin: '10px 0' }}>ACHIEVEMENTS</h3>
        <p style={{ color: 'rgba(255, 68, 68, 0.7)' }}>
          System ready for expansion
        </p>
      </div>
    </div>
  );
};

export default MainMenu;
