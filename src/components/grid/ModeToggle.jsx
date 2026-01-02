import React from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * ModeToggle - Switch between Navigate and Select modes
 */
export default function ModeToggle() {
    const mode = useGridStore(s => s.mode);
    const toggleMode = useGridStore(s => s.toggleMode);
    const editorMode = useGridStore(s => s.editorMode);

    if (editorMode) return null;

    return (
        <div style={styles.container}>
            <button
                onClick={toggleMode}
                style={{
                    ...styles.toggle,
                    ...(mode === 'navigate' ? styles.activeNav : styles.activeSelect),
                }}
            >
                <span style={styles.icon}>
                    {mode === 'navigate' ? '🧭' : '✋'}
                </span>
                <span style={styles.label}>
                    {mode === 'navigate' ? 'NAVIGATE' : 'SELECT'}
                </span>
            </button>
            <div style={styles.hint}>
                {mode === 'navigate'
                    ? 'Drag to orbit • Scroll to zoom'
                    : 'Click to select • Drag to multi-select'
                }
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    toggle: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 20px',
        borderRadius: '8px',
        border: '2px solid',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        fontFamily: "'Rajdhani', sans-serif",
        transition: 'all 0.2s',
    },
    activeNav: {
        background: 'rgba(0, 150, 255, 0.15)',
        borderColor: 'rgba(0, 150, 255, 0.5)',
        color: '#00a8ff',
    },
    activeSelect: {
        background: 'rgba(255, 204, 0, 0.15)',
        borderColor: 'rgba(255, 204, 0, 0.5)',
        color: '#ffcc00',
    },
    icon: {
        fontSize: '1.1rem',
    },
    label: {
        textTransform: 'uppercase',
    },
    hint: {
        fontSize: '0.65rem',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: '0.05em',
        paddingLeft: '4px',
    },
};
