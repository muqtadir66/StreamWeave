import React from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * BlockEditor - Floating panel when blocks are selected
 * Shows selected block info with placeholder for Phase 2 tools
 */
export default function BlockEditor() {
    const editorMode = useGridStore(s => s.editorMode);
    const selectedBlocks = useGridStore(s => s.selectedBlocks);
    const blocks = useGridStore(s => s.blocks);
    const clearSelection = useGridStore(s => s.clearSelection);

    if (!editorMode || selectedBlocks.length === 0) return null;

    // Get selected block data
    const selectedBlockData = selectedBlocks.map(id => blocks.find(b => b.id === id)).filter(Boolean);

    // Calculate total price
    const totalPrice = selectedBlockData.reduce((sum, block) => sum + block.price, 0);

    // Format block coordinates
    const formatCoords = (block) => `(${block.x}, ${block.z})`;

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>
                    {selectedBlocks.length === 1 ? 'BLOCK SELECTED' : `${selectedBlocks.length} BLOCKS SELECTED`}
                </h2>
                <button onClick={clearSelection} style={styles.closeBtn}>✕</button>
            </div>

            {/* Block Info */}
            <div style={styles.content}>
                {selectedBlocks.length === 1 && selectedBlockData[0] && (
                    <div style={styles.blockInfo}>
                        <div style={styles.row}>
                            <span style={styles.label}>COORDINATES</span>
                            <span style={styles.value}>{formatCoords(selectedBlockData[0])}</span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>CURRENT PRICE</span>
                            <span style={styles.value}>{selectedBlockData[0].price.toLocaleString()} WEAVE</span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>TAKEOVER PRICE</span>
                            <span style={styles.valueHighlight}>
                                {Math.floor(selectedBlockData[0].price * 1.5).toLocaleString()} WEAVE
                            </span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>OWNER</span>
                            <span style={styles.value}>
                                {selectedBlockData[0].owner
                                    ? `${selectedBlockData[0].owner.slice(0, 4)}...${selectedBlockData[0].owner.slice(-4)}`
                                    : 'Unclaimed'
                                }
                            </span>
                        </div>
                    </div>
                )}

                {selectedBlocks.length > 1 && (
                    <div style={styles.blockInfo}>
                        <div style={styles.row}>
                            <span style={styles.label}>BLOCKS</span>
                            <span style={styles.value}>{selectedBlocks.length}</span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>TOTAL PRICE</span>
                            <span style={styles.value}>{totalPrice.toLocaleString()} WEAVE</span>
                        </div>
                        <div style={styles.row}>
                            <span style={styles.label}>TOTAL TAKEOVER</span>
                            <span style={styles.valueHighlight}>
                                {Math.floor(totalPrice * 1.5).toLocaleString()} WEAVE
                            </span>
                        </div>
                    </div>
                )}

                <div style={styles.divider} />

                {/* Placeholder toolbar */}
                <div style={styles.toolbar}>
                    <div style={styles.toolbarLabel}>CREATION TOOLS</div>
                    <div style={styles.toolGrid}>
                        <div style={styles.toolBtn} title="Coming in Phase 2">🖌️</div>
                        <div style={styles.toolBtn} title="Coming in Phase 2">📝</div>
                        <div style={styles.toolBtn} title="Coming in Phase 2">🖼️</div>
                        <div style={styles.toolBtn} title="Coming in Phase 2">🎨</div>
                    </div>
                    <div style={styles.comingSoon}>Phase 2: Draw, Text, Upload</div>
                </div>

                <div style={styles.divider} />

                {/* Action buttons */}
                <div style={styles.actions}>
                    <button style={styles.claimBtn}>
                        CLAIM {selectedBlocks.length === 1 ? 'BLOCK' : 'BLOCKS'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'absolute',
        right: '24px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '320px',
        background: 'rgba(0, 15, 30, 0.95)',
        border: '1px solid rgba(255, 204, 0, 0.3)',
        borderRadius: '8px',
        zIndex: 200,
        fontFamily: "'Rajdhani', sans-serif",
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 204, 0, 0.1)',
        animation: 'slideIn 0.3s ease',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    },
    title: {
        margin: 0,
        fontSize: '0.9rem',
        fontWeight: 700,
        color: '#ffcc00',
        letterSpacing: '0.1em',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '1.2rem',
        cursor: 'pointer',
        padding: '4px 8px',
        transition: 'color 0.2s',
    },
    content: {
        padding: '20px',
    },
    blockInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: '0.7rem',
        color: 'rgba(255, 255, 255, 0.5)',
        letterSpacing: '0.08em',
    },
    value: {
        fontSize: '0.9rem',
        color: '#fff',
        fontWeight: 600,
    },
    valueHighlight: {
        fontSize: '0.9rem',
        color: '#ffcc00',
        fontWeight: 700,
    },
    divider: {
        height: '1px',
        background: 'rgba(255, 255, 255, 0.1)',
        margin: '20px 0',
    },
    toolbar: {
        textAlign: 'center',
    },
    toolbarLabel: {
        fontSize: '0.65rem',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: '0.1em',
        marginBottom: '12px',
    },
    toolGrid: {
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
    },
    toolBtn: {
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        fontSize: '1.2rem',
        cursor: 'not-allowed',
        opacity: 0.5,
    },
    comingSoon: {
        fontSize: '0.65rem',
        color: 'rgba(255, 255, 255, 0.3)',
        marginTop: '8px',
        fontStyle: 'italic',
    },
    actions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    claimBtn: {
        width: '100%',
        padding: '14px',
        background: 'rgba(255, 204, 0, 0.1)',
        border: '2px solid #ffcc00',
        borderRadius: '4px',
        color: '#ffcc00',
        fontSize: '0.95rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: "'Rajdhani', sans-serif",
    },
};
