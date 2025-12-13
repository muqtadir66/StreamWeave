import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

const MainMenu = () => {
  const status = useGameStore((s) => s.status);
  const start = useGameStore((s) => s.start);
  const balance = useGameStore((s) => s.balance);
  const wager = useGameStore((s) => s.wager);
  const lastWager = useGameStore((s) => s.lastWager);
  const setWager = useGameStore((s) => s.setWager);
  const refill = useGameStore((s) => s.refill);
  const lastPayout = useGameStore((s) => s.payout);
  const needsFinalization = useGameStore((s) => s.needsFinalization);
  
  // --- NEW ACTIONS ---
  const syncSession = useGameStore((s) => s.syncSession);
  const depositFunds = useGameStore((s) => s.depositFunds);
  const withdrawFunds = useGameStore((s) => s.withdrawFunds);
  
  // --- REAL SOLANA HOOKS ---
  const { connected, publicKey, disconnect, wallet } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { setVisible } = useWalletModal();

  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [depositAmount, setDepositAmount] = useState(1000); // Default deposit amount

  // Sync Balance on Connect
  useEffect(() => {
    if (connected && anchorWallet) {
      syncSession(anchorWallet);
    }
  }, [connected, anchorWallet, syncSession]);

  if (status !== 'idle' && status !== 'crashed') return null;

  const isCrashed = status === 'crashed';
  const netChange = lastPayout - lastWager; 

  const adjustWager = (amount) => {
    const newWager = Math.min(500000, Math.max(500, wager + amount));
    setWager(newWager);
  };

  const handleConnect = () => {
    setVisible(true); 
  };

  const handleDeposit = () => {
    if (!anchorWallet) return;
    depositFunds(anchorWallet, depositAmount);
  };

  const handleWithdraw = () => {
    if (!anchorWallet) return;
    withdrawFunds(anchorWallet);
  };

  const withdrawLabel = balance > 0 ? 'WITHDRAW ALL FUNDS' : 'FINALIZE SESSION';
  const depositDisabled = needsFinalization;

  return (
    <div style={styles.overlay}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@800;900&family=Rajdhani:wght@500;700&display=swap');`}
      </style>
      
      <div style={styles.vignette} />
      
      <div style={{
        ...styles.contentWrapper, 
        filter: showHowToPlay ? 'blur(5px)' : 'none'
      }}>
        
        {/* --- HEADER --- */}
        <div style={styles.header}>
          <div style={styles.studioLabel}>
            WEAVE STUDIOS PRESENTS
          </div>
          <h1 style={styles.title}>STREAM<span style={{ color: '#00f6ff' }}>WEAVE</span></h1>
          <div style={styles.subtitle}>PROTOCOL V1.0 // SOLANA</div>
        </div>

        {/* CONTROLS CONTAINER */}
        <div style={styles.container}>
          
          {/* --- WALLET & STATS CARD --- */}
          <div style={styles.statsCard}>
            <div style={styles.row}>
              <span style={styles.label}>
                {connected ? 'OPERATOR ID' : 'SYSTEM STATUS'}
              </span>
              <span style={{...styles.value, color: connected ? '#fff' : '#888', fontSize: connected ? '0.9rem' : '1.2rem'}}>
                {connected ? publicKey.toBase58().slice(0, 4) + '....' + publicKey.toBase58().slice(-4) : 'DISCONNECTED'}
              </span>
            </div>

            <div style={styles.divider} />
            
            <div style={styles.row}>
              <span style={styles.label}>SESSION BALANCE</span>
              <span style={styles.value}>{balance.toLocaleString()} <span style={{fontSize:'0.8rem', color:'#00f6ff'}}>$WEAVE</span></span>
            </div>
            
            {/* Recent Run Stats */}
            {connected && isCrashed && (
              <>
                <div style={styles.divider} />
                <div style={styles.row}>
                  <span style={styles.label}>LAST SESSION</span>
                  <span style={{ ...styles.value, color: netChange >= 0 ? '#00ff88' : '#ff4444' }}>
                    {netChange > 0 ? '+' : ''}{netChange.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* --- MAIN INTERFACE (Only when connected) --- */}
          {connected ? (
            <>
              {/* --- BANKING PANEL (New) --- */}
              <div style={styles.bankingPanel}>
                <div style={styles.label}>SESSION BANK</div>

                {needsFinalization && (
                  <div style={{ ...styles.controlsFooter, marginBottom: '10px', color: '#ff4444' }}>
                    UNSETTLED ESCROW DETECTED — FINALIZE SESSION TO CONTINUE
                  </div>
                )}
                
                {/* Deposit Row */}
                <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px'}}>
                  <input 
                    type="number" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    style={styles.input}
                    disabled={depositDisabled}
                  />
                  <button onClick={handleDeposit} style={{...styles.actionBtn, opacity: depositDisabled ? 0.5 : 1}} disabled={depositDisabled}>
                    DEPOSIT
                  </button>
                </div>

                {/* Withdraw Row */}
                <button onClick={handleWithdraw} style={{...styles.actionBtn, width: '100%', borderColor: '#ff4444', color: '#ff4444'}}>
                  {withdrawLabel}
                </button>
              </div>

              {/* --- GAME WAGER CONTROLS --- */}
              <div style={styles.wagerControl}>
                <div style={styles.label}>SET WAGER ($WEAVE)</div>
                <div style={styles.wagerRow}>
                  <button onClick={() => adjustWager(-500)} style={styles.adjustBtn}>-</button>
                  <div style={styles.wagerDisplay}>{wager.toLocaleString()}</div>
                  <button onClick={() => adjustWager(500)} style={styles.adjustBtn}>+</button>
                </div>
                <div style={styles.sliderContainer}>
                  <input 
                    type="range" 
                    min="500" 
                    max="500000" 
                    step="500" 
                    value={wager}
                    onChange={(e) => setWager(parseInt(e.target.value))}
                    style={styles.slider}
                  />
                </div>
              </div>

              {/* --- START BUTTON --- */}
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

              {/* Disconnect Link */}
              <button 
                onClick={disconnect}
                style={{
                  background: 'none', border: 'none', color: '#444', 
                  fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.1em', marginTop: '5px'
                }}
              >
                [ DISCONNECT ]
              </button>
            </>
          ) : (
            /* --- DISCONNECTED STATE --- */
            <div style={styles.menuGroup}>
              <button
                onClick={handleConnect}
                onMouseEnter={() => setHoveredBtn('connect')}
                onMouseLeave={() => setHoveredBtn(null)}
                style={{
                  ...styles.button,
                  borderColor: '#9945FF', 
                  color: '#9945FF',
                  ...(hoveredBtn === 'connect' ? { background: 'rgba(153, 69, 255, 0.2)', color: '#fff' } : {})
                }}
              >
                <span style={{ position: 'relative', zIndex: 2 }}>
                  [ CONNECT WALLET ]
                </span>
              </button>
              <div style={{...styles.controlsFooter, marginTop: '15px'}}>
                 ACCESS THE STREAMWEAVE PROTOCOL
              </div>
            </div>
          )}

          {/* Footer Info */}
          {connected && (
             <div style={styles.controlsFooter}>
             <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textAlign: 'center', lineHeight: '1.6' }}>
               HOLD BOOST TO EARN • RELEASE TO BANK<br/>
               <span style={{color: '#ff4444'}}>FUEL DRAINS WHEN IDLE</span> • <span style={{color: '#00f6ff'}}>REGENS WHEN BOOSTING</span><br/>
               10s = 0.5x | 20s = 1.5x | 30s = 3.5x | 40s = 8.0x
             </div>
           </div>
          )}

          <button onClick={() => setShowHowToPlay(true)} style={styles.howToPlayLink}>
            [ MANUAL ]
          </button>
        </div>
      </div>

      {/* HOW TO PLAY MODAL */}
      {showHowToPlay && (
        <div style={styles.modalOverlay} onClick={() => setShowHowToPlay(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>PROTOCOL MANUAL</h2>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.instructionBlock}>
                <h3 style={{color: '#00f6ff'}}>OBJECTIVE</h3>
                <p>Wager <b>$WEAVE</b> tokens and pilot your interceptor. Your goal is to <b>BOOST</b> for as long as possible to build a multiplier, then <b>RELEASE</b> to bank your winnings before you crash.</p>
              </div>
              <div style={styles.instructionBlock}>
                <h3 style={{color: '#ff4444'}}>THE FUEL RULE (ANTI-CAMP)</h3>
                <p>You cannot fly safely forever. <b>Fuel drains rapidly while idle.</b><br/>You MUST boost to regenerate fuel. Camping = Death.</p>
              </div>
              <div style={styles.instructionBlock}>
                <h3 style={{color: '#d946ef'}}>PAYOUT TIERS</h3>
                <div style={styles.payoutTable}>
                  <div style={styles.payoutRow}><span>&lt; 10s</span> <span style={{color: '#ff4444'}}>0.0x (LOSS)</span></div>
                  <div style={styles.payoutRow}><span>10s+</span> <span style={{color: '#fff'}}>0.5x (SECURE)</span></div>
                  <div style={styles.payoutRow}><span>20s+</span> <span style={{color: '#00f6ff'}}>1.5x (PROFIT)</span></div>
                  <div style={styles.payoutRow}><span>30s+</span> <span style={{color: '#d946ef'}}>3.5x (MOON)</span></div>
                  <div style={styles.payoutRow}><span>40s+</span> <span style={{color: '#facc15'}}>8.0x (MARS)</span></div>
                  <div style={styles.payoutRow}><span>50s+</span> <span style={{color: '#ff0000'}}>20x (JACKPOT)</span></div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowHowToPlay(false)} style={styles.closeBtn}>
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}
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
  contentWrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '20px', width: '100%', transition: 'filter 0.3s ease',
  },
  header: { 
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', width: 'auto', maxWidth: '95vw',
  },
  studioLabel: {
    fontSize: '0.8rem', letterSpacing: '0.4em', color: '#888', marginBottom: '5px', fontWeight: '700'
  },
  title: {
    fontFamily: "'Orbitron', sans-serif", 
    fontSize: 'clamp(1.5rem, 9vw, 6rem)', 
    margin: 0, color: '#fff', letterSpacing: '0.05em', fontWeight: '900',
    textShadow: '0 0 30px rgba(0, 246, 255, 0.4)',
    whiteSpace: 'nowrap',
  },
  subtitle: { 
    color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5em', fontSize: '0.7rem', marginTop: '5px',
    fontWeight: '700', textShadow: '0 0 10px rgba(0,0,0,0.5)', textAlign: 'center'
  },
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '15px', width: '90%', maxWidth: '450px', 
  },
  statsCard: {
    background: 'rgba(0, 20, 40, 0.8)', border: '1px solid rgba(0, 246, 255, 0.2)',
    padding: '20px', borderRadius: '4px', width: '100%',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: '0.7rem', color: '#00f6ff', letterSpacing: '0.1em' },
  value: { fontSize: '1.2rem', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' },
  divider: { height: '1px', background: 'rgba(255,255,255,0.1)', width: '100%', margin: '5px 0' },
  
  // BANKING STYLES
  bankingPanel: {
    width: '100%', background: 'rgba(0, 40, 20, 0.6)', padding: '15px',
    border: '1px solid rgba(0, 255, 136, 0.3)', borderRadius: '4px',
    display: 'flex', flexDirection: 'column', gap: '5px'
  },
  input: {
    flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid #444',
    color: '#fff', padding: '10px', fontFamily: 'monospace', fontSize: '1rem',
    borderRadius: '4px'
  },
  actionBtn: {
    background: 'rgba(0, 255, 136, 0.1)', border: '1px solid #00ff88', color: '#00ff88',
    padding: '10px 15px', fontSize: '0.9rem', cursor: 'pointer',
    fontFamily: "'Rajdhani', sans-serif", fontWeight: 'bold', letterSpacing: '0.1em',
    borderRadius: '4px', transition: 'all 0.2s'
  },

  wagerControl: {
    width: '100%', background: 'rgba(0, 0, 0, 0.3)', padding: '15px',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px'
  },
  wagerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' },
  adjustBtn: {
    background: 'transparent', border: '1px solid #00f6ff', color: '#00f6ff',
    width: '30px', height: '30px', borderRadius: '4px', cursor: 'pointer', 
    fontSize: '1.2rem',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    padding: 0, lineHeight: 1, paddingBottom: '2px'
  },
  wagerDisplay: { 
    fontSize: 'clamp(1.2rem, 6vw, 1.5rem)', 
    fontFamily: 'monospace', color: '#fff' 
  },
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
  howToPlayLink: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
    fontSize: '0.9rem', cursor: 'pointer', marginTop: '10px',
    letterSpacing: '0.1em', transition: 'color 0.2s',
  },
  modalOverlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
  },
  modalContent: {
    background: 'rgba(10, 15, 30, 0.95)', border: '1px solid #00f6ff',
    width: '100%', maxWidth: '500px', borderRadius: '4px',
    padding: '0', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 30px rgba(0,246,255,0.2)',
    animation: 'slideUp 0.3s ease-out'
  },
  modalHeader: {
    padding: '15px', borderBottom: '1px solid rgba(0,246,255,0.3)',
    textAlign: 'center', background: 'rgba(0,246,255,0.1)'
  },
  modalBody: {
    padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px',
    maxHeight: '60vh', overflowY: 'auto'
  },
  instructionBlock: {
    fontSize: '0.9rem', lineHeight: '1.4', color: '#ccc'
  },
  payoutTable: {
    marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px',
    background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px'
  },
  payoutRow: {
    display: 'flex', justifyContent: 'space-between', 
    fontFamily: 'monospace', fontSize: '1rem'
  },
  closeBtn: {
    background: '#00f6ff', color: '#000', border: 'none',
    padding: '15px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
    letterSpacing: '0.1em', width: '100%'
  }
};

export default MainMenu;
