import React, { useRef, useEffect, useCallback } from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridCanvas - High-performance zoomable canvas for the 1000x1000 grid
 * Uses HTML5 Canvas 2D context for efficient rendering
 * Implements virtual rendering to only draw visible blocks
 * Supports multi-block selection with Ctrl/Cmd+Click
 */
function GridCanvas() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const dragStartPos = useRef({ x: 0, y: 0 });
    const animFrameRef = useRef(null);

    const viewport = useGridStore(s => s.viewport);
    const blocks = useGridStore(s => s.blocks);
    const selectedBlockIds = useGridStore(s => s.selectedBlockIds);
    const hoveredBlockId = useGridStore(s => s.hoveredBlockId);
    const pan = useGridStore(s => s.pan);
    const zoom = useGridStore(s => s.zoom);
    const selectBlock = useGridStore(s => s.selectBlock);
    const toggleBlockSelection = useGridStore(s => s.toggleBlockSelection);
    const hoverBlock = useGridStore(s => s.hoverBlock);

    const GRID_SIZE = 100;
    const BLOCK_SIZE = 10;

    // Convert canvas coordinates to grid coordinates
    const canvasToGrid = useCallback((canvasX, canvasY) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const x = canvasX - rect.left;
        const y = canvasY - rect.top;

        const blockSize = BLOCK_SIZE * viewport.zoom;
        const offsetX = (canvas.width / 2) - (viewport.x * blockSize);
        const offsetY = (canvas.height / 2) - (viewport.y * blockSize);

        const gridX = Math.floor((x - offsetX) / blockSize);
        const gridY = Math.floor((y - offsetY) / blockSize);

        if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
            return null;
        }

        return { x: gridX, y: gridY, id: gridY * 100 + gridX };
    }, [viewport]);

    // Draw the grid
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;

        // Clear canvas
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, width, height);

        const blockSize = BLOCK_SIZE * viewport.zoom;
        const offsetX = (width / 2) - (viewport.x * blockSize);
        const offsetY = (height / 2) - (viewport.y * blockSize);

        // Calculate visible range
        const startX = Math.max(0, Math.floor(-offsetX / blockSize));
        const startY = Math.max(0, Math.floor(-offsetY / blockSize));
        const endX = Math.min(GRID_SIZE, Math.ceil((width - offsetX) / blockSize));
        const endY = Math.min(GRID_SIZE, Math.ceil((height - offsetY) / blockSize));

        // Draw empty grid
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;

        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) {
                const screenX = offsetX + x * blockSize;
                const screenY = offsetY + y * blockSize;

                // Draw empty block border
                ctx.strokeRect(screenX, screenY, blockSize, blockSize);
            }
        }

        // Draw owned blocks
        blocks.forEach((block) => {
            if (block.x < startX || block.x >= endX || block.y < startY || block.y >= endY) {
                return;
            }

            const screenX = offsetX + block.x * blockSize;
            const screenY = offsetY + block.y * blockSize;

            // Fill with block color
            ctx.fillStyle = block.color || '#00f6ff';
            ctx.fillRect(screenX + 1, screenY + 1, blockSize - 2, blockSize - 2);

            // Neon border glow effect
            ctx.shadowColor = block.color || '#00f6ff';
            ctx.shadowBlur = 8;
            ctx.strokeStyle = block.color || '#00f6ff';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX + 1, screenY + 1, blockSize - 2, blockSize - 2);
            ctx.shadowBlur = 0;
        });

        // Draw hovered block (if not already selected)
        if (hoveredBlockId !== null && !selectedBlockIds.includes(hoveredBlockId)) {
            const x = hoveredBlockId % 100;
            const y = Math.floor(hoveredBlockId / 100);
            const screenX = offsetX + x * blockSize;
            const screenY = offsetY + y * blockSize;

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, blockSize, blockSize);
        }

        // Draw ALL selected blocks with targeting brackets
        selectedBlockIds.forEach((blockId, index) => {
            const x = blockId % 100;
            const y = Math.floor(blockId / 100);
            const screenX = offsetX + x * blockSize;
            const screenY = offsetY + y * blockSize;
            const bracketSize = Math.min(blockSize * 0.3, 8);
            const padding = 4;

            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10;

            // Top-left bracket
            ctx.beginPath();
            ctx.moveTo(screenX - padding, screenY - padding + bracketSize);
            ctx.lineTo(screenX - padding, screenY - padding);
            ctx.lineTo(screenX - padding + bracketSize, screenY - padding);
            ctx.stroke();

            // Top-right bracket
            ctx.beginPath();
            ctx.moveTo(screenX + blockSize + padding - bracketSize, screenY - padding);
            ctx.lineTo(screenX + blockSize + padding, screenY - padding);
            ctx.lineTo(screenX + blockSize + padding, screenY - padding + bracketSize);
            ctx.stroke();

            // Bottom-left bracket
            ctx.beginPath();
            ctx.moveTo(screenX - padding, screenY + blockSize + padding - bracketSize);
            ctx.lineTo(screenX - padding, screenY + blockSize + padding);
            ctx.lineTo(screenX - padding + bracketSize, screenY + blockSize + padding);
            ctx.stroke();

            // Bottom-right bracket
            ctx.beginPath();
            ctx.moveTo(screenX + blockSize + padding - bracketSize, screenY + blockSize + padding);
            ctx.lineTo(screenX + blockSize + padding, screenY + blockSize + padding);
            ctx.lineTo(screenX + blockSize + padding, screenY + blockSize + padding - bracketSize);
            ctx.stroke();

            ctx.shadowBlur = 0;

            // Block number overlay (show selection order for multi-select)
            if (selectedBlockIds.length > 1) {
                ctx.fillStyle = 'rgba(255, 68, 68, 0.9)';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${index + 1}`, screenX + blockSize / 2, screenY - 8);
            } else {
                // Single selection - show block ID
                ctx.fillStyle = 'rgba(255, 68, 68, 0.9)';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`#${blockId}`, screenX + blockSize / 2, screenY - 10);
            }
        });

        // Draw coordinate overlay in corner
        ctx.fillStyle = 'rgba(0, 246, 255, 0.8)';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`GRID: ${GRID_SIZE}×${GRID_SIZE} | ZOOM: ${Math.round(viewport.zoom * 100)}%`, 10, 20);
        ctx.fillText(`VIEW: (${Math.round(viewport.x)}, ${Math.round(viewport.y)})`, 10, 35);

        // Show selection count if multiple selected
        if (selectedBlockIds.length > 0) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText(`SELECTED: ${selectedBlockIds.length} block${selectedBlockIds.length > 1 ? 's' : ''}`, 10, 50);
        }

    }, [viewport, blocks, selectedBlockIds, hoveredBlockId]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            draw();
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [draw]);

    // Redraw on state changes
    useEffect(() => {
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
        }
        animFrameRef.current = requestAnimationFrame(draw);
        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [draw]);

    // Mouse handlers
    const handleMouseDown = (e) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        dragStartPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
        const gridCoord = canvasToGrid(e.clientX, e.clientY);
        hoverBlock(gridCoord?.id ?? null);

        if (isDragging.current) {
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            pan(-dx, -dy);
            lastPos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = (e) => {
        if (isDragging.current) {
            const dx = Math.abs(e.clientX - dragStartPos.current.x);
            const dy = Math.abs(e.clientY - dragStartPos.current.y);

            // If minimal movement, treat as click
            if (dx < 5 && dy < 5) {
                const gridCoord = canvasToGrid(e.clientX, e.clientY);

                if (gridCoord) {
                    // Check for Ctrl/Cmd key for multi-select
                    if (e.ctrlKey || e.metaKey) {
                        toggleBlockSelection(gridCoord.id);
                    } else {
                        selectBlock(gridCoord.id);
                    }
                } else {
                    // Clicked outside grid, clear selection
                    selectBlock(null);
                }
            }
        }
        isDragging.current = false;
    };

    const handleMouseLeave = () => {
        isDragging.current = false;
        hoverBlock(null);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY);
        zoom(delta, e.clientX, e.clientY);
    };

    // Touch handlers
    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            isDragging.current = true;
            lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            dragStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchMove = (e) => {
        if (isDragging.current && e.touches.length === 1) {
            const dx = e.touches[0].clientX - lastPos.current.x;
            const dy = e.touches[0].clientY - lastPos.current.y;
            pan(-dx, -dy);
            lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchEnd = (e) => {
        // Single tap detection for touch
        if (isDragging.current && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const dx = Math.abs(touch.clientX - dragStartPos.current.x);
            const dy = Math.abs(touch.clientY - dragStartPos.current.y);

            if (dx < 10 && dy < 10) {
                const gridCoord = canvasToGrid(touch.clientX, touch.clientY);
                if (gridCoord) {
                    // On touch, toggle selection (acts like ctrl+click)
                    toggleBlockSelection(gridCoord.id);
                }
            }
        }
        isDragging.current = false;
    };

    return (
        <div
            ref={containerRef}
            style={styles.container}
        >
            <canvas
                ref={canvasRef}
                style={styles.canvas}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            />
        </div>
    );
}

const styles = {
    container: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#0a0a14',
    },
    canvas: {
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
        touchAction: 'none',
    },
};

export default GridCanvas;
