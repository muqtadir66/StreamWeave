import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * GridCanvas - High-performance zoomable canvas for the 100x100 grid
 * Uses HTML5 Canvas 2D context for efficient rendering
 * Implements virtual rendering to only draw visible blocks
 * Supports multi-block selection with Ctrl/Cmd+Click, double-click drag, and arrow keys
 */
function GridCanvas() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const isSelecting = useRef(false); // For rectangle selection mode
    const lastPos = useRef({ x: 0, y: 0 });
    const dragStartPos = useRef({ x: 0, y: 0 });
    const selectionStartGrid = useRef(null); // Grid coord where selection started
    const animFrameRef = useRef(null);
    const lastClickTime = useRef(0); // For double-click detection
    const lastClickPos = useRef({ x: 0, y: 0 });
    // Touch-specific refs
    const lastTouchTime = useRef(0); // For double-tap detection
    const lastTouchPos = useRef({ x: 0, y: 0 });
    const initialPinchDistance = useRef(null); // For pinch-to-zoom
    const isPinching = useRef(false);
    const touchStartTime = useRef(0); // For tap duration detection

    // Rectangle selection state - now stores grid coordinates for snapping
    const [selectionRect, setSelectionRect] = useState(null); // { startX, startY, endX, endY } in grid coords
    // Preview of blocks that will be selected during drag
    const [previewBlockIds, setPreviewBlockIds] = useState([]);

    const viewport = useGridStore(s => s.viewport);
    const blocks = useGridStore(s => s.blocks);
    const selectedBlockIds = useGridStore(s => s.selectedBlockIds);
    const hoveredBlockId = useGridStore(s => s.hoveredBlockId);
    const selectMode = useGridStore(s => s.selectMode);
    const pan = useGridStore(s => s.pan);
    const zoom = useGridStore(s => s.zoom);
    const selectBlock = useGridStore(s => s.selectBlock);
    const toggleBlockSelection = useGridStore(s => s.toggleBlockSelection);
    const selectRectangle = useGridStore(s => s.selectRectangle);
    const moveSelection = useGridStore(s => s.moveSelection);
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

    // Convert grid coordinates to screen coordinates (for block-snapped rectangles)
    const gridToScreen = useCallback((gridX, gridY) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const blockSize = BLOCK_SIZE * viewport.zoom;
        const offsetX = (canvas.width / 2) - (viewport.x * blockSize);
        const offsetY = (canvas.height / 2) - (viewport.y * blockSize);

        return {
            x: offsetX + gridX * blockSize,
            y: offsetY + gridY * blockSize,
            size: blockSize
        };
    }, [viewport]);

    // Draw the grid
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;

        // Clear canvas
        ctx.fillStyle = '#0d0a08';
        ctx.fillRect(0, 0, width, height);

        const blockSize = BLOCK_SIZE * viewport.zoom;
        const offsetX = (width / 2) - (viewport.x * blockSize);
        const offsetY = (height / 2) - (viewport.y * blockSize);

        // Calculate visible range
        const startX = Math.max(0, Math.floor(-offsetX / blockSize));
        const startY = Math.max(0, Math.floor(-offsetY / blockSize));
        const endX = Math.min(GRID_SIZE, Math.ceil((width - offsetX) / blockSize));
        const endY = Math.min(GRID_SIZE, Math.ceil((height - offsetY) / blockSize));

        // Create Set for O(1) selection lookups (major performance improvement)
        const selectedSet = new Set(selectedBlockIds);
        const previewSet = new Set(previewBlockIds);

        // Draw empty grid
        ctx.strokeStyle = '#1a1510';
        ctx.lineWidth = 1;

        for (let x = startX; x < endX; x++) {
            for (let y = startY; y < endY; y++) {
                const screenX = offsetX + x * blockSize;
                const screenY = offsetY + y * blockSize;

                // Draw empty block border
                ctx.strokeRect(screenX, screenY, blockSize, blockSize);
            }
        }

        // Draw owned blocks - NO SHADOW for performance!
        blocks.forEach((block) => {
            if (block.x < startX || block.x >= endX || block.y < startY || block.y >= endY) {
                return;
            }

            const screenX = offsetX + block.x * blockSize;
            const screenY = offsetY + block.y * blockSize;

            // Fill with block color (no shadow for performance)
            ctx.fillStyle = block.color || '#ffcc00';
            ctx.fillRect(screenX + 1, screenY + 1, blockSize - 2, blockSize - 2);

            // Simple border, no glow
            ctx.strokeStyle = block.color || '#ffcc00';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX + 1, screenY + 1, blockSize - 2, blockSize - 2);
        });

        // Draw hovered block (if not already selected) - O(1) lookup now
        if (hoveredBlockId !== null && !selectedSet.has(hoveredBlockId)) {
            const x = hoveredBlockId % 100;
            const y = Math.floor(hoveredBlockId / 100);

            // Viewport culling
            if (x >= startX && x < endX && y >= startY && y < endY) {
                const screenX = offsetX + x * blockSize;
                const screenY = offsetY + y * blockSize;

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX, screenY, blockSize, blockSize);
            }
        }

        // Draw selected blocks - use bounding box for very large selections
        if (selectedBlockIds.length > 500) {
            // For large selections, just draw a bounding box (MUCH faster)
            let minX = 99, maxX = 0, minY = 99, maxY = 0;
            selectedBlockIds.forEach((blockId) => {
                const x = blockId % 100;
                const y = Math.floor(blockId / 100);
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            });

            const boxX = offsetX + minX * blockSize;
            const boxY = offsetY + minY * blockSize;
            const boxWidth = (maxX - minX + 1) * blockSize;
            const boxHeight = (maxY - minY + 1) * blockSize;

            // Draw bounding box
            ctx.fillStyle = 'rgba(255, 68, 68, 0.1)';
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            ctx.strokeStyle = 'rgba(255, 68, 68, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

            // Draw count text
            ctx.fillStyle = 'rgba(255, 68, 68, 0.9)';
            ctx.font = `bold ${Math.max(12, blockSize * 0.5)}px Rajdhani`;
            ctx.textAlign = 'center';
            ctx.fillText(`${selectedBlockIds.length} blocks`, boxX + boxWidth / 2, boxY + boxHeight / 2);
        } else {
            // For smaller selections, draw individual blocks with viewport culling
            selectedBlockIds.forEach((blockId) => {
                const x = blockId % 100;
                const y = Math.floor(blockId / 100);

                // Skip off-screen blocks
                if (x < startX || x >= endX || y < startY || y >= endY) {
                    return;
                }

                const screenX = offsetX + x * blockSize;
                const screenY = offsetY + y * blockSize;

                ctx.strokeStyle = 'rgba(255, 68, 68, 0.6)';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX, screenY, blockSize, blockSize);

                ctx.fillStyle = 'rgba(255, 68, 68, 0.15)';
                ctx.fillRect(screenX, screenY, blockSize, blockSize);
            });
        }

        // Draw preview - use bounding box for large previews
        if (previewBlockIds.length > 500) {
            // For large previews, use selectionRect directly (faster than calculating bounds)
            if (selectionRect) {
                const rectMinX = Math.min(selectionRect.startX, selectionRect.endX);
                const rectMaxX = Math.max(selectionRect.startX, selectionRect.endX);
                const rectMinY = Math.min(selectionRect.startY, selectionRect.endY);
                const rectMaxY = Math.max(selectionRect.startY, selectionRect.endY);

                const boxX = offsetX + rectMinX * blockSize;
                const boxY = offsetY + rectMinY * blockSize;
                const boxWidth = (rectMaxX - rectMinX + 1) * blockSize;
                const boxHeight = (rectMaxY - rectMinY + 1) * blockSize;

                ctx.fillStyle = 'rgba(255, 204, 0, 0.1)';
                ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
                ctx.strokeStyle = 'rgba(255, 204, 0, 0.7)';
                ctx.lineWidth = 2;
                ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

                // Draw count
                ctx.fillStyle = 'rgba(255, 204, 0, 0.9)';
                ctx.font = `bold ${Math.max(12, blockSize * 0.5)}px Rajdhani`;
                ctx.textAlign = 'center';
                ctx.fillText(`${previewBlockIds.length} blocks`, boxX + boxWidth / 2, boxY + boxHeight / 2);
            }
        } else {
            // For smaller previews, draw individual blocks
            previewBlockIds.forEach((blockId) => {
                if (selectedSet.has(blockId)) return;

                const x = blockId % 100;
                const y = Math.floor(blockId / 100);

                if (x < startX || x >= endX || y < startY || y >= endY) {
                    return;
                }

                const screenX = offsetX + x * blockSize;
                const screenY = offsetY + y * blockSize;

                ctx.strokeStyle = 'rgba(255, 204, 0, 0.5)';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX, screenY, blockSize, blockSize);

                ctx.fillStyle = 'rgba(255, 204, 0, 0.1)';
                ctx.fillRect(screenX, screenY, blockSize, blockSize);
            });
        }

        // Draw coordinate overlay in corner
        ctx.fillStyle = 'rgba(255, 204, 0, 0.8)';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`GRID: ${GRID_SIZE}×${GRID_SIZE} | ZOOM: ${Math.round(viewport.zoom * 100)}%`, 10, 20);
        ctx.fillText(`VIEW: (${Math.round(viewport.x)}, ${Math.round(viewport.y)})`, 10, 35);

        // Show selection count if multiple selected
        if (selectedBlockIds.length > 0) {
            ctx.fillStyle = '#ff4444';
            ctx.fillText(`SELECTED: ${selectedBlockIds.length} block${selectedBlockIds.length > 1 ? 's' : ''}`, 10, 50);
        }

        // Draw block-snapped selection rectangle if actively selecting
        if (selectionRect) {
            const { startX, startY, endX, endY } = selectionRect;

            // Calculate screen coordinates from grid coordinates
            const minX = Math.min(startX, endX);
            const maxX = Math.max(startX, endX);
            const minY = Math.min(startY, endY);
            const maxY = Math.max(startY, endY);

            // Convert to screen space (snap to block edges)
            const topLeft = {
                x: offsetX + minX * blockSize,
                y: offsetY + minY * blockSize
            };
            const bottomRight = {
                x: offsetX + (maxX + 1) * blockSize,
                y: offsetY + (maxY + 1) * blockSize
            };

            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                topLeft.x,
                topLeft.y,
                bottomRight.x - topLeft.x,
                bottomRight.y - topLeft.y
            );
            ctx.setLineDash([]);
        }

    }, [viewport, blocks, selectedBlockIds, hoveredBlockId, selectionRect, previewBlockIds]);

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

    // Prevent browser zoom on trackpad pinch - must use native listener with passive: false
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheelNative = (e) => {
            e.preventDefault();
            const delta = -Math.sign(e.deltaY);
            zoom(delta, e.clientX, e.clientY);
        };

        // Prevent Safari gesture zoom
        const preventGesture = (e) => {
            e.preventDefault();
        };

        canvas.addEventListener('wheel', handleWheelNative, { passive: false });
        canvas.addEventListener('gesturestart', preventGesture);
        canvas.addEventListener('gesturechange', preventGesture);
        canvas.addEventListener('gestureend', preventGesture);

        return () => {
            canvas.removeEventListener('wheel', handleWheelNative);
            canvas.removeEventListener('gesturestart', preventGesture);
            canvas.removeEventListener('gesturechange', preventGesture);
            canvas.removeEventListener('gestureend', preventGesture);
        };
    }, [zoom]);

    // Prevent Windows touch-to-mouse conversion and context menu on long press
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Prevent touchstart from being converted to click on Windows touchscreens
        const handleNativeTouchStart = (e) => {
            // Only prevent default for single-finger touches in select mode
            // This stops the browser from firing synthetic mouse events
            if (e.touches.length === 1) {
                e.preventDefault();
            }
        };

        // Prevent context menu on long press
        const handleContextMenu = (e) => {
            e.preventDefault();
        };

        canvas.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
        canvas.addEventListener('contextmenu', handleContextMenu);

        return () => {
            canvas.removeEventListener('touchstart', handleNativeTouchStart);
            canvas.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

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

    // Keyboard handler for arrow keys
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleKeyDown = (e) => {
            // Arrow key navigation (shift = expand selection)
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
                const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
                moveSelection(dx, dy, e.shiftKey);
            }
            // Escape to clear selection
            if (e.key === 'Escape') {
                selectBlock(null);
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [moveSelection, selectBlock]);

    // Mouse handlers
    const handleMouseDown = (e) => {
        const now = Date.now();
        const gridCoord = canvasToGrid(e.clientX, e.clientY);

        dragStartPos.current = { x: e.clientX, y: e.clientY };
        lastPos.current = { x: e.clientX, y: e.clientY };

        if (selectMode) {
            // SELECT MODE: Single click starts rectangle selection immediately
            isSelecting.current = true;
            isDragging.current = false;
            if (gridCoord) {
                selectionStartGrid.current = gridCoord;
                setSelectionRect({
                    startX: gridCoord.x,
                    startY: gridCoord.y,
                    endX: gridCoord.x,
                    endY: gridCoord.y
                });
                setPreviewBlockIds([gridCoord.id]);
            }
        } else {
            // NORMAL MODE: Check for double-click to start rectangle selection
            const isDoubleClick = (now - lastClickTime.current < 300) &&
                gridCoord &&
                lastClickPos.current.x === gridCoord.x &&
                lastClickPos.current.y === gridCoord.y;

            lastClickTime.current = now;
            lastClickPos.current = gridCoord ? { x: gridCoord.x, y: gridCoord.y } : { x: -1, y: -1 };

            if (isDoubleClick && gridCoord) {
                // Double-click starts rectangle selection in normal mode
                isSelecting.current = true;
                isDragging.current = false;
                selectionStartGrid.current = gridCoord;
                setSelectionRect({
                    startX: gridCoord.x,
                    startY: gridCoord.y,
                    endX: gridCoord.x,
                    endY: gridCoord.y
                });
                setPreviewBlockIds([gridCoord.id]);
            } else {
                // Single click in normal mode = pan
                isSelecting.current = false;
                isDragging.current = true;
            }
        }
    };

    // Helper to calculate blocks in a rectangle
    const getBlocksInRect = (x1, y1, x2, y2) => {
        const minX = Math.max(0, Math.min(x1, x2));
        const maxX = Math.min(99, Math.max(x1, x2));
        const minY = Math.max(0, Math.min(y1, y2));
        const maxY = Math.min(99, Math.max(y1, y2));

        const blockIds = [];
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                blockIds.push(y * 100 + x);
            }
        }
        return blockIds;
    };

    const handleMouseMove = (e) => {
        const gridCoord = canvasToGrid(e.clientX, e.clientY);
        hoverBlock(gridCoord?.id ?? null);

        if (isSelecting.current && gridCoord) {
            const startGrid = selectionStartGrid.current;
            if (startGrid) {
                // Update selection rectangle with grid coordinates
                setSelectionRect({
                    startX: startGrid.x,
                    startY: startGrid.y,
                    endX: gridCoord.x,
                    endY: gridCoord.y
                });
                // Update preview blocks in real-time
                const previewIds = getBlocksInRect(startGrid.x, startGrid.y, gridCoord.x, gridCoord.y);
                setPreviewBlockIds(previewIds);
            }
        } else if (isDragging.current && !selectMode) {
            // Only pan in normal mode
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            pan(dx, dy);
            lastPos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = (e) => {
        if (isSelecting.current) {
            // Finish rectangle selection
            const startGrid = selectionStartGrid.current;
            const endGrid = canvasToGrid(e.clientX, e.clientY);

            if (startGrid && endGrid) {
                const dx = Math.abs(e.clientX - dragStartPos.current.x);
                const dy = Math.abs(e.clientY - dragStartPos.current.y);

                if (dx < 5 && dy < 5) {
                    // Minimal movement = single block click
                    if (selectMode) {
                        // In select mode, toggle the block (additive)
                        toggleBlockSelection(startGrid.id);
                    } else {
                        // In normal mode (double-click), select single block
                        selectBlock(startGrid.id);
                    }
                } else {
                    // Drag completed - select rectangle
                    // In select mode, always add to existing selection
                    // In normal mode, use ctrl/cmd to add
                    const addToExisting = selectMode || e.ctrlKey || e.metaKey;
                    selectRectangle(startGrid.x, startGrid.y, endGrid.x, endGrid.y, addToExisting);
                }
            }

            setSelectionRect(null);
            setPreviewBlockIds([]);
            selectionStartGrid.current = null;
            isSelecting.current = false;
        } else if (isDragging.current) {
            const dx = Math.abs(e.clientX - dragStartPos.current.x);
            const dy = Math.abs(e.clientY - dragStartPos.current.y);

            // If minimal movement, treat as click (only in normal mode)
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
        isSelecting.current = false;
        setSelectionRect(null);
        setPreviewBlockIds([]);
        hoverBlock(null);
    };

    // Touch handlers with pinch-to-zoom and select mode support
    const getTouchDistance = (e) => {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (e) => {
        return {
            x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            // Two fingers = pinch-to-zoom
            isPinching.current = true;
            isDragging.current = false;
            isSelecting.current = false;
            initialPinchDistance.current = getTouchDistance(e);
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            const now = Date.now();
            const gridCoord = canvasToGrid(touch.clientX, touch.clientY);

            dragStartPos.current = { x: touch.clientX, y: touch.clientY };
            lastPos.current = { x: touch.clientX, y: touch.clientY };
            touchStartTime.current = now; // Record touch start time for tap detection

            // Check for double-tap (within 300ms and near same position)
            const isDoubleTap = (now - lastTouchTime.current < 300) &&
                gridCoord &&
                lastTouchPos.current.x === gridCoord.x &&
                lastTouchPos.current.y === gridCoord.y;

            lastTouchTime.current = now;
            lastTouchPos.current = gridCoord ? { x: gridCoord.x, y: gridCoord.y } : { x: -1, y: -1 };

            if (selectMode) {
                // Select mode: single tap starts selection, drag extends it
                if (gridCoord) {
                    isSelecting.current = true;
                    isDragging.current = false;
                    selectionStartGrid.current = gridCoord;
                    setSelectionRect({
                        startX: gridCoord.x,
                        startY: gridCoord.y,
                        endX: gridCoord.x,
                        endY: gridCoord.y
                    });
                    setPreviewBlockIds([gridCoord.id]);
                } else {
                    // Touched outside grid in select mode - do nothing
                    isSelecting.current = false;
                    isDragging.current = false;
                }
            } else if (isDoubleTap && gridCoord) {
                // Double-tap in normal mode starts rectangle selection
                isSelecting.current = true;
                isDragging.current = false;
                selectionStartGrid.current = gridCoord;
                setSelectionRect({
                    startX: gridCoord.x,
                    startY: gridCoord.y,
                    endX: gridCoord.x,
                    endY: gridCoord.y
                });
                setPreviewBlockIds([gridCoord.id]);
            } else {
                // Single tap in normal mode = pan
                isDragging.current = true;
                isSelecting.current = false;
            }
        }
    };

    const handleTouchMove = (e) => {
        e.preventDefault(); // Prevent scroll

        if (isPinching.current && e.touches.length === 2) {
            // Pinch-to-zoom
            const currentDistance = getTouchDistance(e);
            const center = getTouchCenter(e);
            const scale = currentDistance / initialPinchDistance.current;

            if (scale > 1.05) {
                zoom(1, center.x, center.y);
                initialPinchDistance.current = currentDistance;
            } else if (scale < 0.95) {
                zoom(-1, center.x, center.y);
                initialPinchDistance.current = currentDistance;
            }
        } else if (isSelecting.current && e.touches.length === 1) {
            // Rectangle selection drag
            const gridCoord = canvasToGrid(e.touches[0].clientX, e.touches[0].clientY);
            if (gridCoord && selectionStartGrid.current) {
                setSelectionRect({
                    startX: selectionStartGrid.current.x,
                    startY: selectionStartGrid.current.y,
                    endX: gridCoord.x,
                    endY: gridCoord.y
                });
                const previewIds = getBlocksInRect(
                    selectionStartGrid.current.x,
                    selectionStartGrid.current.y,
                    gridCoord.x,
                    gridCoord.y
                );
                setPreviewBlockIds(previewIds);
            }
        } else if (isDragging.current && e.touches.length === 1) {
            // Pan
            const dx = e.touches[0].clientX - lastPos.current.x;
            const dy = e.touches[0].clientY - lastPos.current.y;
            pan(dx, dy);
            lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleTouchEnd = (e) => {
        if (isPinching.current) {
            isPinching.current = false;
            initialPinchDistance.current = null;
            return;
        }

        if (isSelecting.current && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const endGrid = canvasToGrid(touch.clientX, touch.clientY);
            const startGrid = selectionStartGrid.current;
            const touchDuration = Date.now() - touchStartTime.current;

            if (startGrid && endGrid) {
                const dx = Math.abs(touch.clientX - dragStartPos.current.x);
                const dy = Math.abs(touch.clientY - dragStartPos.current.y);

                // Consider it a tap if: short duration (<300ms) OR minimal movement (<20px)
                const isQuickTap = touchDuration < 300;
                const isMinimalMovement = dx < 20 && dy < 20;

                if (isQuickTap || isMinimalMovement) {
                    // Tap - select single block
                    if (selectMode) {
                        // In select mode, toggle the block (accumulative)
                        toggleBlockSelection(startGrid.id);
                    } else {
                        // Double-tap with no drag in normal mode - select single block
                        selectBlock(startGrid.id);
                    }
                } else {
                    // Drag completed - select rectangle
                    // In select mode, always add to existing selection
                    const addToExisting = selectMode;
                    selectRectangle(startGrid.x, startGrid.y, endGrid.x, endGrid.y, addToExisting);
                }
            }

            setSelectionRect(null);
            setPreviewBlockIds([]);
            selectionStartGrid.current = null;
            isSelecting.current = false;
        } else if (isDragging.current && e.changedTouches.length === 1) {
            // Handle single tap in normal mode (when not in selecting mode)
            const touch = e.changedTouches[0];
            const dx = Math.abs(touch.clientX - dragStartPos.current.x);
            const dy = Math.abs(touch.clientY - dragStartPos.current.y);

            // Increased threshold for touch
            if (dx < 20 && dy < 20) {
                // Minimal movement = tap to select
                const gridCoord = canvasToGrid(touch.clientX, touch.clientY);
                if (gridCoord) {
                    selectBlock(gridCoord.id);
                }
            }
            isDragging.current = false;
        }
    };

    return (
        <div
            ref={containerRef}
            style={styles.container}
            tabIndex={0}
        >
            <canvas
                ref={canvasRef}
                style={styles.canvas}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
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
        background: '#0d0a08',
        outline: 'none',
    },
    canvas: {
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
        touchAction: 'none',
    },
};

export default GridCanvas;