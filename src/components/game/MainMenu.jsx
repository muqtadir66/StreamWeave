import React, { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

const MainMenu = () => {
  const status = useGameStore((s) => s.status);
  const start = useGameStore((s) => s.start);
  const balance = useGameStore((s) => s.balance);
  const wager = useGameStore((s) => s.wager);
  const setWager = useGameStore((s) => s.setWager);
  const refill = useGameStore((s) => s.refill);
  const lastPayout = useGameStore((s) => s.payout);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  if (status !== 'idle' && status !== 'crashed') return null;

  const isCrashed = status === 'crashed';
  const netChange = lastPayout - wager; // Profit/Loss check

  // Wager Controls
  const adjustWager = (amount) => {
    const newWager = Math.min(100000, Math.max(500, wager + amount));
    setWager(newWager);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.vignette} />
      <div style={styles.container}>
        
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>STREAM<span style={{ color: '#00f6ff' }}>WEAVE</span></h1>
          <div style={styles.subtitle}>RISK PROTOCOL INITIALIZED</div>
        </div>

        {/* Wallet & Stats */}
        <div style={styles.statsCard}>
          <div style={styles.row}>
            <span style={styles.label}>WALLET BALANCE</span>
            <span style={styles.value}>{balance.toLocaleString()}</span>
          </div>
          
          {/* Faucet / Refill Button */}
          {balance < 500 && (
            <button 
              onClick={refill}
              style={styles.refillBtn}
            >
              ⚠️ FAUCET: REFILL TOKENS
            </button>
          )}

          {isCrashed && (
            <>
              <div style={styles.divider} />
              <div style={styles.row}>
                <span style={styles.label}>LAST RUN</span>
                <span style={{ ...styles.value, color: netChange >= 0 ? '#00ff88' : '#ff4444' }}>
                  {netChange > 0 ? '+' : ''}{netChange.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Wager Selector */}
        <div style={styles.wagerControl}>
          <div style={styles.label}>SET WAGER</div>
          <div style={styles.wagerRow}>
            <button onClick={() => adjustWager(-500)} style={styles.adjustBtn}>-</button>
            <div style={styles.wagerDisplay}>{wager.toLocaleString()}</div>
            <button onClick={() => adjustWager(500)} style={styles.adjustBtn}>+</button>
          </div>
          <div style={styles.sliderContainer}>
            <input 
              type="range" 
              min="500" 
              max="100000" 
              step="500" 
              value={wager}
              onChange={(e) => setWager(parseInt(e.target.value))}
              style={styles.slider}
            />
          </div>
        </div>

        {/* Start Button */}
        <div style={styles.menuGroup}>
          <button
            onClick={start}
            onMouseEnter={() => setHoveredBtn('start')}
            onMouseLeave={() => setHoveredBtn(null)}
            disabled={balance < wager}
            style={{
              ...styles.button,
              ...(hoveredBtn === 'start' ? styles.buttonHover : {}),
              opacity: balance < wager ? 0.5 : 1
            }}
          >
            <div style={styles.btnGlitch} />
            <span style={{ position: 'relative', zIndex: 2 }}>
              {balance < wager ? 'INSUFFICIENT FUNDS' : 'INITIATE RUN'}
            </span>
          </button>
        </div>

        <div style={styles.controlsFooter}>
           <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textAlign: 'center', lineHeight: '1.6' }}>
            HOLD BOOST TO EARN • RELEASE TO BANK<br/>
            <span style={{color: '#ff4444'}}>FUEL DRAINS WHEN IDLE</span> • <span style={{color: '#00f6ff'}}>REGENS WHEN BOOSTING</span><br/>
            10s = 0.5x | 20s = 1.5x | 30s = 3.5x | 40s = 8.0x
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    fontFamily: "'Rajdhani', 'Segoe UI', sans-serif", perspective: '1000px',
  },
  vignette: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(circle at center, rgba(10,10,20,0.85) 0%, rgba(0,0,0,0.98) 100%)',
    zIndex: -1, backdropFilter: 'blur(5px)',
  },
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '25px', width: '100%', maxWidth: '450px', padding: '20px',
  },
  header: { textAlign: 'center' },
  title: {
    fontSize: '3rem', margin: 0, color: '#fff', letterSpacing: '0.1em', fontWeight: '800',
    textShadow: '0 0 20px rgba(0, 246, 255, 0.3)',
  },
  subtitle: { color: 'rgba(255,255,255,0.6)', letterSpacing: '0.4em', fontSize: '0.7rem', marginTop: '5px' },
  statsCard: {
    background: 'rgba(0, 20, 40, 0.8)', border: '1px solid rgba(0, 246, 255, 0.2)',
    padding: '20px', borderRadius: '4px', width: '100%',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: '0.7rem', color: '#00f6ff', letterSpacing: '0.1em' },
  value: { fontSize: '1.2rem', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' },
  divider: { height: '1px', background: 'rgba(255,255,255,0.1)', width: '100%' },
  refillBtn: {
    background: 'rgba(255, 68, 68, 0.2)', border: '1px solid #ff4444', color: '#ff4444',
    padding: '8px', fontSize: '0.8rem', cursor: 'pointer', marginTop: '10px', width: '100%'
  },
  wagerControl: {
    width: '100%', background: 'rgba(0, 0, 0, 0.3)', padding: '15px',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px'
  },
  wagerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' },
  adjustBtn: {
    background: 'transparent', border: '1px solid #00f6ff', color: '#00f6ff',
    width: '30px', height: '30px', borderRadius: '4px', cursor: 'pointer', fontSize: '1.2rem'
  },
  wagerDisplay: { fontSize: '1.5rem', fontFamily: 'monospace', color: '#fff' },
  sliderContainer: { width: '100%', display: 'flex', justifyContent: 'center' },
  slider: { width: '100%', accentColor: '#00f6ff', cursor: 'pointer' },
  menuGroup: { width: '100%' },
  button: {
    position: 'relative', background: 'rgba(0, 246, 255, 0.1)',
    border: '1px solid rgba(0, 246, 255, 0.3)', color: '#fff',
    padding: '15px 0', fontSize: '1.1rem', letterSpacing: '0.2em', cursor: 'pointer',
    width: '100%', textAlign: 'center', transition: 'all 0.3s',
  },
  buttonHover: { background: 'rgba(0, 246, 255, 0.3)', borderColor: '#00f6ff', letterSpacing: '0.3em' },
  controlsFooter: { marginTop: '10px', opacity: 0.8 },
};

export default MainMenu;