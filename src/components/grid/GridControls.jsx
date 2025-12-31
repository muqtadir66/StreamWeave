import React from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridControls - Mode toggle and zoom controls
 * Matches reference UI with SELECT/NAVIGATE toggle
 */
function GridControls() {
    const mode = useGridStore(s => s.mode);
    const setMode = useGridStore(s => s.setMode);
    const viewport = useGridStore(s => s.viewport);
    const zoom = useGridStore(s => s.zoom);
    const setViewport = useGridStore(s => s.setViewport);

    const handleZoomIn = () => zoom(1);
    const handleZoomOut = () => zoom(-1);
    const handleResetView = () => setViewport({ x: 50, y: 50, zoom: 1.5 });

    return (
        <div style={styles.container}>
            {/* Mode Toggle */}
            <div style={styles.modeToggle}>
                <button
                    onClick={() => setMode('select')}
                    style={{
                        ...styles.modeBtn,
                        ...(mode === 'select' ? styles.modeBtnActive : {}),
                    }}
                >
                    <svg viewBox="0 0 24 24" style={styles.modeIcon}>
                        <path fill="currentColor" d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                    </svg>
                    SELECT
                </button>
                <button
                    onClick={() => setMode('navigate')}
                    style={{
                        ...styles.modeBtn,
                        ...(mode === 'navigate' ? styles.modeBtnActive : {}),
                    }}
                >
                    <svg viewBox="0 0 24 24" style={styles.modeIcon}>
                        <path fill="currentColor" d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" transform="rotate(45 12 12)" />
                    </svg>
                    NAVIGATE
                </button>
            </div>

            {/* Zoom Controls */}
            <div style={styles.zoomControls}>
                <button onClick={handleZoomOut} style={styles.zoomBtn}>−</button>
                <div style={styles.zoomDisplay}>{Math.round(viewport.zoom * 100)}%</div>
                <button onClick={handleZoomIn} style={styles.zoomBtn}>+</button>
                <button onClick={handleResetView} style={styles.resetBtn} title="Reset View">⌂</button>
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 50,
    },
    modeToggle: {
        display: 'flex',
        background: 'rgba(5, 15, 25, 0.95)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    modeBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        fontFamily: "'Rajdhani', sans-serif",
        transition: 'all 0.2s',
    },
    modeBtnActive: {
        background: 'rgba(0, 246, 255, 0.15)',
        color: '#00f6ff',
    },
    modeIcon: {
        width: '14px',
        height: '14px',
    },
    zoomControls: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(5, 15, 25, 0.95)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRadius: '4px',
        padding: '6px 8px',
    },
    zoomBtn: {
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 246, 255, 0.1)',
        border: '1px solid rgba(0, 246, 255, 0.3)',
        borderRadius: '2px',
        color: '#00f6ff',
        fontSize: '1.1rem',
        cursor: 'pointer',
        fontFamily: 'monospace',
    },
    zoomDisplay: {
        minWidth: '50px',
        textAlign: 'center',
        color: '#fff',
        fontSize: '0.8rem',
        fontWeight: 600,
        fontFamily: 'monospace',
    },
    resetBtn: {
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '2px',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.9rem',
        cursor: 'pointer',
        marginLeft: '4px',
    },
};

export default GridControls;
