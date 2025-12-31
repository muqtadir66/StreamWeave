import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../stores/gameStore';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import HistoryModal from './HistoryModal';
import LeaderboardModal from './LeaderboardModal';

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
  const activeRoundId = useGameStore((s) => s.activeRoundId);

  const syncSession = useGameStore((s) => s.syncSession);
  const depositFunds = useGameStore((s) => s.depositFunds);
  const withdrawFunds = useGameStore((s) => s.withdrawFunds);
  const abortActiveRound = useGameStore((s) => s.abortActiveRound);
  const withdrawInFlight = useGameStore((s) => s.withdrawInFlight);

  // [NEW] Audio Store Hooks
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);

  const walletCtx = useWallet();
  const { connected, publicKey, disconnect } = walletCtx;
  const { setVisible } = useWalletModal();
  const navigate = useNavigate();

  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [depositAmount, setDepositAmount] = useState(1000);

  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (!connected || !walletCtx?.publicKey) return;
    syncSession(walletCtx, { interactive: true });

    const interval = setInterval(() => {
      const st = useGameStore.getState().status;
      if (st === 'running') return;
      syncSession(walletCtx, { interactive: false });
    }, 4000);
    return () => clearInterval(interval);
  }, [connected, publicKey?.toBase58(), syncSession]);

  useEffect(() => {
    if (status === 'crashed') {
      setMenuVisible(false);
      const timer = setTimeout(() => setMenuVisible(true), 1500);
      return () => clearTimeout(timer);
    } else if (status === 'idle') {
      setMenuVisible(true);
    } else {
      setMenuVisible(false);
    }
  }, [status]);

  if ((status !== 'idle' && status !== 'crashed') || !menuVisible) return null;

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
    if (!walletCtx?.publicKey) return;
    depositFunds(walletCtx, depositAmount);
  };

  const handleWithdraw = () => {
    if (!walletCtx?.publicKey) return;
    withdrawFunds(walletCtx);
  };

  const handleClearRound = async () => {
    try {
      if (!walletCtx?.publicKey) return;
      await abortActiveRound(walletCtx);
    } catch (e) {
      alert(e.message || String(e));
    }
  };

  const withdrawLabel = balance > 0 ? 'WITHDRAW ALL FUNDS' : 'FINALIZE SESSION';
  const depositDisabled = needsFinalization || !!activeRoundId;
  const playDisabled = needsFinalization || !!activeRoundId;
  const withdrawDisabled = !!activeRoundId || !!withdrawInFlight;
  const withdrawText = withdrawInFlight ? 'WITHDRAWING…' : withdrawLabel;

  return (
    <div style={styles.overlay}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@800;900&family=Rajdhani:wght@500;700&display=swap');`}
      </style>

      <div style={{
        ...styles.contentWrapper,
        justifyContent: connected ? 'flex-start' : 'center',
        filter: showHowToPlay ? 'blur(5px)' : 'none',
        animation: 'fadeIn 0.5s ease-out',
        opacity: 1
      }}>
        <style>
          {`@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}
        </style>

        {/* --- PORTAL BACK BUTTON --- */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 12px)',
            left: '16px',
            background: 'rgba(0, 20, 40, 0.8)',
            border: '1px solid rgba(0, 246, 255, 0.3)',
            color: 'rgba(0, 246, 255, 0.8)',
            padding: '8px 16px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 10,
          }}
        >
          ← PORTAL
        </button>

        {/* --- HEADER --- */}
        <div style={styles.header}>
          <div style={styles.studioLabel}>
            WEAVE STUDIOS PRESENTS
          </div>
          <h1 style={styles.title}>STREAM<span style={{ color: '#00f6ff' }}>WEAVE</span></h1>
          <div style={styles.subtitle}>WEAVE REWARD PROTOCOL // SOLANA</div>

          {/* [NEW] Main Menu Sound Toggle */}
          <button
            onClick={toggleSound}
            style={{
              marginTop: '10px',
              background: 'rgba(0, 246, 255, 0.05)',
              border: '1px solid rgba(0, 246, 255, 0.3)',
              color: soundEnabled ? '#00ff88' : '#888',
              cursor: 'pointer', padding: '6px 14px', borderRadius: '4px',
              fontFamily: 'monospace', fontSize: '0.8rem', letterSpacing: '0.1em'
            }}
          >
            AUDIO: {soundEnabled ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        {/* CONTROLS CONTAINER */}
        <div style={styles.container}>

          {/* --- WALLET & STATS CARD --- */}
          <div style={styles.statsCard}>
            <div style={styles.row}>
              <span style={styles.label}>
                {connected ? 'OPERATOR ID' : 'SYSTEM STATUS'}
              </span>
              <span style={{ ...styles.value, color: connected ? '#fff' : '#888', fontSize: connected ? '0.9rem' : '1.2rem' }}>
                {connected ? publicKey.toBase58().slice(0, 4) + '....' + publicKey.toBase58().slice(-4) : 'DISCONNECTED'}
              </span>
            </div>

            <div style={styles.divider} />

            <div style={styles.row}>
              <span style={styles.label}>SESSION BALANCE</span>
              <span style={styles.value}>{balance.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#00f6ff' }}>$WEAVE</span></span>
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

                {!!activeRoundId && (
                  <div style={{ ...styles.controlsFooter, marginBottom: '10px', color: '#ffcc00' }}>
                    ROUND IN PROGRESS (ANOTHER DEVICE OR PENDING SETTLEMENT)
                  </div>
                )}

                {/* Deposit Row */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    style={styles.input}
                    disabled={depositDisabled}
                  />
                  <button
                    onPointerUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeposit();
                    }}
                    style={{ ...styles.actionBtn, opacity: depositDisabled ? 0.5 : 1 }}
                    disabled={depositDisabled}
                  >
                    DEPOSIT
                  </button>
                </div>

                {/* Withdraw Row */}
                <button
                  onPointerUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWithdraw();
                  }}
                  disabled={withdrawDisabled}
                  style={{
                    ...styles.actionBtn,
                    width: '100%',
                    borderColor: '#ff4444',
                    color: '#ff4444',
                    opacity: withdrawDisabled ? 0.5 : 1,
                  }}
                >
                  {withdrawText}
                </button>

                {!!activeRoundId && (
                  <button
                    onPointerUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClearRound();
                    }}
                    style={{
                      ...styles.actionBtn,
                      width: '100%',
                      borderColor: '#ffcc00',
                      color: '#ffcc00',
                      background: 'rgba(255, 204, 0, 0.08)',
                    }}
                  >
                    CLEAR STUCK ROUND
                  </button>
                )}
              </div>

              {/* --- GAME WAGER CONTROLS --- */}
              <div style={styles.wagerControl}>
                <div style={styles.label}>SET WAGER ($WEAVE)</div>
                <div style={styles.wagerRow}>
                  <button
                    onPointerUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      adjustWager(-500);
                    }}
                    style={styles.adjustBtn}
                  >
                    -
                  </button>
                  <div style={styles.wagerDisplay}>{wager.toLocaleString()}</div>
                  <button
                    onPointerUp={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      adjustWager(500);
                    }}
                    style={styles.adjustBtn}
                  >
                    +
                  </button>
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
                  onPointerUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    start(walletCtx);
                  }}
                  onMouseEnter={() => setHoveredBtn('start')}
                  onMouseLeave={() => setHoveredBtn(null)}
                  disabled={playDisabled || balance < wager}
                  style={{
                    ...styles.button,
                    ...(hoveredBtn === 'start' ? styles.buttonHover : {}),
                    opacity: playDisabled || balance < wager ? 0.5 : 1
                  }}
                >
                  <div style={styles.btnGlitch} />
                  <span style={{ position: 'relative', zIndex: 2 }}>
                    {playDisabled ? 'FINALIZE/WAIT' : (balance < wager ? 'INSUFFICIENT FUNDS' : 'INITIATE RUN')}
                  </span>
                </button>
              </div>

              {/* Quick actions */}
              <div style={styles.quickActionsRow}>
                <button
                  onPointerUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowHistory(true);
                  }}
                  style={styles.quickActionBtn}
                >
                  HISTORY
                </button>
                <button
                  onPointerUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLeaderboard(true);
                  }}
                  style={styles.quickActionBtn}
                >
                  LEADERBOARD
                </button>
              </div>

              {/* Disconnect Link */}
              <button
                onPointerUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  disconnect();
                }}
                style={{
                  background: 'none', border: 'none', color: '#444',
                  fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.1em', marginTop: '2px'
                }}
              >
                [ DISCONNECT ]
              </button>
            </>
          ) : (
            /* --- DISCONNECTED STATE --- */
            <div style={styles.menuGroup}>
              <button
                onPointerUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConnect();
                }}
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
              <div style={{ ...styles.controlsFooter, marginTop: '15px' }}>
                ACCESS THE STREAMWEAVE PROTOCOL
              </div>
            </div>
          )}

          <button
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowHowToPlay(true);
            }}
            style={styles.howToPlayLink}
          >
            [ HOW TO PLAY ]
          </button>

          {/* Footer Info */}
          {connected && (
            <div style={styles.controlsFooter}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', textAlign: 'center', lineHeight: '1.6' }}>
                HOLD BOOST TO EARN • RELEASE TO BANK<br />
                <span style={{ color: '#ff4444' }}>FUEL DRAINS WHEN IDLE</span> • <span style={{ color: '#00f6ff' }}>REGENS WHEN BOOSTING</span><br />
                10s = 0.5x | 20s = 1.5x | 30s = 3.5x | 40s = 8.0x | 50s = 20x
              </div>
            </div>
          )}
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
                <h3 style={{ color: '#00f6ff' }}>OBJECTIVE</h3>
                <p>Wager <b>$WEAVE</b> tokens and pilot your interceptor. Your goal is to <b>BOOST</b> for as long as possible to build a multiplier, then <b>RELEASE</b> to bank your winnings before you crash.</p>
              </div>
              <div style={styles.instructionBlock}>
                <h3 style={{ color: '#ff4444' }}>THE FUEL RULE (ANTI-CAMP)</h3>
                <p>You cannot fly safely forever. <b>Fuel drains rapidly while idle.</b><br />You MUST boost to regenerate fuel. Camping = Death.</p>
              </div>
              <div style={styles.instructionBlock}>
                <h3 style={{ color: '#d946ef' }}>PAYOUT TIERS</h3>
                <div style={styles.payoutTable}>
                  <div style={styles.payoutRow}><span>&lt; 10s</span> <span style={{ color: '#ff4444' }}>0.0x (LOSS)</span></div>
                  <div style={styles.payoutRow}><span>10s+</span> <span style={{ color: '#fff' }}>0.5x (SECURE)</span></div>
                  <div style={styles.payoutRow}><span>20s+</span> <span style={{ color: '#00f6ff' }}>1.5x (PROFIT)</span></div>
                  <div style={styles.payoutRow}><span>30s+</span> <span style={{ color: '#d946ef' }}>3.5x (MOON)</span></div>
                  <div style={styles.payoutRow}><span>40s+</span> <span style={{ color: '#facc15' }}>8.0x (MARS)</span></div>
                  <div style={styles.payoutRow}><span>50s+</span> <span style={{ color: '#ff0000' }}>20x (JACKPOT)</span></div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowHowToPlay(false)} style={styles.closeBtn}>
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}

      <HistoryModal
        open={showHistory}
        onClose={() => setShowHistory(false)}
        walletCtx={walletCtx}
      />
      <LeaderboardModal
        open={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
    paddingTop: 'calc(clamp(10px, 2vh, 20px) + env(safe-area-inset-top))',
    paddingBottom: 'env(safe-area-inset-bottom)',
    fontFamily: "'Rajdhani', 'Segoe UI', sans-serif", perspective: '1000px',
    background: 'radial-gradient(circle at center, rgba(10,10,20,0.85) 0%, rgba(0,0,0,0.98) 100%)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
  },
  contentWrapper: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 'clamp(10px, 2vh, 18px)',
    width: '100%',
    transition: 'filter 0.3s ease',
    minHeight: 'calc(100vh - 24px)',
  },
  header: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', width: 'auto', maxWidth: '95vw',
  },
  studioLabel: {
    fontSize: '0.75rem', letterSpacing: '0.35em', color: '#888', marginBottom: '2px', fontWeight: '700'
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 'clamp(1.5rem, 8vw, 5.2rem)',
    margin: 0, color: '#fff', letterSpacing: '0.05em', fontWeight: '900',
    textShadow: '0 0 30px rgba(0, 246, 255, 0.4)',
    whiteSpace: 'nowrap',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)', letterSpacing: '0.45em', fontSize: '0.68rem', marginTop: '2px',
    fontWeight: '700', textShadow: '0 0 10px rgba(0,0,0,0.5)', textAlign: 'center'
  },
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 'clamp(10px, 1.6vh, 14px)', width: 'min(450px, 92vw)',
  },
  quickActionsRow: {
    width: '100%',
    display: 'flex',
    gap: '10px',
    justifyContent: 'space-between',
  },
  quickActionBtn: {
    flex: 1,
    background: 'rgba(0, 246, 255, 0.06)',
    border: '1px solid rgba(0, 246, 255, 0.25)',
    color: 'rgba(0, 246, 255, 0.9)',
    padding: '10px 12px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: '700',
    letterSpacing: '0.12em',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  statsCard: {
    background: 'rgba(0, 20, 40, 0.8)', border: '1px solid rgba(0, 246, 255, 0.2)',
    padding: 'clamp(12px, 1.8vh, 18px)', borderRadius: '4px', width: '100%',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: '0.7rem', color: '#00f6ff', letterSpacing: '0.1em' },
  value: { fontSize: '1.2rem', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' },
  divider: { height: '1px', background: 'rgba(255,255,255,0.1)', width: '100%', margin: '5px 0' },

  // BANKING STYLES
  bankingPanel: {
    width: '100%', background: 'rgba(0, 40, 20, 0.6)', padding: 'clamp(12px, 1.6vh, 15px)',
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
    padding: '9px 14px', fontSize: '0.9rem', cursor: 'pointer',
    fontFamily: "'Rajdhani', sans-serif", fontWeight: 'bold', letterSpacing: '0.1em',
    borderRadius: '4px', transition: 'all 0.2s'
  },

  wagerControl: {
    width: '100%', background: 'rgba(0, 0, 0, 0.3)', padding: 'clamp(12px, 1.6vh, 15px)',
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
    padding: '13px 0', fontSize: '1.05rem', letterSpacing: '0.2em', cursor: 'pointer',
    width: '100%', textAlign: 'center', transition: 'all 0.3s',
  },
  buttonHover: { background: 'rgba(0, 246, 255, 0.3)', borderColor: '#00f6ff', letterSpacing: '0.3em' },
  controlsFooter: { marginTop: '4px', opacity: 0.8, textAlign: 'center' },
  howToPlayLink: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
    fontSize: '0.9rem', cursor: 'pointer', marginTop: '4px',
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