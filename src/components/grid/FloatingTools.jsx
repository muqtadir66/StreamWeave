import React from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * FloatingTools - Floating toolbar when blocks are selected
 * Appears on the left side with vertical tool buttons
 */
export default function FloatingTools() {
    const editorMode = useGridStore(s => s.editorMode);
    const selectedBlocks = useGridStore(s => s.selectedBlocks);
    const blocks = useGridStore(s => s.blocks);
    const clearSelection = useGridStore(s => s.clearSelection);

    if (!editorMode || selectedBlocks.length === 0) return null;

    // Get selected block data
    const selectedBlockData = selectedBlocks.map(id => blocks.find(b => b.id === id)).filter(Boolean);
    const totalPrice = selectedBlockData.reduce((sum, block) => sum + block.price, 0);
    const overlayPrice = Math.floor(totalPrice * 1.5);

    return (
        <div style={styles.container}>
            {/* Block Info */}
            <div style={styles.infoPanel}>
                <div style={styles.blockCount}>
                    {selectedBlocks.length} {selectedBlocks.length === 1 ? 'BLOCK' : 'BLOCKS'}
                </div>

                {selectedBlocks.length === 1 && selectedBlockData[0] && (
                    <div style={styles.coords}>
                        ({selectedBlockData[0].x}, {selectedBlockData[0].z})
                    </div>
                )}

                <div style={styles.priceRow}>
                    <span style={styles.priceLabel}>OVERLAY PRICE</span>
                    <span style={styles.priceValue}>{overlayPrice.toLocaleString()} WEAVE</span>
                </div>

                {selectedBlockData[0]?.owner && (
                    <div style={styles.ownerRow}>
                        <span style={styles.ownerLabel}>CURRENT</span>
                        <span style={styles.ownerValue}>
                            {selectedBlockData[0].owner.slice(0, 4)}...{selectedBlockData[0].owner.slice(-4)}
                        </span>
                    </div>
                )}
            </div>

            <div style={styles.divider} />

            {/* Tool Buttons */}
            <div style={styles.tools}>
                <button style={styles.toolBtn} title="Draw (Phase 2)">
                    <span>🖌️</span>
                    <span style={styles.toolLabel}>DRAW</span>
                </button>
                <button style={styles.toolBtn} title="Text (Phase 2)">
                    <span>📝</span>
                    <span style={styles.toolLabel}>TEXT</span>
                </button>
                <button style={styles.toolBtn} title="Upload (Phase 2)">
                    <span>🖼️</span>
                    <span style={styles.toolLabel}>UPLOAD</span>
                </button>
                <button style={styles.toolBtn} title="Color (Phase 2)">
                    <span>🎨</span>
                    <span style={styles.toolLabel}>COLOR</span>
                </button>
            </div>

            <div style={styles.divider} />

            {/* Action Buttons */}
            <div style={styles.actions}>
                <button style={styles.claimBtn}>
                    CLAIM AD SPACE
                </button>
                <button onClick={clearSelection} style={styles.cancelBtn}>
                    CANCEL
                </button>
            </div>

            <div style={styles.phase2Note}>
                Tools coming in Phase 2
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'absolute',
        left: '24px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: 'rgba(0, 15, 30, 0.9)',
        border: '1px solid rgba(255, 204, 0, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        zIndex: 200,
        fontFamily: "'Rajdhani', sans-serif",
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'slideInLeft 0.3s ease',
    },
    infoPanel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    blockCount: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#ffcc00',
        letterSpacing: '0.1em',
    },
    coords: {
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'monospace',
    },
    priceRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        marginTop: '4px',
    },
    priceLabel: {
        fontSize: '0.6rem',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: '0.08em',
    },
    priceValue: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#fff',
    },
    ownerRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    ownerLabel: {
        fontSize: '0.6rem',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: '0.08em',
    },
    ownerValue: {
        fontSize: '0.8rem',
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'monospace',
    },
    divider: {
        height: '1px',
        background: 'rgba(255, 255, 255, 0.1)',
    },
    tools: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    toolBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.85rem',
        cursor: 'not-allowed',
        opacity: 0.6,
        fontFamily: "'Rajdhani', sans-serif",
    },
    toolLabel: {
        fontSize: '0.75rem',
        letterSpacing: '0.05em',
    },
    actions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    claimBtn: {
        padding: '12px 16px',
        background: 'rgba(255, 204, 0, 0.15)',
        border: '2px solid #ffcc00',
        borderRadius: '6px',
        color: '#ffcc00',
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        cursor: 'pointer',
        fontFamily: "'Rajdhani', sans-serif",
        transition: 'all 0.2s',
    },
    cancelBtn: {
        padding: '10px 16px',
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '6px',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        cursor: 'pointer',
        fontFamily: "'Rajdhani', sans-serif",
        transition: 'all 0.2s',
    },
    phase2Note: {
        fontSize: '0.6rem',
        color: 'rgba(255, 255, 255, 0.3)',
        textAlign: 'center',
        fontStyle: 'italic',
    },
};
