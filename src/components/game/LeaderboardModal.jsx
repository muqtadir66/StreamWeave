import React, { useEffect, useMemo, useState } from 'react';

const LeaderboardModal = ({ open, onClose }) => {
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
        const res = await fetch(`${baseUrl}/.netlify/functions/leaderboard`, { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to load leaderboard');
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
  }, [open, baseUrl]);

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
          <div style={styles.title}>TOP SINGLE-ROUND WINS</div>
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
          {status === 'ready' && items.length === 0 && <div style={styles.muted}>No data yet.</div>}

          {status === 'ready' && items.length > 0 && (
            <div style={styles.table}>
              {items.map((r, idx) => {
                const wager = Number(r.wagerUi || 0);
                const payout = Number(r.payoutUi || 0);
                return (
                  <div key={`${r.wallet}-${r.endedAt}-${idx}`} style={styles.row}>
                    <div style={styles.rank}>#{idx + 1}</div>
                    <div style={styles.main}>
                      <div style={styles.primary}>
                        <span style={{ color: '#00f6ff' }}>{r.wallet}</span> •{' '}
                        <span style={{ color: '#00ff88' }}>{payout.toLocaleString()}</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}> return</span>
                      </div>
                      <div style={styles.secondary}>
                        WAGER {wager.toLocaleString()} • MULT {Number(r.multiplier || 0).toFixed(1)}x
                      </div>
                    </div>
                    <div style={styles.time}>{r.endedAt ? new Date(r.endedAt).toLocaleString() : ''}</div>
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
    maxWidth: '640px',
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
  table: { display: 'flex', flexDirection: 'column', gap: '10px' },
  row: {
    display: 'grid',
    gridTemplateColumns: '48px 1fr',
    gap: '10px',
    alignItems: 'center',
    padding: '12px',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
  },
  rank: {
    color: '#facc15',
    fontFamily: 'monospace',
    fontWeight: 700,
    textAlign: 'center',
  },
  main: { display: 'flex', flexDirection: 'column', gap: '4px' },
  primary: { color: '#fff', fontFamily: 'monospace', fontSize: '1rem' },
  secondary: { color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: '0.8rem' },
  time: {
    gridColumn: '2 / 3',
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
  },
};

export default LeaderboardModal;
