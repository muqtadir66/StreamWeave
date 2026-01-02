import React, { useRef, useEffect, useState } from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * SelectionBox - Visual rectangle during drag selection
 * Shows a glowing box that follows the mouse during drag
 */
export default function SelectionBox() {
    const mode = useGridStore(s => s.mode);
    const editorMode = useGridStore(s => s.editorMode);
    const [box, setBox] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const startPos = useRef(null);

    useEffect(() => {
        if (mode !== 'select' || editorMode) return;

        const handleMouseDown = (e) => {
            // Only left click
            if (e.button !== 0) return;

            startPos.current = { x: e.clientX, y: e.clientY };
            setIsDrawing(true);
            setBox({
                left: e.clientX,
                top: e.clientY,
                width: 0,
                height: 0,
            });
        };

        const handleMouseMove = (e) => {
            if (!isDrawing || !startPos.current) return;

            const x1 = Math.min(startPos.current.x, e.clientX);
            const y1 = Math.min(startPos.current.y, e.clientY);
            const x2 = Math.max(startPos.current.x, e.clientX);
            const y2 = Math.max(startPos.current.y, e.clientY);

            setBox({
                left: x1,
                top: y1,
                width: x2 - x1,
                height: y2 - y1,
            });
        };

        const handleMouseUp = () => {
            setIsDrawing(false);
            setBox(null);
            startPos.current = null;
        };

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [mode, editorMode, isDrawing]);

    if (!box || box.width < 5 || box.height < 5) return null;

    return (
        <div style={{
            ...styles.box,
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
        }} />
    );
}

const styles = {
    box: {
        position: 'fixed',
        border: '2px solid #ffcc00',
        background: 'rgba(255, 204, 0, 0.1)',
        boxShadow: '0 0 20px rgba(255, 204, 0, 0.3), inset 0 0 20px rgba(255, 204, 0, 0.1)',
        pointerEvents: 'none',
        zIndex: 1000,
    },
};
