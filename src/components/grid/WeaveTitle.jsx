import React from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * WeaveTitle - "THE WEAVE" title overlay
 * Golden yellow Orbitron font with subtle glow
 */
export default function WeaveTitle() {
    const editorMode = useGridStore(s => s.editorMode);

    return (
        <div style={{
            ...styles.container,
            opacity: editorMode ? 0.3 : 1,
        }}>
            <h1 style={styles.title}>
                THE <span style={styles.highlight}>WEAVE</span>
            </h1>
        </div>
    );
}

const styles = {
    container: {
        position: 'absolute',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
    },
    title: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
        fontWeight: 900,
        color: '#ffcc00',
        margin: 0,
        letterSpacing: '0.15em',
        textShadow: '0 0 30px rgba(255, 204, 0, 0.5), 0 0 60px rgba(255, 204, 0, 0.3)',
        userSelect: 'none',
    },
    highlight: {
        color: '#ffcc00',
    },
};
