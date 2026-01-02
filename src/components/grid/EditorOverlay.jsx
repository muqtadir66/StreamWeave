import React, { useMemo, useState } from 'react';
import { useGridStore } from '../../stores/gridStore';

/**
 * BlockMinimap - Shows a small map of the full grid with selected blocks highlighted
 */
function BlockMinimap({ selectedBlocks, blocks }) {
    const gridSize = 100;
    const mapSize = 120;
    const blockSize = mapSize / gridSize;

    // Get bounds of selection
    const selectedData = selectedBlocks.map(id => blocks.find(b => b.id === id)).filter(Boolean);
    const minX = Math.min(...selectedData.map(b => b.x));
    const maxX = Math.max(...selectedData.map(b => b.x));
    const minZ = Math.min(...selectedData.map(b => b.z));
    const maxZ = Math.max(...selectedData.map(b => b.z));

    return (
        <div style={styles.minimap}>
            <div style={styles.minimapLabel}>GRID POSITION</div>
            <div style={{
                ...styles.minimapGrid,
                width: mapSize,
                height: mapSize,
            }}>
                {/* Grid background */}
                <div style={styles.minimapBg} />

                {/* Selection bounds indicator */}
                <div style={{
                    position: 'absolute',
                    left: minX * blockSize,
                    top: minZ * blockSize,
                    width: (maxX - minX + 1) * blockSize,
                    height: (maxZ - minZ + 1) * blockSize,
                    border: '2px solid #ffcc00',
                    background: 'rgba(255, 204, 0, 0.2)',
                    boxShadow: '0 0 10px rgba(255, 204, 0, 0.5)',
                }} />

                {/* Individual selected blocks */}
                {selectedData.map(block => (
                    <div
                        key={block.id}
                        style={{
                            position: 'absolute',
                            left: block.x * blockSize,
                            top: block.z * blockSize,
                            width: blockSize,
                            height: blockSize,
                            background: '#ffcc00',
                            boxShadow: '0 0 4px #ffcc00',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * BlockCanvas - Renders selected blocks as a 2D editable canvas
 */
function BlockCanvas({ selectedBlocks, blocks, subSelection, onBlockClick }) {
    const selectedData = selectedBlocks.map(id => blocks.find(b => b.id === id)).filter(Boolean);

    if (selectedData.length === 0) return null;

    // Calculate bounds
    const minX = Math.min(...selectedData.map(b => b.x));
    const maxX = Math.max(...selectedData.map(b => b.x));
    const minZ = Math.min(...selectedData.map(b => b.z));
    const maxZ = Math.max(...selectedData.map(b => b.z));

    const width = maxX - minX + 1;
    const height = maxZ - minZ + 1;

    // Calculate cell size to fit screen
    const maxWidth = window.innerWidth * 0.6;
    const maxHeight = window.innerHeight * 0.6;
    const cellSize = Math.min(
        maxWidth / width,
        maxHeight / height,
        80 // Max cell size
    );

    // Create grid of all blocks in bounds (including gaps)
    const grid = [];
    for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
            const block = selectedData.find(b => b.x === x && b.z === z);
            grid.push({
                x,
                z,
                block,
                isSelected: block ? subSelection.includes(block.id) : false,
            });
        }
    }

    return (
        <div style={styles.canvasContainer}>
            <div style={styles.canvasLabel}>
                {selectedBlocks.length} {selectedBlocks.length === 1 ? 'BLOCK' : 'BLOCKS'} SELECTED
            </div>
            <div style={styles.canvasSubLabel}>
                Click to sub-select • Shift+click to add
            </div>
            <div
                style={{
                    ...styles.canvas,
                    width: width * cellSize,
                    height: height * cellSize,
                    gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
                    gridTemplateRows: `repeat(${height}, ${cellSize}px)`,
                }}
            >
                {grid.map((cell, i) => (
                    <div
                        key={i}
                        onClick={() => cell.block && onBlockClick(cell.block.id)}
                        style={{
                            width: cellSize,
                            height: cellSize,
                            background: cell.block
                                ? (cell.isSelected ? '#fff' : 'rgba(255, 255, 255, 0.9)')
                                : 'transparent',
                            border: cell.block
                                ? `1px solid ${cell.isSelected ? '#ffcc00' : 'rgba(0,0,0,0.1)'}`
                                : 'none',
                            boxShadow: cell.isSelected
                                ? '0 0 10px rgba(255, 204, 0, 0.5)'
                                : 'none',
                            cursor: cell.block ? 'pointer' : 'default',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: cellSize > 30 ? '0.6rem' : '0',
                            color: 'rgba(0,0,0,0.3)',
                        }}
                    >
                        {cell.block && cellSize > 40 && (
                            <span>{cell.block.x},{cell.block.z}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * EditorOverlay - 2D overlay showing selected blocks as editable canvas
 */
export default function EditorOverlay() {
    const editorMode = useGridStore(s => s.editorMode);
    const selectedBlocks = useGridStore(s => s.selectedBlocks);
    const blocks = useGridStore(s => s.blocks);
    const editorSubSelection = useGridStore(s => s.editorSubSelection);
    const toggleEditorSubSelection = useGridStore(s => s.toggleEditorSubSelection);
    const setEditorSubSelection = useGridStore(s => s.setEditorSubSelection);
    const clearSelection = useGridStore(s => s.clearSelection);

    const [shiftHeld, setShiftHeld] = useState(false);

    // Track shift key
    React.useEffect(() => {
        const handleKeyDown = (e) => { if (e.shiftKey) setShiftHeld(true); };
        const handleKeyUp = (e) => { if (!e.shiftKey) setShiftHeld(false); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleBlockClick = (blockId) => {
        if (shiftHeld) {
            toggleEditorSubSelection(blockId);
        } else {
            setEditorSubSelection([blockId]);
        }
    };

    if (!editorMode || selectedBlocks.length === 0) return null;

    // Calculate if blocks are scattered (non-contiguous)
    const selectedData = selectedBlocks.map(id => blocks.find(b => b.id === id)).filter(Boolean);
    const minX = Math.min(...selectedData.map(b => b.x));
    const maxX = Math.max(...selectedData.map(b => b.x));
    const minZ = Math.min(...selectedData.map(b => b.z));
    const maxZ = Math.max(...selectedData.map(b => b.z));
    const boundsArea = (maxX - minX + 1) * (maxZ - minZ + 1);
    const isScattered = selectedBlocks.length < boundsArea * 0.5; // Less than 50% fill

    // Calculate total price
    const totalPrice = selectedData.reduce((sum, b) => sum + b.price, 0);
    const overlayPrice = Math.floor(totalPrice * 1.5);

    // Active blocks for tools (sub-selection or all)
    const activeBlocks = editorSubSelection.length > 0 ? editorSubSelection : selectedBlocks;

    return (
        <div style={styles.overlay}>
            {/* Background click to close */}
            <div style={styles.backdrop} onClick={clearSelection} />

            {/* Main content */}
            <div style={styles.content}>
                {/* Block canvas */}
                <BlockCanvas
                    selectedBlocks={selectedBlocks}
                    blocks={blocks}
                    subSelection={editorSubSelection}
                    onBlockClick={handleBlockClick}
                />

                {/* Minimap for context (always show) */}
                <BlockMinimap
                    selectedBlocks={selectedBlocks}
                    blocks={blocks}
                />
            </div>

            {/* Floating tools on left */}
            <div style={styles.tools}>
                <div style={styles.toolHeader}>
                    {activeBlocks.length} {activeBlocks.length === 1 ? 'BLOCK' : 'BLOCKS'}
                </div>

                <div style={styles.priceInfo}>
                    <div style={styles.priceLabel}>OVERLAY PRICE</div>
                    <div style={styles.priceValue}>{overlayPrice.toLocaleString()} WEAVE</div>
                </div>

                <div style={styles.toolDivider} />

                <button style={styles.toolBtn}>🖌️ DRAW</button>
                <button style={styles.toolBtn}>📝 TEXT</button>
                <button style={styles.toolBtn}>🖼️ UPLOAD</button>
                <button style={styles.toolBtn}>🎨 COLOR</button>

                <div style={styles.toolDivider} />

                <button style={styles.claimBtn}>CLAIM AD SPACE</button>
                <button onClick={clearSelection} style={styles.cancelBtn}>CLOSE</button>

                <div style={styles.phase2}>Tools coming Phase 2</div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backdrop: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 10, 25, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
    },
    content: {
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
    },
    canvasContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
    },
    canvasLabel: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '1.2rem',
        fontWeight: 700,
        color: '#ffcc00',
        letterSpacing: '0.1em',
    },
    canvasSubLabel: {
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.5)',
    },
    canvas: {
        display: 'grid',
        background: 'rgba(0, 20, 40, 0.5)',
        border: '2px solid rgba(255, 204, 0, 0.3)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)',
    },
    minimap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
    },
    minimapLabel: {
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: '0.65rem',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: '0.1em',
    },
    minimapGrid: {
        position: 'relative',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    minimapBg: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 20, 40, 0.8)',
    },
    tools: {
        position: 'fixed',
        left: '24px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'rgba(0, 15, 30, 0.95)',
        border: '1px solid rgba(255, 204, 0, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        fontFamily: "'Rajdhani', sans-serif",
        zIndex: 10,
    },
    toolHeader: {
        fontSize: '1rem',
        fontWeight: 700,
        color: '#ffcc00',
        letterSpacing: '0.08em',
    },
    priceInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    priceLabel: {
        fontSize: '0.6rem',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: '0.08em',
    },
    priceValue: {
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#fff',
    },
    toolDivider: {
        height: '1px',
        background: 'rgba(255, 255, 255, 0.1)',
    },
    toolBtn: {
        padding: '10px 14px',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.8rem',
        cursor: 'not-allowed',
        opacity: 0.6,
        fontFamily: "'Rajdhani', sans-serif",
        textAlign: 'left',
    },
    claimBtn: {
        padding: '12px 16px',
        background: 'rgba(255, 204, 0, 0.15)',
        border: '2px solid #ffcc00',
        borderRadius: '6px',
        color: '#ffcc00',
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        cursor: 'pointer',
        fontFamily: "'Rajdhani', sans-serif",
    },
    cancelBtn: {
        padding: '10px 16px',
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '6px',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.75rem',
        cursor: 'pointer',
        fontFamily: "'Rajdhani', sans-serif",
    },
    phase2: {
        fontSize: '0.6rem',
        color: 'rgba(255, 255, 255, 0.3)',
        textAlign: 'center',
        fontStyle: 'italic',
    },
};
