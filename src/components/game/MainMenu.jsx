import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

const MainMenu = () => {
  const status = useGameStore((s) => s.status);
  const start = useGameStore((s) => s.start);
  const bestScore = useGameStore((s) => s.bestScore);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  // Only show in idle or crashed states
  if (status !== 'idle' && status !== 'crashed') return null;

  const isCrashed = status === 'crashed';

  return (
    <div style={styles.overlay}>
      {/* Background Gradient Vignette */}
      <div style={styles.vignette} />

      {/* Main Content Container */}
      <div style={styles.container}>
        
        {/* Title Section */}
        <div style={styles.header}>
          <h1 style={styles.title}>
            STREAM<span style={{ color: '#00f6ff' }}>WEAVE</span>
          </h1>
          <div style={styles.subtitle}>HYPER-VELOCITY INTERCEPTOR</div>
        </div>

        {/* Stats Module */}
        <div style={styles.statsCard}>
          <div style={styles.statLabel}>NEURAL SYNC BEST</div>
          <div style={styles.statValue}>{bestScore || 0}</div>
          <div style={styles.statBar}>
            <div style={{...styles.statBarFill, width: `${Math.min(100, (bestScore / 500) * 100)}%`}} />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.menuGroup}>
          <button
            onClick={start}
            onMouseEnter={() => setHoveredBtn('start')}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              ...styles.button,
              ...(hoveredBtn === 'start' ? styles.buttonHover : {}),
            }}
          >
            <div style={styles.btnGlitch} />
            <span style={{ position: 'relative', zIndex: 2 }}>
              {isCrashed ? 'REBOOT SYSTEM' : 'vn_INITIATE'}
            </span>
          </button>
        </div>

        {/* Controls Footer */}
        <div style={styles.controlsFooter}>
          <div style={styles.controlItem}>
            <span style={styles.key}>MOUSE / TOUCH</span>
            <span style={styles.action}>STEER</span>
          </div>
          <div style={styles.controlItem}>
            <span style={styles.key}>SPACE</span>
            <span style={styles.action}>BOOST</span>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.8; text-shadow: 0 0 20px rgba(0,246,255,0.5); }
          50% { opacity: 1; text-shadow: 0 0 40px rgba(0,246,255,0.8); }
        }
      `}</style>
      
      {/* Moving Scanline Effect */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, height: '10px',
        background: 'rgba(0, 246, 255, 0.1)',
        boxShadow: '0 0 10px rgba(0, 246, 255, 0.2)',
        animation: 'scanline 4s linear infinite',
        pointerEvents: 'none',
        zIndex: 5
      }} />
    </div>
  );
};

// --- Styles Object ---
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Rajdhani', 'Segoe UI', sans-serif", // Ideally use a sci-fi font if available
    perspective: '1000px',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at center, rgba(10,10,20,0.4) 0%, rgba(0,0,0,0.95) 100%)',
    zIndex: -1,
    backdropFilter: 'blur(3px)',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px',
    width: '100%',
    maxWidth: '500px',
    padding: '20px',
    transformStyle: 'preserve-3d',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: 'clamp(3rem, 10vw, 5rem)',
    margin: 0,
    color: '#fff',
    letterSpacing: '0.1em',
    fontWeight: '800',
    textTransform: 'uppercase',
    animation: 'pulse 3s ease-in-out infinite',
    textShadow: '0 0 20px rgba(0, 246, 255, 0.3)',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.5em',
    fontSize: '0.8rem',
    marginTop: '5px',
    textShadow: '0 0 5px rgba(0,0,0,0.5)',
  },
  statsCard: {
    background: 'rgba(0, 20, 40, 0.6)',
    border: '1px solid rgba(0, 246, 255, 0.2)',
    padding: '15px 30px',
    borderRadius: '4px',
    width: '80%',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  },
  statLabel: {
    fontSize: '0.7rem',
    color: '#00f6ff',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: '2.5rem',
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    textShadow: '0 0 10px rgba(255,255,255,0.5)',
  },
  statBar: {
    width: '100%',
    height: '4px',
    background: 'rgba(255,255,255,0.1)',
    marginTop: '5px',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    background: '#00f6ff',
    boxShadow: '0 0 10px #00f6ff',
  },
  menuGroup: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    marginTop: '20px',
  },
  button: {
    position: 'relative',
    background: 'rgba(0, 246, 255, 0.05)',
    border: '1px solid rgba(0, 246, 255, 0.3)',
    color: '#fff',
    padding: '20px 60px',
    fontSize: '1.2rem',
    letterSpacing: '0.2em',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    width: '80%',
    textAlign: 'center',
    clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)', // Sci-fi Shape
  },
  buttonHover: {
    background: 'rgba(0, 246, 255, 0.2)',
    borderColor: '#00f6ff',
    transform: 'scale(1.05)',
    boxShadow: '0 0 30px rgba(0, 246, 255, 0.2)',
    letterSpacing: '0.3em',
  },
  btnGlitch: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '50%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
    transform: 'skewX(-25deg)',
    transition: 'left 0.5s',
  },
  controlsFooter: {
    marginTop: '40px',
    display: 'flex',
    gap: '30px',
    opacity: 0.7,
  },
  controlItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  },
  key: {
    fontSize: '0.7rem',
    color: '#00f6ff',
    border: '1px solid rgba(0,246,255,0.3)',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  action: {
    fontSize: '0.6rem',
    color: '#fff',
    letterSpacing: '0.1em',
  },
};

export default MainMenu;