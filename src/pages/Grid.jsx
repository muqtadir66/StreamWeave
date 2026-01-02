import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import WeaveScene from '../components/grid/WeaveScene';
import GridHUD from '../components/grid/GridHUD';

export default function Grid() {
    return (
        <div style={{ width: '100vw', height: '100vh', background: '#050505', position: 'relative' }}>

            {/* 1. THE 3D CANVAS */}
            <Canvas
                shadows
                camera={{ position: [50, 60, 50], fov: 45 }}
                gl={{ antialias: false }}
            >
                <WeaveScene />

                {/* Controls: Restricted to feel like a map */}
                <OrbitControls
                    maxPolarAngle={Math.PI / 2.2}
                    minDistance={20}
                    maxDistance={150}
                    enablePan={true}
                    panSpeed={2}
                />

                {/* Cyberpunk Glow Effects */}
                <EffectComposer disableNormalPass>
                    <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.5} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                </EffectComposer>
            </Canvas>

            {/* 2. THE UI OVERLAY */}
            <GridHUD />
        </div>
    );
}