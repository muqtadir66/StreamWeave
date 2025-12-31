import React, { useState } from 'react';
import { useGridStore } from '../../stores/gridStore';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * BlockPurchaseModal - Updated for multi-select
 */
function BlockPurchaseModal() {
    const purchaseModalOpen = useGridStore(s => s.purchaseModalOpen);
    const closePurchaseModal = useGridStore(s => s.closePurchaseModal);
    const getSelectionInfo = useGridStore(s => s.getSelectionInfo);
    const purchaseBlocks = useGridStore(s => s.purchaseBlocks);

    const { connected } = useWallet();

    const [selectedColor, setSelectedColor] = useState('#00f6ff');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    const selectionInfo = getSelectionInfo();

    if (!purchaseModalOpen || !selectionInfo) return null;

    const colorOptions = [
        '#00f6ff', '#00ff88', '#ff4444', '#ffcc00',
        '#9945FF', '#ff00ff', '#ff8800', '#ffffff',
    ];

    const handlePurchase = async () => {
        if (!connected) {
            setError('Please connect your wallet first');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            await purchaseBlocks(selectedColor);
        } catch (err) {
            setError(err.message || 'Transaction failed');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={styles.overlay} onClick={closePurchaseModal}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <style>
                    {`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&family=Rajdhani:wght@500;600;700&display=swap');`}
                </style>

                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.title}>CLAIM SECTOR</h2>
                    <button onClick={closePurchaseModal} style={styles.closeBtn}>✕</button>
                </div>

                {/* Content */}
                <div style={styles.content}>
                    {/* Selection Summary */}
                    <div style={styles.summary}>
                        <div style={styles.summaryRow}>
                            <span>Blocks Selected</span>
                            <span style={styles.summaryValue}>{selectionInfo.count}</span>
                        </div>
                        <div style={styles.summaryRow}>
                            <span>Dimensions</span>
                            <span style={styles.summaryValue}>{selectionInfo.dimensions.width}×{selectionInfo.dimensions.height}</span>
                        </div>
                        <div style={styles.summaryRow}>
                            <span>Unclaimed</span>
                            <span style={{ color: '#00f6ff' }}>{selectionInfo.unclaimedCount}</span>
                        </div>
                        <div style={styles.summaryRow}>
                            <span>Takeovers</span>
                            <span style={{ color: '#ff4444' }}>{selectionInfo.ownedCount}</span>
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div style={styles.section}>
                        <div style={styles.label}>BLOCK COLOR</div>
                        <div style={styles.colorGrid}>
                            {colorOptions.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    style={{
                                        ...styles.colorOption,
                                        background: color,
                                        border: selectedColor === color ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                        boxShadow: selectedColor === color ? `0 0 12px ${color}` : 'none',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Total Price */}
                    <div style={styles.priceSection}>
                        <div style={styles.label}>TOTAL COST</div>
                        <div style={styles.totalPrice}>
                            {selectionInfo.totalPrice.toLocaleString()}
                            <span style={styles.currency}> $WEAVE</span>
                        </div>
                    </div>

                    {/* Error */}
                    {error && <div style={styles.error}>{error}</div>}

                    {/* Action Button */}
                    <button
                        onClick={handlePurchase}
                        disabled={isProcessing || !connected}
                        style={{
                            ...styles.actionBtn,
                            opacity: isProcessing || !connected ? 0.5 : 1,
                        }}
                    >
                        {isProcessing ? 'PROCESSING...' : !connected ? 'CONNECT WALLET' : 'CONFIRM CLAIM'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
    },
    modal: {
        width: '100%',
        maxWidth: '380px',
        background: 'linear-gradient(180deg, rgba(5, 15, 30, 0.98) 0%, rgba(0, 10, 20, 0.98) 100%)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        overflow: 'hidden',
        fontFamily: "'Rajdhani', sans-serif",
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        background: 'rgba(0, 246, 255, 0.05)',
        borderBottom: '1px solid rgba(0, 246, 255, 0.2)',
    },
    title: {
        margin: 0,
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1rem',
        fontWeight: 700,
        color: '#00f6ff',
        letterSpacing: '0.1em',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#666',
        fontSize: '1rem',
        cursor: 'pointer',
    },
    content: {
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    summary: {
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '12px',
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.85rem',
        color: 'rgba(255, 255, 255, 0.6)',
        padding: '4px 0',
    },
    summaryValue: {
        color: '#fff',
        fontWeight: 600,
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '0.65rem',
        color: 'rgba(0, 246, 255, 0.7)',
        letterSpacing: '0.15em',
    },
    colorGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '6px',
    },
    colorOption: {
        aspectRatio: '1',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    priceSection: {
        background: 'rgba(0, 246, 255, 0.05)',
        border: '1px solid rgba(0, 246, 255, 0.2)',
        padding: '16px',
        textAlign: 'center',
    },
    totalPrice: {
        fontFamily: "'Orbitron', monospace",
        fontSize: '1.8rem',
        fontWeight: 700,
        color: '#00ff88',
        marginTop: '6px',
    },
    currency: {
        fontSize: '0.8rem',
        color: 'rgba(0, 255, 136, 0.7)',
    },
    error: {
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid #ff4444',
        padding: '10px',
        color: '#ff4444',
        fontSize: '0.8rem',
        textAlign: 'center',
    },
    actionBtn: {
        width: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, rgba(0, 246, 255, 0.2), rgba(0, 246, 255, 0.1))',
        border: '1px solid #00f6ff',
        color: '#00f6ff',
        fontSize: '0.9rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        cursor: 'pointer',
        fontFamily: "'Rajdhani', sans-serif",
    },
};

export default BlockPurchaseModal;
