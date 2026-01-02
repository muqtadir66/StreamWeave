import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import WeaveScene from '../components/grid/WeaveScene';
import WeaveCamera from '../components/grid/WeaveCamera';
import WeaveTitle from '../components/grid/WeaveTitle';
import ZoomControls from '../components/grid/ZoomControls';
import { useGridStore } from '../stores/gridStore';

/**
 * Grid Page - The Weave 3D billboard
 */
function Grid() {
    const initializeBlocks = useGridStore(s => s.initializeBlocks);
    const blocks = useGridStore(s => s.blocks);

    useEffect(() => {
        if (blocks.length === 0) {
            initializeBlocks();
        }
    }, [blocks.length, initializeBlocks]);

    return (
        <div style={styles.container}>
            {/* Fonts */}
            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&family=Rajdhani:wght@500;600;700&display=swap');`}
            </style>

            {/* Three.js Canvas */}
            <Canvas
                orthographic
                camera={{
                    position: [0, 100, 0],
                    zoom: 1,
                    near: 0.1,
                    far: 1000,
                    up: [0, 0, -1],
                }}
                gl={{ antialias: true }}
                dpr={[1, 1.5]}
                style={{ background: 'linear-gradient(180deg, #0a0015 0%, #1a0a2e 40%, #2d1b4e 70%, #1a1a3e 100%)' }}
            >
                <WeaveCamera />
                <WeaveScene />
            </Canvas>

            {/* UI */}
            <WeaveTitle />
            <ZoomControls />

            {/* Stats */}
            <div style={styles.stats}>
                10,000 BLOCKS • 0 CLAIMED
            </div>

            {/* Hint */}
            <div style={styles.hint}>
                DRAG to pan • SCROLL to zoom
            </div>
        </div>
    );
}

const styles = {
    container: {
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
    },
    stats: {
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: '0.1em',
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 600,
        zIndex: 100,
    },
    hint: {
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.7rem',
        color: 'rgba(255, 255, 255, 0.25)',
        letterSpacing: '0.1em',
        fontFamily: "'Rajdhani', sans-serif",
        zIndex: 100,
    },
};

export default Grid;
