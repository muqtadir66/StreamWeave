import React from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridControls - Zoom and navigation controls for the grid canvas
 */
function GridControls() {
    const viewport = useGridStore(s => s.viewport);
    const zoom = useGridStore(s => s.zoom);
    const setViewport = useGridStore(s => s.setViewport);

    const handleZoomIn = () => zoom(1);
    const handleZoomOut = () => zoom(-1);
    const handleResetView = () => setViewport({ x: 50, y: 50, zoom: 1 });

    return (
        <div style={styles.container}>
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
        background: 'rgba(0, 15, 30, 0.9)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontFamily: "'Rajdhani', sans-serif",
        zIndex: 100,
    },
    btn: {
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 246, 255, 0.1)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRadius: '4px',
        color: '#00f6ff',
        fontSize: '1.2rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    zoomDisplay: {
        minWidth: '60px',
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
