import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

import GridCanvas from '../components/grid/GridCanvas';
import GridTicker from '../components/grid/GridTicker';
import GridInspector from '../components/grid/GridInspector';
import GridControls from '../components/grid/GridControls';
import BlockPurchaseModal from '../components/grid/BlockPurchaseModal';

/**
 * Grid Page - The Weave Digital Billboard
 * A tactical war room for digital real estate
 */
function Grid() {
    const navigate = useNavigate();
    const { connected, publicKey, disconnect } = useWallet();
    const { setVisible } = useWalletModal();

    return (
        <div style={styles.container}>
            {/* Load fonts */}
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Rajdhani:wght@500;600;700&display=swap');`}
                {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
            </style>

            {/* Top Navigation Bar */}
            <header style={styles.header}>
                <div style={styles.headerLeft}>
                    <button onClick={() => navigate('/')} style={styles.backBtn}>
                        ← PORTAL
                    </button>
                    <div style={styles.logoSection}>
                        <h1 style={styles.logo}>THE <span style={{ color: '#ffcc00' }}>WEAVE</span></h1>
                        <div style={styles.subtitle}>DIGITAL TERRITORY PROTOCOL</div>
                    </div>
                </div>

                <div style={styles.headerCenter}>
                    {/* Status indicator */}
                    <div style={styles.statusBadge}>
                        <span style={styles.statusDot} />
                        INITIALIZING
                    </div>
                </div>

                <div style={styles.headerRight}>
                    {connected ? (
                        <div style={styles.walletInfo}>
                            <span style={styles.walletAddress}>
                                {publicKey?.toBase58().slice(0, 4)}....{publicKey?.toBase58().slice(-4)}
                            </span>
                            <button onClick={disconnect} style={styles.disconnectBtn}>
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setVisible(true)} style={styles.connectBtn}>
                            CONNECT WALLET
                        </button>
                    )}
                </div>
            </header>

            {/* Ticker */}
            <GridTicker />

            {/* Main Content */}
            <div style={styles.main}>
                {/* Canvas Area */}
                <div style={styles.canvasWrapper}>
                    <GridCanvas />
                    <GridControls />

                    {/* Keyboard hints */}
                    <div style={styles.hints}>
                        Drag to pan • Scroll to zoom • Click to select • Ctrl+Click for multi-select
                    </div>
                </div>

                {/* Inspector Sidebar */}
                <GridInspector />
            </div>

            {/* Purchase Modal */}
            <BlockPurchaseModal />

            {/* Protocol Stats Footer */}
            <footer style={styles.footer}>
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>TOTAL BLOCKS</span>
                    <span style={styles.statValue}>10,000</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>CLAIMED</span>
                    <span style={{ ...styles.statValue, color: '#00ff88' }}>11</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>AVAILABLE</span>
                    <span style={{ ...styles.statValue, color: '#00f6ff' }}>9,989</span>
                </div>
                <div style={styles.statDivider} />
                <div style={styles.statItem}>
                    <span style={styles.statLabel}>FLOOR PRICE</span>
                    <span style={styles.statValue}>1,000 <span style={{ fontSize: '0.7rem', color: '#00f6ff' }}>$WEAVE</span></span>
                </div>
            </footer>
        </div>
    );
}

const styles = {
    container: {
        width: '100vw',
        height: '100vh',
        background: '#0a0a14',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Rajdhani', sans-serif",
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'rgba(0, 10, 20, 0.95)',
        borderBottom: '1px solid rgba(0, 246, 255, 0.15)',
        flexShrink: 0,
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    backBtn: {
        background: 'none',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: 'rgba(255, 255, 255, 0.7)',
        padding: '8px 14px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        borderRadius: '4px',
        fontFamily: "'Rajdhani', sans-serif",
        transition: 'all 0.2s',
    },
    logoSection: {
        display: 'flex',
        flexDirection: 'column',
    },
    logo: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1.4rem',
        fontWeight: 800,
        color: '#fff',
        margin: 0,
        letterSpacing: '0.05em',
        textShadow: '0 0 20px rgba(255, 204, 0, 0.4)',
    },
    subtitle: {
        fontSize: '0.6rem',
        color: 'rgba(255, 204, 0, 0.7)',
        letterSpacing: '0.25em',
        marginTop: '2px',
    },
    headerCenter: {
        display: 'flex',
        alignItems: 'center',
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        background: 'rgba(255, 204, 0, 0.1)',
        border: '1px solid rgba(255, 204, 0, 0.4)',
        borderRadius: '4px',
        color: '#ffcc00',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
    },
    statusDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#ffcc00',
        animation: 'pulse 2s infinite',
    },
    headerRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    walletInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 14px',
        background: 'rgba(0, 255, 136, 0.1)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
        borderRadius: '4px',
    },
    walletAddress: {
        fontFamily: 'monospace',
        fontSize: '0.85rem',
        color: '#00ff88',
    },
    disconnectBtn: {
        background: 'none',
        border: 'none',
        color: 'rgba(255, 255, 255, 0.5)',
        cursor: 'pointer',
        fontSize: '0.9rem',
        padding: '0 4px',
    },
    connectBtn: {
        background: 'rgba(153, 69, 255, 0.1)',
        border: '1px solid #9945FF',
        color: '#9945FF',
        padding: '10px 20px',
        fontSize: '0.8rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        borderRadius: '4px',
        fontFamily: "'Rajdhani', sans-serif",
        transition: 'all 0.2s',
    },
    main: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
    },
    canvasWrapper: {
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
    },
    hints: {
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.5)',
        pointerEvents: 'none',
        zIndex: 50,
    },
    footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '30px',
        padding: '12px 20px',
        background: 'rgba(0, 10, 20, 0.95)',
        borderTop: '1px solid rgba(0, 246, 255, 0.15)',
        flexShrink: 0,
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
    },
    statLabel: {
        fontSize: '0.6rem',
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: '0.15em',
    },
    statValue: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#fff',
    },
    statDivider: {
        width: '1px',
        height: '30px',
        background: 'rgba(255, 255, 255, 0.1)',
    },
};

export default Grid;