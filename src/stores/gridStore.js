import { create } from 'zustand';

/**
 * Grid Store - State management for The Weave 3D billboard grid
 * 200x50 = 10,000 blocks
 */
export const useGridStore = create((set, get) => ({
    // Grid configuration
    gridWidth: 200,
    gridHeight: 50,

    // Block data - 10,000 blocks
    blocks: [],

    // Currently hovered block
    hoveredBlock: null,

    // Selected block IDs
    selectedBlocks: [],

    // Editor mode
    editorMode: false,
    cameraLocked: false,

    // Initialize blocks (200x50 grid)
    initializeBlocks: () => {
        const blocks = [];
        const gridWidth = 200;
        const gridHeight = 50;

        for (let z = 0; z < gridHeight; z++) {
            for (let x = 0; x < gridWidth; x++) {
                const id = z * gridWidth + x;
                blocks.push({
                    id,
                    x,
                    z,
                    price: 1000,
                    owner: null,
                    texture: null,
                });
            }
        }

        set({ blocks, gridWidth, gridHeight });
    },

    // Set hovered block
    setHoveredBlock: (blockId) => set({ hoveredBlock: blockId }),

    // Select a single block
    selectBlock: (blockId) => {
        set({
            selectedBlocks: [blockId],
            editorMode: true,
            cameraLocked: true,
        });
    },

    // Toggle block in selection
    toggleBlockSelection: (blockId) => {
        const { selectedBlocks } = get();
        const isSelected = selectedBlocks.includes(blockId);

        if (isSelected) {
            set({ selectedBlocks: selectedBlocks.filter(id => id !== blockId) });
        } else {
            set({ selectedBlocks: [...selectedBlocks, blockId] });
        }
    },

    // Clear selection
    clearSelection: () => {
        set({
            selectedBlocks: [],
            editorMode: false,
            cameraLocked: false,
        });
    },
}));
