import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useGridStore } from '../stores/gridStore';

import GridCanvas from '../components/grid/GridCanvas';
import GridTicker from '../components/grid/GridTicker';
import GridControls from '../components/grid/GridControls';
import BlockPurchaseModal from '../components/grid/BlockPurchaseModal';

/**
 * Grid Page - The Weave Digital Billboard
 * Uses flex layout to ensure canvas fills available space
 */
function Grid() {
    const navigate = useNavigate();
    const { connected, publicKey } = useWallet();
    const { setVisible } = useWalletModal();

    const selectedBlocks = useGridStore(s => s.selectedBlocks);
    const blocks = useGridStore(s => s.blocks);
    const getSelectionInfo = useGridStore(s => s.getSelectionInfo);
    const openPurchaseModal = useGridStore(s => s.openPurchaseModal);
    const clearSelection = useGridStore(s => s.clearSelection);
    const mode = useGridStore(s => s.mode);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const selectionInfo = getSelectionInfo();
    const hasSelection = selectedBlocks.size > 0;
    const claimedCount = blocks.size;
    const availableCount = 10000 - claimedCount;

    return (
        <div style={styles.page}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&family=Rajdhani:wght@500;600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        html,body,#root { margin:0; padding:0; overflow:hidden; width:100%; height:100%; }
      `}</style>

            {/* Header */}
            <header style={styles.header}>
                <button onClick={() => navigate('/')} style={styles.backBtn}>
                    ← {!isMobile && 'PORTAL'}
                </button>

                <h1 style={styles.title}>
                    THE <span style={{ color: '#ffcc00' }}>WEAVE</span>
                </h1>

                <div style={styles.statusBadge}>
                    <span style={styles.dot} />
                    {isMobile ? 'INIT' : 'INITIALIZING'}
                </div>

                {connected ? (
                    <div style={styles.wallet}>
                        {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                    </div>
                ) : (
                    <button onClick={() => setVisible(true)} style={styles.connectBtn}>
                        {isMobile ? '◈' : 'CONNECT'}
                    </button>
                )}
            </header>

            {/* Ticker - desktop only */}
            {!isMobile && <GridTicker />}

            {/* Canvas Container - fills remaining space */}
            <main style={styles.main}>
                <GridCanvas />
                <GridControls />

                <div style={styles.hint}>
                    {isMobile ? 'Tap to select • Pinch to zoom' : 'Drag to select • Scroll to zoom'}
                </div>
            </main>

            {/* Bottom Bar */}
            <footer style={styles.footer}>
                {hasSelection && selectionInfo ? (
                    <div style={styles.selectionBar}>
                        <div style={styles.infoGroup}>
                            <div style={styles.infoItem}>
                                <span style={styles.label}>BLOCKS</span>
                                <span style={styles.value}>{selectionInfo.count}</span>
                            </div>
                            <span style={styles.sep} />
                            <div style={styles.infoItem}>
                                <span style={styles.label}>SIZE</span>
                                <span style={styles.value}>{selectionInfo.dimensions.width}×{selectionInfo.dimensions.height}</span>
                            </div>
                            <span style={styles.sep} />
                            <div style={styles.infoItem}>
                                <span style={styles.label}>COORD</span>
                                <span style={styles.value}>({selectionInfo.coordinates.x},{selectionInfo.coordinates.y})</span>
                            </div>
                            <span style={styles.sep} />
                            <div style={styles.infoItem}>
                                <span style={styles.label}>UNCLAIMED</span>
                                <span style={styles.value}>{selectionInfo.unclaimedCount}</span>
                            </div>
                            <span style={styles.sep} />
                            <div style={styles.infoItem}>
                                <span style={styles.label}>TAKEOVERS</span>
                                <span style={{ ...styles.value, color: selectionInfo.ownedCount > 0 ? '#ff4444' : '#666' }}>
                                    {selectionInfo.ownedCount}
                                </span>
                            </div>
                            <span style={styles.sep} />
                            <div style={styles.infoItem}>
                                <span style={styles.label}>EST. PRICE</span>
                                <span style={{ ...styles.value, color: '#00ff88', fontSize: '1rem' }}>
                                    {selectionInfo.totalPrice.toLocaleString()} <span style={{ fontSize: '0.6rem' }}>$WEAVE</span>
                                </span>
                            </div>
                        </div>

                        <div style={styles.btnGroup}>
                            <button onClick={clearSelection} style={styles.clearBtn}>CLEAR</button>
                            <button onClick={openPurchaseModal} style={styles.claimBtn}>CLAIM</button>
                        </div>
                    </div>
                ) : (
                    <div style={styles.statsBar}>
                        <div style={styles.stat}><span style={styles.statLabel}>TOTAL</span><span style={styles.statVal}>10,000</span></div>
                        <span style={styles.sep} />
                        <div style={styles.stat}><span style={styles.statLabel}>CLAIMED</span><span style={{ ...styles.statVal, color: '#00ff88' }}>{claimedCount}</span></div>
                        <span style={styles.sep} />
                        <div style={styles.stat}><span style={styles.statLabel}>AVAILABLE</span><span style={{ ...styles.statVal, color: '#00f6ff' }}>{availableCount.toLocaleString()}</span></div>
                        <span style={styles.sep} />
                        <div style={styles.stat}><span style={styles.statLabel}>FLOOR</span><span style={styles.statVal}>1,000 <span style={{ color: '#00f6ff', fontSize: '0.6rem' }}>$WEAVE</span></span></div>
                    </div>
                )}
            </footer>

            <BlockPurchaseModal />
        </div>
    );
}



const styles = {
    page: {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#050510',
        fontFamily: "'Rajdhani', sans-serif",
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        background: 'rgba(0,5,15,0.98)',
        borderBottom: '1px solid rgba(0,246,255,0.15)',
        flexShrink: 0,
        minHeight: '48px',
    },
    backBtn: {
        background: 'rgba(0,20,40,0.8)',
        border: '1px solid rgba(0,246,255,0.3)',
        color: '#00f6ff',
        padding: '6px 12px',
        fontSize: '0.7rem',
        cursor: 'pointer',
        fontFamily: "'Rajdhani',sans-serif",
        fontWeight: 700,
    },
    title: {
        fontFamily: "'Orbitron',sans-serif",
        fontSize: '1.1rem',
        fontWeight: 800,
        color: '#fff',
        margin: 0,
        flex: 1,
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: 'rgba(255,204,0,0.1)',
        border: '1px solid rgba(255,204,0,0.4)',
        color: '#ffcc00',
        fontSize: '0.65rem',
        fontWeight: 700,
    },
    dot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#ffcc00',
        animation: 'pulse 2s infinite',
    },
    wallet: {
        fontFamily: 'monospace',
        fontSize: '0.7rem',
        color: '#00ff88',
        padding: '4px 10px',
        background: 'rgba(0,255,136,0.1)',
        border: '1px solid rgba(0,255,136,0.3)',
    },
    connectBtn: {
        background: 'rgba(153,69,255,0.1)',
        border: '1px solid #9945FF',
        color: '#9945FF',
        padding: '6px 14px',
        fontSize: '0.7rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: "'Rajdhani',sans-serif",
    },
    main: {
        flex: 1,
        position: 'relative',
        minHeight: 0, // Important for flex child to shrink
    },
    hint: {
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)',
        padding: '6px 14px',
        borderRadius: '16px',
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.4)',
        pointerEvents: 'none',
        zIndex: 40,
    },
    footer: {
        flexShrink: 0,
        background: 'rgba(0,5,15,0.98)',
        borderTop: '1px solid rgba(0,246,255,0.15)',
        padding: '10px 12px',
        minHeight: '56px',
    },
    statsBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        flexWrap: 'wrap',
    },
    stat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    statLabel: { fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' },
    statVal: { fontSize: '0.85rem', fontWeight: 700, color: '#fff' },
    sep: { width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' },
    selectionBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
    },
    infoGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        flex: 1,
    },
    infoItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    label: { fontSize: '0.5rem', color: 'rgba(0,246,255,0.7)', letterSpacing: '0.1em' },
    value: { fontSize: '0.8rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' },
    btnGroup: { display: 'flex', gap: '8px', flexShrink: 0 },
    clearBtn: {
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: 'rgba(255,255,255,0.5)',
        padding: '8px 16px',
        fontSize: '0.75rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: "'Rajdhani',sans-serif",
    },
    claimBtn: {
        background: 'linear-gradient(135deg, rgba(0,246,255,0.2), rgba(0,246,255,0.1))',
        border: '1px solid #00f6ff',
        color: '#00f6ff',
        padding: '8px 20px',
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: "'Rajdhani',sans-serif",
    },
};

export default Grid;
