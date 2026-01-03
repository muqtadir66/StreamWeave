import React from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridControls - Zoom, navigation, and selection mode controls for the grid canvas
 */
function GridControls() {
    const viewport = useGridStore(s => s.viewport);
    const zoom = useGridStore(s => s.zoom);
    const setViewport = useGridStore(s => s.setViewport);
    const selectMode = useGridStore(s => s.selectMode);
    const toggleSelectMode = useGridStore(s => s.toggleSelectMode);
    const selectedBlockIds = useGridStore(s => s.selectedBlockIds);
    const clearSelection = useGridStore(s => s.clearSelection);

    const handleZoomIn = () => zoom(1);
    const handleZoomOut = () => zoom(-1);
    const handleResetView = () => setViewport({ x: 50, y: 50, zoom: 1 });

    return (
        <div style={styles.container}>
            {/* Select Mode Toggle */}
            <div
                style={{
                    ...styles.selectToggle,
                    ...(selectMode ? styles.selectToggleActive : {})
                }}
                onClick={toggleSelectMode}
                title="Toggle Select Mode (for touch)"
            >
                <div style={{
                    ...styles.checkbox,
                    ...(selectMode ? styles.checkboxActive : {})
                }}>
                    {selectMode && '✓'}
                </div>
                <span style={styles.selectLabel}>SELECT</span>
            </div>

            {/* Clear button - only shown when blocks are selected */}
            {selectedBlockIds.length > 0 && (
                <>
                    <div style={styles.divider} />
                    <button
                        onClick={clearSelection}
                        style={styles.clearBtn}
                        title={`Clear ${selectedBlockIds.length} selected`}
                    >
                        ✕ {selectedBlockIds.length}
                    </button>
                </>
            )}

            <div style={styles.divider} />

            {/* Zoom Controls */}
            <button onClick={handleZoomOut} style={styles.btn} title="Zoom Out">
                −
            </button>
            <div style={styles.zoomDisplay}>
                {Math.round(viewport.zoom * 100)}%
            </div>
            <button onClick={handleZoomIn} style={styles.btn} title="Zoom In">
                +
            </button>
            <div style={styles.divider} />
            <button onClick={handleResetView} style={styles.resetBtn} title="Reset View">
                ⌂
            </button>
        </div>
    );
}

const styles = {
    container: {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(15, 12, 8, 0.9)',
        border: '1px solid rgba(255, 204, 0, 0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontFamily: "'Rajdhani', sans-serif",
        zIndex: 100,
    },
    selectToggle: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: 'transparent',
    },
    selectToggleActive: {
        background: 'rgba(255, 204, 0, 0.15)',
    },
    checkbox: {
        width: '18px',
        height: '18px',
        border: '2px solid rgba(255, 204, 0, 0.5)',
        borderRadius: '3px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#ffcc00',
        transition: 'all 0.2s',
    },
    checkboxActive: {
        background: 'rgba(255, 204, 0, 0.3)',
        borderColor: '#ffcc00',
    },
    selectLabel: {
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
    },
    btn: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 204, 0, 0.1)',
        border: '1px solid rgba(255, 204, 0, 0.3)',
        borderRadius: '4px',
        color: '#ffcc00',
        fontSize: '1.2rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    clearBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 10px',
        background: 'rgba(255, 68, 68, 0.15)',
        border: '1px solid rgba(255, 68, 68, 0.5)',
        borderRadius: '4px',
        color: '#ff4444',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    zoomDisplay: {
        minWidth: '50px',
        textAlign: 'center',
        color: '#fff',
        fontSize: '0.85rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
    },
    divider: {
        width: '1px',
        height: '24px',
        background: 'rgba(255, 255, 255, 0.2)',
        margin: '0 4px',
    },
    resetBtn: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '1rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
};

export default GridControls;