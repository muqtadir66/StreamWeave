import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGridStore } from '../../stores/gridStore';

/**
 * WeaveCamera - Orthographic camera for 200x50 grid
 * Pan + zoom only, no rotation
 */
export default function WeaveCamera() {
    const { camera, gl, size } = useThree();
    const cameraLocked = useGridStore(s => s.cameraLocked);
    const gridWidth = useGridStore(s => s.gridWidth);
    const gridHeight = useGridStore(s => s.gridHeight);

    // Pan state
    const isPanning = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const targetPosition = useRef({ x: 0, y: 0 });
    const currentPosition = useRef({ x: 0, y: 0 });

    // Zoom state
    const targetZoom = useRef(1);
    const currentZoom = useRef(1);

    // Limits
    const minZoom = 0.8;
    const maxZoom = 15;

    // Calculate frustum to fit 200x50 grid
    const updateCameraFrustum = () => {
        if (!camera.isOrthographicCamera) return;

        const aspect = size.width / size.height;
        // Base frustum size to fit the 200-wide grid
        const baseFrustumWidth = 110;
        const frustumWidth = baseFrustumWidth / currentZoom.current;
        const frustumHeight = frustumWidth / aspect;

        camera.left = -frustumWidth;
        camera.right = frustumWidth;
        camera.top = frustumHeight;
        camera.bottom = -frustumHeight;
        camera.updateProjectionMatrix();
    };

    // Initialize camera
    useEffect(() => {
        if (camera.isOrthographicCamera) {
            camera.position.set(0, 100, 0);
            camera.lookAt(0, 0, 0);
            camera.up.set(0, 0, -1);
            updateCameraFrustum();
        }
    }, [camera, size]);

    // Scroll wheel zoom
    useEffect(() => {
        const handleWheel = (e) => {
            if (cameraLocked) return;
            e.preventDefault();

            const zoomSpeed = 0.2;
            const delta = e.deltaY > 0 ? -1 : 1;
            targetZoom.current = Math.max(minZoom, Math.min(maxZoom,
                targetZoom.current * (1 + delta * zoomSpeed)
            ));
        };

        gl.domElement.addEventListener('wheel', handleWheel, { passive: false });
        return () => gl.domElement.removeEventListener('wheel', handleWheel);
    }, [gl, cameraLocked]);

    // Mouse pan
    useEffect(() => {
        const handleMouseDown = (e) => {
            if (cameraLocked || e.button !== 0) return;
            isPanning.current = true;
            lastMouse.current = { x: e.clientX, y: e.clientY };
            gl.domElement.style.cursor = 'grabbing';
        };

        const handleMouseMove = (e) => {
            if (!isPanning.current || cameraLocked) return;

            const dx = e.clientX - lastMouse.current.x;
            const dy = e.clientY - lastMouse.current.y;

            // Convert pixels to world units based on zoom
            const frustumWidth = 110 / currentZoom.current;
            const pixelsPerUnit = size.width / (frustumWidth * 2);

            targetPosition.current.x -= dx / pixelsPerUnit;
            targetPosition.current.y -= dy / pixelsPerUnit;

            // Clamp to grid bounds
            const boundX = (gridWidth / 2) / currentZoom.current;
            const boundY = (gridHeight / 2) / currentZoom.current;
            targetPosition.current.x = Math.max(-boundX, Math.min(boundX, targetPosition.current.x));
            targetPosition.current.y = Math.max(-boundY, Math.min(boundY, targetPosition.current.y));

            lastMouse.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseUp = () => {
            isPanning.current = false;
            gl.domElement.style.cursor = 'grab';
        };

        gl.domElement.style.cursor = 'grab';
        gl.domElement.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            gl.domElement.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [gl, cameraLocked, size, gridWidth, gridHeight]);

    // Smooth camera updates
    useFrame(() => {
        if (!camera.isOrthographicCamera) return;

        // Smooth zoom
        const zoomDiff = targetZoom.current - currentZoom.current;
        if (Math.abs(zoomDiff) > 0.001) {
            currentZoom.current += zoomDiff * 0.12;
            updateCameraFrustum();
        }

        // Smooth pan
        const posXDiff = targetPosition.current.x - currentPosition.current.x;
        const posYDiff = targetPosition.current.y - currentPosition.current.y;

        if (Math.abs(posXDiff) > 0.01 || Math.abs(posYDiff) > 0.01) {
            currentPosition.current.x += posXDiff * 0.12;
            currentPosition.current.y += posYDiff * 0.12;
            camera.position.x = currentPosition.current.x;
            camera.position.z = currentPosition.current.y;
        }
    });

    // Expose functions globally for UI controls
    useEffect(() => {
        window.resetGridCamera = () => {
            targetPosition.current = { x: 0, y: 0 };
            targetZoom.current = 1;
        };

        window.getGridZoom = () => Math.round(currentZoom.current * 100);

        window.setGridZoom = (delta) => {
            targetZoom.current = Math.max(minZoom, Math.min(maxZoom,
                targetZoom.current * (1 + delta * 0.3)
            ));
        };
    }, []);

    return null;
}
