import React, { useState, useEffect } from 'react';

/**
 * ZoomControls - Zoom in/out buttons and reset
 */
export default function ZoomControls() {
    const [zoom, setZoom] = useState(100);

    // Update zoom display
    useEffect(() => {
        const interval = setInterval(() => {
            if (window.getGridZoom) {
                setZoom(window.getGridZoom());
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleZoomIn = () => {
        if (window.setGridZoom) window.setGridZoom(1);
    };

    const handleZoomOut = () => {
        if (window.setGridZoom) window.setGridZoom(-1);
    };

    const handleReset = () => {
        if (window.resetGridCamera) window.resetGridCamera();
    };

    return (
        <div style={styles.container}>
            <button onClick={handleZoomOut} style={styles.btn}>−</button>
            <div style={styles.zoomDisplay}>{zoom}%</div>
            <button onClick={handleZoomIn} style={styles.btn}>+</button>
            <div style={styles.divider} />
            <button onClick={handleReset} style={styles.resetBtn}>⌂ RESET</button>
        </div>
    );
}

const styles = {
    container: {
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(0, 15, 30, 0.9)',
        border: '1px solid rgba(255, 204, 0, 0.3)',
        borderRadius: '8px',
        padding: '8px 12px',
        fontFamily: "'Rajdhani', sans-serif",
        zIndex: 100,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
    },
    btn: {
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 204, 0, 0.1)',
        border: '1px solid rgba(255, 204, 0, 0.3)',
        borderRadius: '6px',
        color: '#ffcc00',
        fontSize: '1.4rem',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    zoomDisplay: {
        minWidth: '50px',
        textAlign: 'center',
        color: '#fff',
        fontSize: '0.9rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
    },
    divider: {
        width: '1px',
        height: '28px',
        background: 'rgba(255, 255, 255, 0.15)',
    },
    resetBtn: {
        padding: '8px 14px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '6px',
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.05em',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: "'Rajdhani', sans-serif",
    },
};
