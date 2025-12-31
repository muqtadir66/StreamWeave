import React from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridInspector - Redesigned sidebar with sector analysis
 * Shows dimensions, area, and total price for multi-select
 */
function GridInspector({ isMobile, onClose }) {
    const selectedBlocks = useGridStore(s => s.selectedBlocks);
    const inspectorOpen = useGridStore(s => s.inspectorOpen);
    const toggleInspector = useGridStore(s => s.toggleInspector);
    const getSelectionInfo = useGridStore(s => s.getSelectionInfo);
    const openPurchaseModal = useGridStore(s => s.openPurchaseModal);

    const selectionInfo = getSelectionInfo();
    const hasSelection = selectedBlocks.size > 0;

    // Mobile: show as overlay with close button
    // Desktop: show as sidebar

    if (!inspectorOpen && !isMobile) {
        return (
            <button onClick={toggleInspector} style={styles.toggleBtn}>
                ◀
            </button>
        );
    }

    return (
        <div style={{
            ...styles.container,
            ...(isMobile ? styles.mobileContainer : {}),
        }}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerIcon}>⊢_</div>
                <h3 style={styles.title}>SECTOR ANALYSIS</h3>
                <div style={styles.statusDot} />
                {(isMobile || true) && (
                    <button
                        onClick={onClose || toggleInspector}
                        style={styles.closeBtn}
                    >
                        ✕
                    </button>
                )}
            </div>

            <div style={styles.content}>
                {hasSelection && selectionInfo ? (
                    <>
                        {/* Coordinates */}
                        <div style={styles.row}>
                            <span style={styles.label}>COORDINATES</span>
                            <span style={styles.value}>
                                <span style={styles.valueHighlight}>X:{selectionInfo.coordinates.x}</span>
                                {' '}
                                <span style={styles.valueHighlight}>Y:{selectionInfo.coordinates.y}</span>
                            </span>
                        </div>

                        <div style={styles.divider} />

                        {/* Dimensions */}
                        <div style={styles.row}>
                            <span style={styles.label}>DIMENSIONS</span>
                            <span style={styles.value}>
                                <span style={styles.valueWhite}>{selectionInfo.dimensions.width}x{selectionInfo.dimensions.height}</span>
                                <span style={styles.valueUnit}> px</span>
                            </span>
                        </div>

                        <div style={styles.divider} />

                        {/* Area */}
                        <div style={styles.row}>
                            <span style={styles.label}>AREA</span>
                            <span style={styles.value}>
                                <span style={styles.valueWhite}>{selectionInfo.area.toLocaleString()}</span>
                                <span style={styles.valueUnit}> BLOCK_UNITS</span>
                            </span>
                        </div>

                        <div style={styles.divider} />

                        {/* Breakdown */}
                        <div style={styles.breakdownSection}>
                            <div style={styles.breakdownRow}>
                                <span style={styles.breakdownLabel}>Unclaimed:</span>
                                <span style={styles.breakdownValue}>{selectionInfo.unclaimedCount}</span>
                            </div>
                            <div style={styles.breakdownRow}>
                                <span style={styles.breakdownLabel}>Owned (Takeover):</span>
                                <span style={styles.breakdownValue}>{selectionInfo.ownedCount}</span>
                            </div>
                        </div>

                        <div style={styles.divider} />

                        {/* Total Price */}
                        <div style={styles.row}>
                            <span style={styles.label}>EST. PRICE</span>
                            <span style={styles.priceValue}>
                                {selectionInfo.totalPrice.toLocaleString()}
                                <span style={styles.priceCurrency}> $WEAVE</span>
                            </span>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={openPurchaseModal}
                            style={styles.actionBtn}
                        >
                            CLAIM SECTOR
                        </button>
                    </>
                ) : (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>⊹</div>
                        <div style={styles.emptyText}>
                            Select blocks on the grid
                        </div>
                        <div style={styles.emptyHint}>
                            Use SELECT mode to drag-select regions
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        width: '280px',
        background: 'linear-gradient(180deg, rgba(5, 15, 25, 0.98) 0%, rgba(0, 10, 20, 0.98) 100%)',
        borderLeft: '1px solid rgba(0, 246, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Rajdhani', sans-serif",
        flexShrink: 0,
    },
    mobileContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '280px',
        maxWidth: '85vw',
        zIndex: 100,
        boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
    },
    toggleBtn: {
        position: 'absolute',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(5, 15, 25, 0.95)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRight: 'none',
        borderRadius: '4px 0 0 4px',
        color: '#00f6ff',
        padding: '20px 8px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        zIndex: 10,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '16px',
        borderBottom: '1px solid rgba(0, 246, 255, 0.15)',
        background: 'rgba(0, 246, 255, 0.03)',
    },
    headerIcon: {
        color: '#00f6ff',
        fontSize: '1rem',
        fontFamily: 'monospace',
    },
    title: {
        margin: 0,
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: '#00f6ff',
        flex: 1,
    },
    statusDot: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#00ff88',
        boxShadow: '0 0 8px #00ff88',
    },
    closeBtn: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#666',
        width: '24px',
        height: '24px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflow: 'auto',
        flex: 1,
    },
    row: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: '0.1em',
    },
    value: {
        fontSize: '0.9rem',
        textAlign: 'right',
    },
    valueHighlight: {
        color: '#00f6ff',
        fontFamily: 'monospace',
        fontWeight: 600,
    },
    valueWhite: {
        color: '#fff',
        fontWeight: 700,
        fontSize: '1rem',
    },
    valueUnit: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.75rem',
    },
    divider: {
        height: '1px',
        background: 'rgba(255, 255, 255, 0.06)',
        margin: '4px 0',
    },
    breakdownSection: {
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '4px',
        padding: '10px 12px',
    },
    breakdownRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: '4px',
    },
    breakdownLabel: {},
    breakdownValue: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    priceValue: {
        color: '#00ff88',
        fontSize: '1.2rem',
        fontWeight: 700,
        fontFamily: 'monospace',
    },
    priceCurrency: {
        color: '#00ff88',
        fontSize: '0.7rem',
        fontWeight: 600,
    },
    actionBtn: {
        width: '100%',
        padding: '14px',
        marginTop: '8px',
        background: 'linear-gradient(135deg, rgba(0, 246, 255, 0.15), rgba(0, 246, 255, 0.05))',
        border: '1px solid #00f6ff',
        color: '#00f6ff',
        fontSize: '0.9rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        cursor: 'pointer',
        fontFamily: "'Rajdhani', sans-serif",
        transition: 'all 0.2s',
    },
    emptyState: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '20px',
    },
    emptyIcon: {
        fontSize: '2rem',
        color: 'rgba(0, 246, 255, 0.3)',
        marginBottom: '12px',
    },
    emptyText: {
        fontSize: '0.9rem',
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: '6px',
    },
    emptyHint: {
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.3)',
    },
};

export default GridInspector;
