import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridBlocks - Simple, clean instanced blocks
 * Fewer blocks, larger, with proper colors and spacing
 */
function GridBlocks() {
    const meshRef = useRef();

    const blocks = useGridStore(s => s.blocks);
    const hoveredBlock = useGridStore(s => s.hoveredBlock);
    const selectedBlocks = useGridStore(s => s.selectedBlocks);
    const gridWidth = useGridStore(s => s.gridWidth);
    const gridHeight = useGridStore(s => s.gridHeight);

    // Block dimensions
    const blockWidth = 0.85;
    const blockDepth = 0.85;
    const blockHeight = 0.4;
    const spacing = 1.0;

    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Create color buffer
    const colorArray = useMemo(() => {
        const arr = new Float32Array(10000 * 3);
        // Initialize with purple base color
        for (let i = 0; i < 10000; i++) {
            arr[i * 3] = 0.15;     // R
            arr[i * 3 + 1] = 0.1;  // G
            arr[i * 3 + 2] = 0.25; // B
        }
        return arr;
    }, []);

    useFrame((state) => {
        if (!meshRef.current || blocks.length === 0) return;

        const mesh = meshRef.current;
        const colorAttr = mesh.geometry.attributes.color;
        const time = state.clock.elapsedTime;

        blocks.forEach((block, i) => {
            const isHovered = hoveredBlock === block.id;
            const isSelected = selectedBlocks.includes(block.id);

            // Position - center the grid
            const x = (block.x - gridWidth / 2 + 0.5) * spacing;
            const z = (block.z - gridHeight / 2 + 0.5) * spacing;

            // Gentle wave animation
            const wave = Math.sin(time * 0.5 + block.x * 0.05 + block.z * 0.08) * 0.05;
            const y = wave;

            // Scale up on hover
            const scale = isHovered ? 1.15 : (isSelected ? 1.1 : 1.0);

            dummy.position.set(x, y, z);
            dummy.scale.set(scale, 1, scale);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);

            // Colors
            let r, g, b;

            if (isSelected) {
                // Selected: bright gold
                r = 1.0; g = 0.85; b = 0.3;
            } else if (isHovered) {
                // Hovered: cyan
                r = 0.2; g = 0.9; b = 1.0;
            } else if (block.owner) {
                // Owned: gradient blue to gold
                const value = Math.min(1, (block.price - 1000) / 5000);
                r = 0.3 + value * 0.7;
                g = 0.4 + value * 0.4;
                b = 0.8 - value * 0.5;
            } else {
                // Unclaimed: deep purple with slight variation
                const variation = (Math.sin(block.x * 0.3) + Math.cos(block.z * 0.4)) * 0.03;
                r = 0.18 + variation;
                g = 0.12 + variation;
                b = 0.32 + variation;
            }

            colorAttr.setXYZ(i, r, g, b);
        });

        mesh.instanceMatrix.needsUpdate = true;
        colorAttr.needsUpdate = true;
    });

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, blocks.length || 10000]}
            frustumCulled={false}
        >
            <boxGeometry args={[blockWidth, blockHeight, blockDepth]}>
                <instancedBufferAttribute
                    attach="attributes-color"
                    args={[colorArray, 3]}
                />
            </boxGeometry>
            <meshStandardMaterial
                vertexColors
                roughness={0.4}
                metalness={0.2}
                emissive="#1a0a2a"
                emissiveIntensity={0.3}
            />
        </instancedMesh>
    );
}

/**
 * HoverHandler - Mouse interaction for block selection
 */
function HoverHandler({ meshRef }) {
    const { raycaster, camera, pointer } = useThree();
    const setHoveredBlock = useGridStore(s => s.setHoveredBlock);
    const selectBlock = useGridStore(s => s.selectBlock);

    useFrame(() => {
        if (!meshRef?.current) return;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(meshRef.current);

        if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
            setHoveredBlock(intersects[0].instanceId);
        } else {
            setHoveredBlock(null);
        }
    });

    return null;
}

/**
 * WeaveScene - Clean, minimal scene
 */
export default function WeaveScene() {
    const meshRef = useRef();
    const initializeBlocks = useGridStore(s => s.initializeBlocks);
    const blocks = useGridStore(s => s.blocks);

    useEffect(() => {
        if (blocks.length === 0) {
            initializeBlocks();
        }
    }, [blocks.length, initializeBlocks]);

    return (
        <>
            {/* Simple lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[0, 50, 0]} intensity={0.6} />
            <pointLight position={[0, 30, 0]} intensity={0.4} color="#ffcc00" />

            {/* Just the blocks - nothing else for now */}
            <GridBlocks />
        </>
    );
}
