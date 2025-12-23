import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

const HistoryModal = ({ open, onClose, walletCtx }) => {
  const ensureSession = useGameStore((s) => s.ensureSession);
  const sessionToken = useGameStore((s) => s.sessionToken);

  const [status, setStatus] = useState('idle'); // idle|loading|error|ready
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  const baseUrl = useMemo(() => {
    const envUrl = import.meta.env.VITE_FUNCTIONS_BASE_URL;
    if (envUrl) return envUrl;
    return import.meta.env.DEV ? 'http://localhost:8888' : '';
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      try {
        setStatus('loading');
        setError(null);

        let token = sessionToken;
        if (!token) {
          if (!walletCtx?.publicKey) throw new Error('Connect wallet first');
          token = await ensureSession(walletCtx);
        }

        const res = await fetch(`${baseUrl}/.netlify/functions/history`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load history');

        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setError(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, baseUrl, ensureSession, sessionToken, walletCtx]);

  if (!open) return null;

  return (
    <div
      style={styles.overlay}
      onPointerDown={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        style={styles.card}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div style={styles.header}>
          <div style={styles.title}>ROUND HISTORY</div>
          <button
            style={styles.close}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.blur();
              onClose();
            }}
          >
            ✕
          </button>
        </div>

        <div style={styles.body}>
          {status === 'loading' && <div style={styles.muted}>Loading…</div>}
          {status === 'error' && <div style={{ ...styles.muted, color: '#ff6666' }}>{error}</div>}

          {status === 'ready' && items.length === 0 && <div style={styles.muted}>No rounds yet.</div>}

          {status === 'ready' && items.length > 0 && (
            <div style={styles.table}>
              {items.map((r) => {
                const wager = Number(r.wagerUi || 0);
                const payout = Number(r.payoutUi || 0);
                const net = payout - wager;
                const netColor = net >= 0 ? '#00ff88' : '#ff4444';
                return (
                  <div key={r.id} style={styles.row}>
                    <div style={styles.left}>
                      <div style={styles.primary}>
                        {wager.toLocaleString()} →{' '}
                        <span style={{ color: netColor }}>{payout.toLocaleString()}</span>
                      </div>
                      <div style={styles.secondary}>
                        MULT {Number(r.multiplier || 0).toFixed(1)}x • NET{' '}
                        <span style={{ color: netColor }}>{net > 0 ? '+' : ''}{net.toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={styles.right}>
                      {r.endedAt ? new Date(r.endedAt).toLocaleString() : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2500,
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '18px',
  },
  card: {
    width: '100%',
    maxWidth: '560px',
    background: 'rgba(10, 15, 30, 0.95)',
    border: '1px solid rgba(0, 246, 255, 0.35)',
    borderRadius: '6px',
    overflow: 'hidden',
    boxShadow: '0 0 30px rgba(0,246,255,0.18)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 14px',
    background: 'rgba(0,246,255,0.08)',
    borderBottom: '1px solid rgba(0,246,255,0.2)',
  },
  title: {
    fontFamily: "'Rajdhani', sans-serif",
    letterSpacing: '0.18em',
    fontWeight: 800,
    color: '#00f6ff',
    fontSize: '0.95rem',
  },
  close: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.25)',
    color: 'rgba(255,255,255,0.8)',
    borderRadius: '6px',
    width: '34px',
    height: '34px',
    cursor: 'pointer',
    fontSize: '14px',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  body: {
    padding: '14px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  muted: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  row: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    padding: '12px',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
  },
  left: { display: 'flex', flexDirection: 'column', gap: '4px' },
  primary: { color: '#fff', fontFamily: 'monospace', fontSize: '1rem' },
  secondary: { color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: '0.8rem' },
  right: { color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', fontSize: '0.75rem', textAlign: 'right' },
};

export default HistoryModal;
