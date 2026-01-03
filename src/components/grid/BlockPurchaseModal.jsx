import React, { useState } from 'react';
import { useGridStore } from '../../stores/gridStore';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * BlockPurchaseModal - Modal for purchasing or taking over blocks
 * Supports multi-block purchases
 */
function BlockPurchaseModal() {
    const purchaseModalOpen = useGridStore(s => s.purchaseModalOpen);
    const selectedBlockIds = useGridStore(s => s.selectedBlockIds);
    const closePurchaseModal = useGridStore(s => s.closePurchaseModal);
    const getSelectionBreakdown = useGridStore(s => s.getSelectionBreakdown);
    const purchaseBlocks = useGridStore(s => s.purchaseBlocks);
    const BASE_PRICE = useGridStore(s => s.BASE_PRICE);

    const { connected } = useWallet();

    const [selectedColor, setSelectedColor] = useState('#ffcc00');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    if (!purchaseModalOpen || selectedBlockIds.length === 0) return null;

    const breakdown = getSelectionBreakdown();
    const isSingleBlock = selectedBlockIds.length === 1;
    const singleBlock = isSingleBlock ? breakdown.blocks[0] : null;

    const colorOptions = [
        '#ffcc00', // Cyan
        '#00ff88', // Green
        '#ff4444', // Red
        '#ffcc00', // Yellow
        '#9945FF', // Purple
        '#ff00ff', // Magenta
        '#ff8800', // Orange
        '#ffffff', // White
    ];

    const handlePurchase = async () => {
        if (!connected) {
            setError('Please connect your wallet first');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            await purchaseBlocks(selectedBlockIds, selectedColor);
        } catch (err) {
            setError(err.message || 'Transaction failed');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div style={styles.overlay} onClick={closePurchaseModal}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                {/* Load font */}
                <style>
                    {`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&family=Rajdhani:wght@500;600;700&display=swap');`}
                </style>

                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.title}>
                        {isSingleBlock
                            ? (singleBlock.type === 'takeover' ? 'HOSTILE TAKEOVER' : 'CLAIM TERRITORY')
                            : `ACQUIRE ${selectedBlockIds.length} BLOCKS`
                        }
                    </h2>
                    <button onClick={closePurchaseModal} style={styles.closeBtn}>✕</button>
                </div>

                {/* Content */}
                <div style={styles.content}>
                    {/* Block Info */}
                    <div style={styles.blockInfo}>
                        {isSingleBlock ? (
                            <>
                                <div style={styles.blockId}>BLOCK #{selectedBlockIds[0]}</div>
                                <div style={styles.coords}>
                                    Coordinates: ({singleBlock.x}, {singleBlock.y})
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={styles.blockId}>{selectedBlockIds.length} BLOCKS</div>
                                <div style={styles.coords}>
                                    {breakdown.summary.newBlocks} claims • {breakdown.summary.ownedBlocks} takeovers
                                </div>
                            </>
                        )}
                    </div>

                    {/* Current Owner (single block takeover) */}
                    {isSingleBlock && singleBlock.type === 'takeover' && (
                        <div style={styles.ownerSection}>
                            <div style={styles.label}>CURRENT OWNER</div>
                            <div style={styles.ownerValue}>{singleBlock.owner}</div>
                            <div style={styles.profitNote}>
                                They will receive <span style={{ color: '#00ff88' }}>1.2×</span> their investment
                            </div>
                        </div>
                    )}

                    {/* Block List (multi-select) */}
                    {!isSingleBlock && (
                        <div style={styles.blockListSection}>
                            <div style={styles.label}>SELECTED BLOCKS</div>
                            <div style={styles.blockList}>
                                {breakdown.blocks.slice(0, 6).map((block, idx) => (
                                    <div key={block.id} style={styles.blockListItem}>
                                        <span style={{
                                            ...styles.blockListType,
                                            background: block.type === 'claim' ? 'rgba(255, 204, 0, 0.2)' : 'rgba(255, 68, 68, 0.2)',
                                            color: block.type === 'claim' ? '#ffcc00' : '#ff4444',
                                        }}>
                                            {block.type === 'claim' ? 'NEW' : 'OWN'}
                                        </span>
                                        <span style={styles.blockListCoord}>
                                            #{block.id}
                                        </span>
                                        <span style={styles.blockListPrice}>
                                            {block.takeoverPrice.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                                {breakdown.blocks.length > 6 && (
                                    <div style={styles.moreBlocks}>
                                        +{breakdown.blocks.length - 6} more...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Color Picker */}
                    <div style={styles.section}>
                        <div style={styles.label}>CHOOSE BLOCK COLOR</div>
                        <div style={styles.colorGrid}>
                            {colorOptions.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    style={{
                                        ...styles.colorOption,
                                        background: color,
                                        border: selectedColor === color
                                            ? '3px solid #fff'
                                            : '1px solid rgba(255,255,255,0.2)',
                                        boxShadow: selectedColor === color
                                            ? `0 0 15px ${color}`
                                            : 'none',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div style={styles.section}>
                        <div style={styles.label}>PREVIEW</div>
                        <div style={{
                            ...styles.previewBlock,
                            background: selectedColor,
                            boxShadow: `0 0 30px ${selectedColor}40`,
                        }}>
                            {!isSingleBlock && (
                                <div style={styles.previewCount}>×{selectedBlockIds.length}</div>
                            )}
                        </div>
                    </div>

                    {/* Price Section */}
                    <div style={styles.priceSection}>
                        <div style={styles.label}>TOTAL COST</div>
                        <div style={styles.totalPrice}>
                            {breakdown.summary.totalPrice.toLocaleString()}
                            <span style={styles.unit}> $WEAVE</span>
                        </div>
                        {!isSingleBlock && (
                            <div style={styles.priceBreakdown}>
                                {breakdown.summary.newBlocks > 0 && (
                                    <div style={styles.breakdownRow}>
                                        <span>{breakdown.summary.newBlocks} claims × {BASE_PRICE.toLocaleString()}:</span>
                                        <span style={{ color: '#ffcc00' }}>
                                            {(breakdown.summary.newBlocks * BASE_PRICE).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {breakdown.summary.ownedBlocks > 0 && (
                                    <div style={styles.breakdownRow}>
                                        <span>{breakdown.summary.ownedBlocks} takeovers (1.5×):</span>
                                        <span style={{ color: '#ff4444' }}>
                                            {(breakdown.summary.totalPrice - (breakdown.summary.newBlocks * BASE_PRICE)).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                        {isSingleBlock && singleBlock.type === 'takeover' && (
                            <div style={styles.priceBreakdown}>
                                <div style={styles.breakdownRow}>
                                    <span>To Previous Owner (1.2×):</span>
                                    <span style={{ color: '#00ff88' }}>
                                        {Math.floor(singleBlock.takeoverPrice / 1.5 * 1.2).toLocaleString()}
                                    </span>
                                </div>
                                <div style={styles.breakdownRow}>
                                    <span>Protocol Tax (0.3×):</span>
                                    <span style={{ color: '#ff4444' }}>
                                        {Math.floor(singleBlock.takeoverPrice / 1.5 * 0.3).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={styles.error}>{error}</div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={handlePurchase}
                        disabled={isProcessing || !connected}
                        style={{
                            ...styles.purchaseBtn,
                            opacity: isProcessing || !connected ? 0.5 : 1,
                            cursor: isProcessing || !connected ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isProcessing ? (
                            <span>PROCESSING...</span>
                        ) : !connected ? (
                            <span>CONNECT WALLET</span>
                        ) : (
                            <span>
                                CONFIRM {isSingleBlock
                                    ? (singleBlock.type === 'takeover' ? 'TAKEOVER' : 'CLAIM')
                                    : `${selectedBlockIds.length} BLOCKS`
                                }
                            </span>
                        )}
                    </button>

                    {/* Disclaimer */}
                    <div style={styles.disclaimer}>
                        By proceeding, you acknowledge that blocks can be taken over at any time
                        for 1.5× the price you paid. You will receive 1.2× your purchase price
                        if overwritten.
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
    },
    modal: {
        width: '100%',
        maxWidth: '420px',
        maxHeight: '90vh',
        overflow: 'auto',
        background: 'rgba(12, 10, 6, 0.98)',
        border: '1px solid rgba(255, 204, 0, 0.3)',
        borderRadius: '12px',
        fontFamily: "'Rajdhani', sans-serif",
        animation: 'slideUp 0.3s ease-out',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        background: 'rgba(255, 204, 0, 0.08)',
        borderBottom: '1px solid rgba(255, 204, 0, 0.2)',
        position: 'sticky',
        top: 0,
    },
    title: {
        margin: 0,
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1rem',
        fontWeight: 700,
        color: '#fff',
        letterSpacing: '0.1em',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#666',
        fontSize: '1.2rem',
        cursor: 'pointer',
        padding: '4px 8px',
    },
    content: {
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    blockInfo: {
        textAlign: 'center',
    },
    blockId: {
        fontFamily: "'Orbitron', monospace",
        fontSize: '1.8rem',
        fontWeight: 800,
        color: '#ff4444',
        textShadow: '0 0 15px rgba(255, 68, 68, 0.5)',
    },
    coords: {
        fontSize: '0.8rem',
        color: '#666',
        marginTop: '4px',
    },
    ownerSection: {
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid rgba(255, 68, 68, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        textAlign: 'center',
    },
    ownerValue: {
        fontFamily: 'monospace',
        fontSize: '1rem',
        color: '#fff',
        margin: '8px 0',
    },
    profitNote: {
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    blockListSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    blockList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        maxHeight: '120px',
        overflow: 'auto',
    },
    blockListItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '4px',
        fontSize: '0.8rem',
    },
    blockListType: {
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '0.65rem',
        fontWeight: 700,
    },
    blockListCoord: {
        color: '#fff',
        flex: 1,
        fontFamily: 'monospace',
        fontSize: '0.75rem',
    },
    blockListPrice: {
        color: '#ffcc00',
        fontWeight: 600,
        fontSize: '0.75rem',
    },
    moreBlocks: {
        fontSize: '0.7rem',
        color: '#666',
        textAlign: 'center',
        padding: '4px',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    label: {
        fontSize: '0.7rem',
        color: 'rgba(255, 204, 0, 0.8)',
        letterSpacing: '0.15em',
        fontWeight: 600,
    },
    colorGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '8px',
    },
    colorOption: {
        width: '100%',
        aspectRatio: '1',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    previewBlock: {
        height: '60px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewCount: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'rgba(0, 0, 0, 0.5)',
    },
    priceSection: {
        background: 'rgba(255, 204, 0, 0.05)',
        border: '1px solid rgba(255, 204, 0, 0.2)',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center',
    },
    totalPrice: {
        fontFamily: "'Orbitron', monospace",
        fontSize: '1.8rem',
        fontWeight: 700,
        color: '#ffcc00',
        marginTop: '8px',
        textShadow: '0 0 20px rgba(255, 204, 0, 0.5)',
    },
    unit: {
        fontSize: '0.8rem',
        color: 'rgba(255, 204, 0, 0.7)',
    },
    priceBreakdown: {
        marginTop: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    breakdownRow: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    error: {
        background: 'rgba(255, 68, 68, 0.1)',
        border: '1px solid #ff4444',
        borderRadius: '4px',
        padding: '12px',
        color: '#ff4444',
        fontSize: '0.85rem',
        textAlign: 'center',
    },
    purchaseBtn: {
        width: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(255, 204, 0, 0.2), rgba(255, 204, 0, 0.1))',
        border: '2px solid #ffcc00',
        borderRadius: '8px',
        color: '#ffcc00',
        fontSize: '1rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        fontFamily: "'Rajdhani', sans-serif",
        transition: 'all 0.2s',
    },
    disclaimer: {
        fontSize: '0.65rem',
        color: '#555',
        textAlign: 'center',
        lineHeight: 1.6,
    },
};

export default BlockPurchaseModal;