import React, { useRef, useEffect, useCallback } from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridCanvas - Simplified, correct implementation
 * Uses display coordinates throughout, DPR only for crisp rendering
 */
function GridCanvas() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const displaySize = useRef({ width: 0, height: 0 });
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const dragStart = useRef({ x: 0, y: 0 }); // Track start for click detection
    const lastPinchDist = useRef(0);

    const viewport = useGridStore(s => s.viewport);
    const blocks = useGridStore(s => s.blocks);
    const selectedBlocks = useGridStore(s => s.selectedBlocks);
    const hoveredBlockId = useGridStore(s => s.hoveredBlockId);
    const mode = useGridStore(s => s.mode);
    const selectionStart = useGridStore(s => s.selectionStart);
    const selectionEnd = useGridStore(s => s.selectionEnd);
    const isSelecting = useGridStore(s => s.isSelecting);

    const pan = useGridStore(s => s.pan);
    const zoomAction = useGridStore(s => s.zoom);
    const selectSingleBlock = useGridStore(s => s.selectSingleBlock);
    const startSelection = useGridStore(s => s.startSelection);
    const updateSelection = useGridStore(s => s.updateSelection);
    const endSelection = useGridStore(s => s.endSelection);
    const hoverBlock = useGridStore(s => s.hoverBlock);

    const GRID_SIZE = 100;
    const BLOCK_SIZE = 10; // Pixels per block at zoom 1

    // Convert client coordinates to grid coordinates
    // Uses display dimensions, NOT canvas internal dimensions
    const clientToGrid = useCallback((clientX, clientY) => {
        const container = containerRef.current;
        if (!container) return null;

        const rect = container.getBoundingClientRect();
        const displayWidth = rect.width;
        const displayHeight = rect.height;

        // Position relative to canvas top-left in display pixels
        const px = clientX - rect.left;
        const py = clientY - rect.top;

        // Calculate block size in display pixels
        const blockSize = BLOCK_SIZE * viewport.zoom;

        // Calculate offset to center viewport on (viewport.x, viewport.y)
        const offsetX = (displayWidth / 2) - (viewport.x * blockSize);
        const offsetY = (displayHeight / 2) - (viewport.y * blockSize);

        // Convert to grid coordinates
        const gridX = Math.floor((px - offsetX) / blockSize);
        const gridY = Math.floor((py - offsetY) / blockSize);

        // Bounds check
        if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
            return null;
        }

        return { x: gridX, y: gridY, id: gridY * 100 + gridX };
    }, [viewport.x, viewport.y, viewport.zoom]);

    // Draw the grid
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || displaySize.current.width === 0) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = displaySize.current.width;
        const height = displaySize.current.height;

        // Reset transform and scale for DPR
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, width, height);

        const blockSize = BLOCK_SIZE * viewport.zoom;
        const offsetX = (width / 2) - (viewport.x * blockSize);
        const offsetY = (height / 2) - (viewport.y * blockSize);

        // Calculate visible grid range
        const startX = Math.max(0, Math.floor(-offsetX / blockSize));
        const startY = Math.max(0, Math.floor(-offsetY / blockSize));
        const endX = Math.min(GRID_SIZE, Math.ceil((width - offsetX) / blockSize));
        const endY = Math.min(GRID_SIZE, Math.ceil((height - offsetY) / blockSize));

        // Draw grid background (the 100x100 area)
        const gridLeft = offsetX;
        const gridTop = offsetY;
        const gridWidth = GRID_SIZE * blockSize;
        const gridHeight = GRID_SIZE * blockSize;
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(gridLeft, gridTop, gridWidth, gridHeight);

        // Draw grid lines
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;

        for (let x = startX; x <= endX; x++) {
            const screenX = Math.round(offsetX + x * blockSize);
            ctx.beginPath();
            ctx.moveTo(screenX + 0.5, Math.max(0, gridTop));
            ctx.lineTo(screenX + 0.5, Math.min(height, gridTop + gridHeight));
            ctx.stroke();
        }

        for (let y = startY; y <= endY; y++) {
            const screenY = Math.round(offsetY + y * blockSize);
            ctx.beginPath();
            ctx.moveTo(Math.max(0, gridLeft), screenY + 0.5);
            ctx.lineTo(Math.min(width, gridLeft + gridWidth), screenY + 0.5);
            ctx.stroke();
        }

        // Draw owned blocks
        blocks.forEach((block) => {
            if (block.x < startX - 1 || block.x > endX || block.y < startY - 1 || block.y > endY) return;

            const screenX = offsetX + block.x * blockSize;
            const screenY = offsetY + block.y * blockSize;

            ctx.fillStyle = block.color || '#00f6ff';
            ctx.fillRect(screenX + 1, screenY + 1, blockSize - 2, blockSize - 2);
        });

        // Draw selected blocks
        if (selectedBlocks.size > 0) {
            selectedBlocks.forEach(blockId => {
                const x = blockId % 100;
                const y = Math.floor(blockId / 100);
                if (x < startX - 1 || x > endX || y < startY - 1 || y > endY) return;

                const screenX = offsetX + x * blockSize;
                const screenY = offsetY + y * blockSize;

                // Highlight fill
                ctx.fillStyle = 'rgba(0, 246, 255, 0.35)';
                ctx.fillRect(screenX, screenY, blockSize, blockSize);

                // Border
                ctx.strokeStyle = '#00f6ff';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX + 1, screenY + 1, blockSize - 2, blockSize - 2);
            });
        }

        // Draw hover block
        if (hoveredBlockId !== null && !selectedBlocks.has(hoveredBlockId)) {
            const x = hoveredBlockId % 100;
            const y = Math.floor(hoveredBlockId / 100);
            const screenX = offsetX + x * blockSize;
            const screenY = offsetY + y * blockSize;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX + 0.5, screenY + 0.5, blockSize - 1, blockSize - 1);
        }

        // Draw selection rectangle during drag
        if (isSelecting && selectionStart && selectionEnd) {
            const minX = Math.min(selectionStart.x, selectionEnd.x);
            const minY = Math.min(selectionStart.y, selectionEnd.y);
            const maxX = Math.max(selectionStart.x, selectionEnd.x);
            const maxY = Math.max(selectionStart.y, selectionEnd.y);

            const sx = offsetX + minX * blockSize;
            const sy = offsetY + minY * blockSize;
            const sw = (maxX - minX + 1) * blockSize;
            const sh = (maxY - minY + 1) * blockSize;

            ctx.fillStyle = 'rgba(0, 246, 255, 0.2)';
            ctx.fillRect(sx, sy, sw, sh);

            ctx.strokeStyle = '#00f6ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(sx, sy, sw, sh);
            ctx.setLineDash([]);
        }

    }, [viewport, blocks, selectedBlocks, hoveredBlockId, isSelecting, selectionStart, selectionEnd]);

    // Setup canvas on mount and resize
    useEffect(() => {
        const setupCanvas = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            displaySize.current = { width: rect.width, height: rect.height };

            // Set canvas internal size (scaled for DPR)
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            // Set canvas display size
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';

            draw();
        };

        const resizeObserver = new ResizeObserver(setupCanvas);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        setupCanvas();

        return () => resizeObserver.disconnect();
    }, [draw]);

    // Redraw on state changes
    useEffect(() => {
        const handle = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(handle);
    }, [draw]);

    // Mouse handlers
    const handleMouseDown = (e) => {
        e.preventDefault();
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        dragStart.current = { x: e.clientX, y: e.clientY };

        if (mode === 'select') {
            const gridCoord = clientToGrid(e.clientX, e.clientY);
            if (gridCoord) {
                startSelection(gridCoord.x, gridCoord.y);
            }
        }
    };

    const handleMouseMove = (e) => {
        const gridCoord = clientToGrid(e.clientX, e.clientY);
        hoverBlock(gridCoord?.id ?? null);

        if (!isDragging.current) return;

        if (mode === 'navigate') {
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            pan(dx, dy);
            lastPos.current = { x: e.clientX, y: e.clientY };
        } else if (mode === 'select' && gridCoord) {
            updateSelection(gridCoord.x, gridCoord.y);
        }
    };

    const handleMouseUp = (e) => {
        if (!isDragging.current) return;

        if (mode === 'select') {
            endSelection();
        } else if (mode === 'navigate') {
            // Was it a click (minimal movement)?
            const dx = Math.abs(e.clientX - dragStart.current.x);
            const dy = Math.abs(e.clientY - dragStart.current.y);
            if (dx < 5 && dy < 5) {
                const gridCoord = clientToGrid(e.clientX, e.clientY);
                if (gridCoord) selectSingleBlock(gridCoord.id);
            }
        }

        isDragging.current = false;
    };

    // Touch handlers
    const handleTouchStart = (e) => {
        e.preventDefault();

        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
            isDragging.current = false;
            return;
        }

        if (e.touches.length === 1) {
            const t = e.touches[0];
            isDragging.current = true;
            lastPos.current = { x: t.clientX, y: t.clientY };
            dragStart.current = { x: t.clientX, y: t.clientY };

            if (mode === 'select') {
                const gridCoord = clientToGrid(t.clientX, t.clientY);
                if (gridCoord) startSelection(gridCoord.x, gridCoord.y);
            }
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault();

        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (lastPinchDist.current > 0) {
                const delta = (dist - lastPinchDist.current) * 0.02;
                zoomAction(delta);
            }
            lastPinchDist.current = dist;
            return;
        }

        if (isDragging.current && e.touches.length === 1) {
            const t = e.touches[0];

            if (mode === 'navigate') {
                const dx = t.clientX - lastPos.current.x;
                const dy = t.clientY - lastPos.current.y;
                pan(dx, dy);
                lastPos.current = { x: t.clientX, y: t.clientY };
            } else if (mode === 'select') {
                const gridCoord = clientToGrid(t.clientX, t.clientY);
                if (gridCoord) updateSelection(gridCoord.x, gridCoord.y);
            }
        }
    };

    const handleTouchEnd = (e) => {
        if (e.touches.length === 0) {
            if (isDragging.current && mode === 'select') {
                endSelection();
            } else if (isDragging.current && mode === 'navigate') {
                const t = e.changedTouches[0];
                if (t) {
                    const dx = Math.abs(t.clientX - dragStart.current.x);
                    const dy = Math.abs(t.clientY - dragStart.current.y);
                    if (dx < 10 && dy < 10) {
                        const gridCoord = clientToGrid(t.clientX, t.clientY);
                        if (gridCoord) selectSingleBlock(gridCoord.id);
                    }
                }
            }
            isDragging.current = false;
            lastPinchDist.current = 0;
        }
    };

    const handleWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = -Math.sign(e.deltaY) * 0.3;
        zoomAction(delta);
    };

    return (
        <div
            ref={containerRef}
            style={styles.container}
            onWheel={handleWheel}
        >
            <canvas
                ref={canvasRef}
                style={{
                    ...styles.canvas,
                    cursor: mode === 'select' ? 'crosshair' : (isDragging.current ? 'grabbing' : 'grab'),
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { isDragging.current = false; hoverBlock(null); }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            />
        </div>
    );
}

const styles = {
    container: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#0a0a15',
    },
    canvas: {
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
    },
};

export default GridCanvas;
