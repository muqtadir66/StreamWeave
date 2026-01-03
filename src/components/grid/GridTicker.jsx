import React, { useEffect, useState, useRef } from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridTicker - Scrolling news bar showing live takeover events
 * Displays real-time block acquisitions in marquee format
 */
function GridTicker() {
    const recentTakeovers = useGridStore(s => s.recentTakeovers);
    const [tickerItems, setTickerItems] = useState([]);
    const tickerRef = useRef(null);

    // Format time ago
    const formatTimeAgo = (timestamp) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    // Update ticker items
    useEffect(() => {
        const items = recentTakeovers.map(takeover => ({
            id: takeover.id,
            text: `${takeover.wallet} seized Block #${takeover.blockId} for ${takeover.price.toLocaleString()} WEAVE`,
            time: formatTimeAgo(takeover.timestamp),
        }));
        setTickerItems(items);
    }, [recentTakeovers]);

    // Refresh time displays
    useEffect(() => {
        const interval = setInterval(() => {
            setTickerItems(prev => prev.map(item => {
                const takeover = recentTakeovers.find(t => t.id === item.id);
                if (takeover) {
                    return { ...item, time: formatTimeAgo(takeover.timestamp) };
                }
                return item;
            }));
        }, 10000);
        return () => clearInterval(interval);
    }, [recentTakeovers]);

    if (tickerItems.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.label}>LIVE FEED</div>
                <div style={styles.emptyMessage}>Awaiting territorial activity...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.label}>
                <span style={styles.liveDot} />
                LIVE
            </div>
            <div style={styles.tickerWrapper}>
                <div style={styles.ticker} ref={tickerRef}>
                    {/* Duplicate items for seamless loop */}
                    {[...tickerItems, ...tickerItems].map((item, idx) => (
                        <span key={`${item.id}-${idx}`} style={styles.tickerItem}>
                            <span style={styles.tickerText}>{item.text}</span>
                            <span style={styles.tickerTime}>{item.time}</span>
                            <span style={styles.separator}>•</span>
                        </span>
                    ))}
                </div>
            </div>
            <style>
                {`
          @keyframes ticker-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}
            </style>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(10, 8, 5, 0.95)',
        borderBottom: '1px solid rgba(255, 204, 0, 0.2)',
        padding: '10px 16px',
        overflow: 'hidden',
        fontFamily: "'Rajdhani', sans-serif",
    },
    label: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        background: 'rgba(255, 68, 68, 0.15)',
        border: '1px solid rgba(255, 68, 68, 0.4)',
        borderRadius: '4px',
        color: '#ff4444',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        flexShrink: 0,
        marginRight: '16px',
    },
    liveDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#ff4444',
        animation: 'pulse 1.5s infinite',
    },
    tickerWrapper: {
        flex: 1,
        overflow: 'hidden',
        maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
    },
    ticker: {
        display: 'flex',
        whiteSpace: 'nowrap',
        animation: 'ticker-scroll 30s linear infinite',
    },
    tickerItem: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 12px',
    },
    tickerText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '0.85rem',
        fontWeight: 600,
    },
    tickerTime: {
        color: 'rgba(255, 204, 0, 0.7)',
        fontSize: '0.75rem',
        fontWeight: 500,
    },
    separator: {
        color: 'rgba(255, 255, 255, 0.3)',
        marginLeft: '8px',
    },
    emptyMessage: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.8rem',
        fontStyle: 'italic',
    },
};

export default GridTicker;