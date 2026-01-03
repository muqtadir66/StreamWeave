import React from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridInspector - Sidebar panel showing selected block details
 * Supports multi-block selection with aggregate pricing
 */
function GridInspector() {
    const selectedBlockIds = useGridStore(s => s.selectedBlockIds);
    const inspectorOpen = useGridStore(s => s.inspectorOpen);
    const toggleInspector = useGridStore(s => s.toggleInspector);
    const getBlockAt = useGridStore(s => s.getBlockAt);
    const getTakeoverPrice = useGridStore(s => s.getTakeoverPrice);
    const getDecayInfo = useGridStore(s => s.getDecayInfo);
    const getSelectionBreakdown = useGridStore(s => s.getSelectionBreakdown);
    const openPurchaseModal = useGridStore(s => s.openPurchaseModal);
    const clearSelection = useGridStore(s => s.clearSelection);
    const BASE_PRICE = useGridStore(s => s.BASE_PRICE);

    // Get selection breakdown for multi-select
    const breakdown = selectedBlockIds.length > 0 ? getSelectionBreakdown() : null;

    // For single selection, get the block details
    const singleBlock = selectedBlockIds.length === 1
        ? getBlockAt(selectedBlockIds[0] % 100, Math.floor(selectedBlockIds[0] / 100))
        : null;

    const singleTakeoverPrice = selectedBlockIds.length === 1
        ? getTakeoverPrice(selectedBlockIds[0])
        : null;

    const singleDecayInfo = selectedBlockIds.length === 1
        ? getDecayInfo(selectedBlockIds[0])
        : null;

    if (!inspectorOpen) {
        return (
            <button onClick={toggleInspector} style={styles.toggleBtn}>
                ◀ INSPECTOR
            </button>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h3 style={styles.title}>
                    {selectedBlockIds.length > 1 ? 'MULTI-SELECT' : 'BLOCK INSPECTOR'}
                </h3>
                <button onClick={toggleInspector} style={styles.closeBtn}>✕</button>
            </div>

            {selectedBlockIds.length === 0 ? (
                // No selection
                <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>🎯</div>
                    <div style={styles.emptyText}>
                        Select blocks on the grid
                    </div>
                    <div style={styles.emptyHint}>
                        Click to select • Ctrl+Click to multi-select
                    </div>
                </div>
            ) : selectedBlockIds.length === 1 ? (
                // Single block selected
                <div style={styles.content}>
                    {/* Block ID & Coordinates */}
                    <div style={styles.section}>
                        <div style={styles.blockId}>#{selectedBlockIds[0]}</div>
                        <div style={styles.coords}>
                            COORDS: ({singleBlock?.x}, {singleBlock?.y})
                        </div>
                    </div>

                    <div style={styles.divider} />

                    {/* Ownership */}
                    <div style={styles.section}>
                        <div style={styles.label}>OWNER</div>
                        <div style={{
                            ...styles.value,
                            color: singleBlock?.owner ? '#00ff88' : '#666',
                        }}>
                            {singleBlock?.owner || 'UNCLAIMED'}
                        </div>
                    </div>

                    <div style={styles.divider} />

                    {/* Current Price */}
                    <div style={styles.section}>
                        <div style={styles.label}>CURRENT PRICE</div>
                        <div style={styles.value}>
                            {singleBlock?.price?.toLocaleString() || BASE_PRICE.toLocaleString()}
                            <span style={styles.unit}> $WEAVE</span>
                        </div>
                    </div>

                    {/* Decay Timer (only for owned blocks) */}
                    {singleBlock?.owner && singleDecayInfo && (
                        <>
                            <div style={styles.divider} />
                            <div style={styles.section}>
                                <div style={styles.label}>DECAY STATUS</div>
                                {singleDecayInfo.isDecaying ? (
                                    <div style={{ ...styles.value, color: '#ff4444' }}>
                                        DECAYING: -{singleDecayInfo.decayPercent}%
                                    </div>
                                ) : (
                                    <div style={{ ...styles.value, color: '#ffcc00' }}>
                                        {singleDecayInfo.daysRemaining}d {singleDecayInfo.hoursRemaining}h until decay
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div style={styles.divider} />

                    {/* Takeover Cost */}
                    <div style={styles.section}>
                        <div style={styles.label}>
                            {singleBlock?.owner ? 'TAKEOVER COST' : 'CLAIM COST'}
                        </div>
                        <div style={{ ...styles.value, color: '#00f6ff', fontSize: '1.4rem' }}>
                            {(singleTakeoverPrice || BASE_PRICE).toLocaleString()}
                            <span style={styles.unit}> $WEAVE</span>
                        </div>
                        {singleBlock?.owner && (
                            <div style={styles.breakdown}>
                                1.5× current price
                            </div>
                        )}
                    </div>

                    {/* Block Preview */}
                    {singleBlock?.color && (
                        <>
                            <div style={styles.divider} />
                            <div style={styles.section}>
                                <div style={styles.label}>BLOCK PREVIEW</div>
                                <div style={{
                                    ...styles.preview,
                                    background: singleBlock.color,
                                    boxShadow: `0 0 20px ${singleBlock.color}40`,
                                }} />
                            </div>
                        </>
                    )}

                    <div style={styles.divider} />

                    {/* Action Button */}
                    <button
                        onClick={() => openPurchaseModal()}
                        style={styles.actionBtn}
                    >
                        {singleBlock?.owner ? '⚔️ HOSTILE TAKEOVER' : '🏴 CLAIM BLOCK'}
                    </button>

                    {/* Info Text */}
                    <div style={styles.infoText}>
                        {singleBlock?.owner ? (
                            <>
                                Previous owner receives <span style={{ color: '#00ff88' }}>1.2×</span> their purchase price.
                                Protocol receives <span style={{ color: '#ff4444' }}>0.3×</span> as tax.
                            </>
                        ) : (
                            <>
                                First-time claims cost <span style={{ color: '#00f6ff' }}>{BASE_PRICE.toLocaleString()} WEAVE</span>.
                            </>
                        )}
                    </div>
                </div>
            ) : (
                // Multiple blocks selected
                <div style={styles.content}>
                    {/* Selection Summary */}
                    <div style={styles.section}>
                        <div style={styles.blockId}>{breakdown.summary.total} BLOCKS</div>
                        <div style={styles.coords}>
                            MULTI-SELECTION ACTIVE
                        </div>
                    </div>

                    <div style={styles.divider} />

                    {/* Selection Breakdown */}
                    <div style={styles.section}>
                        <div style={styles.label}>SELECTION BREAKDOWN</div>
                        <div style={styles.breakdownGrid}>
                            <div style={styles.breakdownItem}>
                                <span style={{ color: '#00f6ff' }}>{breakdown.summary.newBlocks}</span>
                                <span style={styles.breakdownLabel}>Unclaimed</span>
                            </div>
                            <div style={styles.breakdownItem}>
                                <span style={{ color: '#ff4444' }}>{breakdown.summary.ownedBlocks}</span>
                                <span style={styles.breakdownLabel}>Takeovers</span>
                            </div>
                            {breakdown.summary.decayingBlocks > 0 && (
                                <div style={styles.breakdownItem}>
                                    <span style={{ color: '#ffcc00' }}>{breakdown.summary.decayingBlocks}</span>
                                    <span style={styles.breakdownLabel}>Decaying</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={styles.divider} />

                    {/* Block List */}
                    <div style={styles.section}>
                        <div style={styles.label}>SELECTED BLOCKS</div>
                        <div style={styles.blockList}>
                            {breakdown.blocks.slice(0, 10).map((block, idx) => (
                                <div key={block.id} style={styles.blockListItem}>
                                    <span style={styles.blockListNumber}>{idx + 1}.</span>
                                    <span style={styles.blockListCoord}>
                                        #{block.id} ({block.x}, {block.y})
                                    </span>
                                    <span style={{
                                        ...styles.blockListPrice,
                                        color: block.type === 'claim' ? '#00f6ff' : '#ff4444'
                                    }}>
                                        {block.takeoverPrice.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                            {breakdown.blocks.length > 10 && (
                                <div style={styles.moreBlocks}>
                                    +{breakdown.blocks.length - 10} more blocks...
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={styles.divider} />

                    {/* Total Price */}
                    <div style={styles.totalSection}>
                        <div style={styles.label}>TOTAL COST</div>
                        <div style={styles.totalPrice}>
                            {breakdown.summary.totalPrice.toLocaleString()}
                            <span style={styles.unit}> $WEAVE</span>
                        </div>
                        <div style={styles.priceNote}>
                            {breakdown.summary.newBlocks > 0 && (
                                <div>Claims: {(breakdown.summary.newBlocks * BASE_PRICE).toLocaleString()} WEAVE</div>
                            )}
                            {breakdown.summary.ownedBlocks > 0 && (
                                <div>Takeovers: {(breakdown.summary.totalPrice - (breakdown.summary.newBlocks * BASE_PRICE)).toLocaleString()} WEAVE</div>
                            )}
                        </div>
                    </div>

                    <div style={styles.divider} />

                    {/* Action Buttons */}
                    <button
                        onClick={() => openPurchaseModal()}
                        style={styles.actionBtn}
                    >
                        🎯 ACQUIRE {breakdown.summary.total} BLOCKS
                    </button>

                    <button
                        onClick={clearSelection}
                        style={styles.clearBtn}
                    >
                        CLEAR SELECTION
                    </button>

                    {/* Info Text */}
                    <div style={styles.infoText}>
                        Ctrl+Click to add/remove blocks from selection.
                        Total includes takeover prices (1.5×) and new block claims.
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        width: '280px',
        background: 'rgba(0, 15, 30, 0.95)',
        borderLeft: '1px solid rgba(0, 246, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Rajdhani', sans-serif",
        flexShrink: 0,
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid rgba(0, 246, 255, 0.2)',
        background: 'rgba(0, 246, 255, 0.05)',
    },
    title: {
        margin: 0,
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        color: '#00f6ff',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#666',
        fontSize: '1rem',
        cursor: 'pointer',
        padding: '4px',
    },
    toggleBtn: {
        position: 'absolute',
        right: '0',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0, 15, 30, 0.95)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRight: 'none',
        borderRadius: '4px 0 0 4px',
        color: '#00f6ff',
        padding: '12px 8px',
        cursor: 'pointer',
        writingMode: 'vertical-rl',
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
        fontWeight: 700,
    },
    content: {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflow: 'auto',
        flex: 1,
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    blockId: {
        fontFamily: "'Orbitron', monospace",
        fontSize: '1.8rem',
        fontWeight: 700,
        color: '#ff4444',
        textShadow: '0 0 10px rgba(255, 68, 68, 0.5)',
    },
    coords: {
        fontSize: '0.75rem',
        color: '#666',
        letterSpacing: '0.1em',
    },
    label: {
        fontSize: '0.65rem',
        color: 'rgba(0, 246, 255, 0.7)',
        letterSpacing: '0.15em',
        fontWeight: 600,
    },
    value: {
        fontSize: '1.1rem',
        color: '#fff',
        fontWeight: 600,
    },
    unit: {
        fontSize: '0.7rem',
        color: '#00f6ff',
    },
    breakdown: {
        fontSize: '0.7rem',
        color: '#666',
        marginTop: '2px',
    },
    breakdownGrid: {
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
    },
    breakdownItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '4px',
        flex: 1,
    },
    breakdownLabel: {
        fontSize: '0.6rem',
        color: '#666',
        marginTop: '2px',
    },
    blockList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        maxHeight: '150px',
        overflow: 'auto',
        marginTop: '8px',
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
    blockListNumber: {
        color: '#ff4444',
        fontWeight: 700,
        minWidth: '20px',
    },
    blockListCoord: {
        color: '#fff',
        flex: 1,
        fontFamily: 'monospace',
        fontSize: '0.75rem',
    },
    blockListPrice: {
        fontWeight: 600,
        fontSize: '0.75rem',
    },
    moreBlocks: {
        fontSize: '0.7rem',
        color: '#666',
        textAlign: 'center',
        padding: '4px',
    },
    totalSection: {
        background: 'rgba(0, 246, 255, 0.08)',
        border: '1px solid rgba(0, 246, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
        textAlign: 'center',
    },
    totalPrice: {
        fontFamily: "'Orbitron', monospace",
        fontSize: '1.6rem',
        fontWeight: 700,
        color: '#00f6ff',
        marginTop: '4px',
        textShadow: '0 0 15px rgba(0, 246, 255, 0.5)',
    },
    priceNote: {
        fontSize: '0.7rem',
        color: '#666',
        marginTop: '8px',
    },
    preview: {
        width: '100%',
        height: '60px',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    divider: {
        height: '1px',
        background: 'rgba(255, 255, 255, 0.1)',
        margin: '4px 0',
    },
    actionBtn: {
        width: '100%',
        padding: '14px',
        background: 'rgba(0, 246, 255, 0.1)',
        border: '1px solid #00f6ff',
        borderRadius: '4px',
        color: '#00f6ff',
        fontSize: '0.9rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: "'Rajdhani', sans-serif",
    },
    clearBtn: {
        width: '100%',
        padding: '10px',
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        color: '#666',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: "'Rajdhani', sans-serif",
    },
    infoText: {
        fontSize: '0.7rem',
        color: '#666',
        lineHeight: 1.6,
        textAlign: 'center',
    },
    emptyState: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
    },
    emptyIcon: {
        fontSize: '3rem',
        marginBottom: '16px',
        opacity: 0.6,
    },
    emptyText: {
        fontSize: '0.9rem',
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: '8px',
    },
    emptyHint: {
        fontSize: '0.75rem',
        color: '#666',
    },
};

export default GridInspector;