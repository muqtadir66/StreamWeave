import { create } from 'zustand';

export const useGridStore = create((set, get) => ({
    // CONFIG
    gridSize: 100, // 100x100 = 10,000 Blocks

    // STATE
    blocks: [],
    hoveredBlock: null,
    selectedBlock: null,
    isDragging: false,

    // ACTIONS
    initializeBlocks: () => {
        const size = 100;
        const blockData = [];

        // Generate Mock Data for the City
        for (let i = 0; i < size * size; i++) {
            const x = i % size;
            const z = Math.floor(i / size);

            // Simulation: 15% of blocks are "Owned" (Buildings)
            const isOwned = Math.random() < 0.15;

            // Price Calculation (Center is expensive)
            const distFromCenter = Math.sqrt(Math.pow(x - size / 2, 2) + Math.pow(z - size / 2, 2));
            const basePrice = Math.max(1000, 100000 - (distFromCenter * 1500));

            blockData.push({
                id: i,
                x,
                z,
                isOwned,
                owner: isOwned ? `0x${Math.random().toString(16).substr(2, 6)}...` : null,
                price: Math.floor(basePrice),
                // Visuals: Owned blocks are tall (0.5 to 3.0), Empty are flat (0.1)
                height: isOwned ? Math.random() * 2.5 + 0.5 : 0.1,
                // Colors: Cyan, Magenta, or Dark Void
                color: isOwned
                    ? (Math.random() > 0.5 ? [0, 246, 255] : [217, 70, 239])
                    : [20, 25, 40]
            });
        }
        set({ blocks: blockData });
    },

    setHoveredBlock: (id) => set({ hoveredBlock: id }),

    setSelectedBlock: (id) => {
        const { blocks } = get();
        if (id === null) {
            set({ selectedBlock: null });
            return;
        }
        set({ selectedBlock: blocks[id] });
    },
}));