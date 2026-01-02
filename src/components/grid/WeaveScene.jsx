import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGridStore } from '../../stores/gridStore';

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

export default function WeaveScene() {
    const meshRef = useRef();
    const blocks = useGridStore(s => s.blocks);
    const hoveredBlock = useGridStore(s => s.hoveredBlock);
    const selectedBlock = useGridStore(s => s.selectedBlock);
    const initializeBlocks = useGridStore(s => s.initializeBlocks);
    const gridSize = useGridStore(s => s.gridSize);

    // Init Logic
    useEffect(() => {
        initializeBlocks();
    }, [initializeBlocks]);

    // Animation Loop
    useFrame(({ clock }) => {
        if (!meshRef.current || blocks.length === 0) return;

        const time = clock.getElapsedTime();
        const hoverId = hoveredBlock;
        const selectId = selectedBlock?.id;

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];

            // Position: Center the grid at (0,0,0)
            // Spacing: 1.05 puts a small gap between blocks (streets)
            const x = (block.x - gridSize / 2) * 1.05;
            const z = (block.z - gridSize / 2) * 1.05;

            // Height Animation: Owned blocks "breathe" slightly
            let h = block.height;
            if (block.isOwned) {
                h += Math.sin(time * 2 + x * 0.1 + z * 0.1) * 0.05;
            }

            // Interaction: Hover scales up
            if (i === hoverId) h = Math.max(h, 1.5);
            if (i === selectId) h = Math.max(h, 2.0);

            tempObject.position.set(x, h / 2, z);
            tempObject.scale.set(1, h, 1);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);

            // Color Logic
            if (i === selectId) {
                tempColor.setHex(0xffaa00); // GOLD (Selected)
            } else if (i === hoverId) {
                tempColor.setHex(0xffffff); // WHITE (Hover)
            } else if (block.isOwned) {
                tempColor.setRGB(block.color[0] / 255, block.color[1] / 255, block.color[2] / 255);
            } else {
                tempColor.setHex(0x111116); // DARK VOID (Empty)
            }
            meshRef.current.setColorAt(i, tempColor);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <group>
            {/* 10,000 Blocks rendered as ONE mesh for performance */}
            <instancedMesh
                ref={meshRef}
                args={[null, null, 10000]}
                onPointerMove={(e) => {
                    e.stopPropagation();
                    useGridStore.getState().setHoveredBlock(e.instanceId);
                }}
                onPointerOut={(e) => {
                    useGridStore.getState().setHoveredBlock(null);
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    useGridStore.getState().setSelectedBlock(e.instanceId);
                }}
            >
                <boxGeometry args={[0.9, 1, 0.9]} />
                <meshStandardMaterial
                    roughness={0.2}
                    metalness={0.8}
                    emissiveIntensity={0.5}
                />
            </instancedMesh>

            {/* Reflective Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <planeGeometry args={[300, 300]} />
                <meshStandardMaterial color="#050505" roughness={0.1} metalness={0.8} />
            </mesh>

            {/* City Lights */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[50, 100, 50]} intensity={1.5} color="#00f6ff" />
            <pointLight position={[-50, 20, -50]} intensity={2} color="#d946ef" distance={100} />
        </group>
    );
}