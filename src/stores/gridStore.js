import { create } from 'zustand';

/**
 * Grid Store - State management for The Weave grid billboard
 * 
 * Grid is 100x100 blocks (10,000 total blocks)
 * Each block is 10x10 pixels at 1x zoom
 * Block ID is calculated as: y * 100 + x
 */

// Mock data for development
const generateMockBlocks = () => {
    const blocks = new Map();

    // Sample owned blocks with varying colors
    const sampleBlocks = [
        { x: 45, y: 45, owner: '8xF3...9K2J', price: 1000, color: '#ff4444' },
        { x: 46, y: 45, owner: '8xF3...9K2J', price: 1500, color: '#ff4444' },
        { x: 47, y: 45, owner: '8xF3...9K2J', price: 2250, color: '#ff4444' },
        { x: 48, y: 45, owner: '8xF3...9K2J', price: 1000, color: '#ff4444' },
        { x: 45, y: 46, owner: '8xF3...9K2J', price: 1000, color: '#ff6666' },
        { x: 46, y: 46, owner: '8xF3...9K2J', price: 1000, color: '#ff6666' },
        { x: 50, y: 50, owner: 'Ay7K...3M2L', price: 1000, color: '#00ff88' },
        { x: 51, y: 50, owner: 'Ay7K...3M2L', price: 1000, color: '#00ff88' },
        { x: 52, y: 50, owner: 'Ay7K...3M2L', price: 1000, color: '#00ff88' },
        { x: 50, y: 51, owner: 'Ay7K...3M2L', price: 1500, color: '#00ff88' },
        { x: 51, y: 51, owner: 'Ay7K...3M2L', price: 1000, color: '#00ff88' },
        { x: 52, y: 51, owner: 'Ay7K...3M2L', price: 1000, color: '#00ff88' },
        { x: 30, y: 60, owner: 'Qp9X...1N4R', price: 3375, color: '#9945FF' },
        { x: 31, y: 60, owner: 'Qp9X...1N4R', price: 2250, color: '#9945FF' },
        { x: 32, y: 60, owner: 'Qp9X...1N4R', price: 1500, color: '#aa55ff' },
        { x: 33, y: 60, owner: 'Qp9X...1N4R', price: 1000, color: '#bb66ff' },
        { x: 70, y: 30, owner: 'Wm2T...8P5K', price: 1000, color: '#00f6ff' },
        { x: 71, y: 30, owner: 'Wm2T...8P5K', price: 1000, color: '#00f6ff' },
        { x: 70, y: 31, owner: 'Wm2T...8P5K', price: 1000, color: '#00f6ff' },
        { x: 71, y: 31, owner: 'Wm2T...8P5K', price: 1000, color: '#00f6ff' },
        { x: 72, y: 31, owner: 'Wm2T...8P5K', price: 1000, color: '#00f6ff' },
        { x: 20, y: 20, owner: 'Lk4P...7R3S', price: 2000, color: '#ff00ff' },
        { x: 21, y: 20, owner: 'Lk4P...7R3S', price: 2000, color: '#ff00ff' },
        { x: 80, y: 70, owner: 'Nm6Q...2T4V', price: 1500, color: '#ffcc00' },
        { x: 81, y: 70, owner: 'Nm6Q...2T4V', price: 1500, color: '#ffcc00' },
        { x: 80, y: 71, owner: 'Nm6Q...2T4V', price: 1500, color: '#ffcc00' },
    ];

    sampleBlocks.forEach(block => {
        const id = block.y * 100 + block.x;
        blocks.set(id, {
            id,
            x: block.x,
            y: block.y,
            owner: block.owner,
            price: block.price,
            color: block.color,
            imageUrl: null,
            purchasedAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
        });
    });

    return blocks;
};

// Mock takeover events
const mockTakeovers = [
    { id: 1, wallet: '8xF3...9K2J', blockId: 4545, price: 2250, timestamp: Date.now() - 60000 },
    { id: 2, wallet: 'Ay7K...3M2L', blockId: 5050, price: 1000, timestamp: Date.now() - 180000 },
    { id: 3, wallet: 'Qp9X...1N4R', blockId: 6030, price: 3375, timestamp: Date.now() - 300000 },
    { id: 4, wallet: 'Wm2T...8P5K', blockId: 3070, price: 1000, timestamp: Date.now() - 600000 },
];

export const useGridStore = create((set, get) => ({
    // Grid data
    blocks: generateMockBlocks(),

    // View state
    viewport: { x: 50, y: 50, zoom: 1 },

    // Interaction mode: 'select' or 'navigate'
    mode: 'select',

    // Selection state - Set of block IDs for multi-select
    selectedBlocks: new Set(),
    hoveredBlockId: null,

    // For drag selection
    selectionStart: null,
    selectionEnd: null,
    isSelecting: false,

    // UI state
    inspectorOpen: true,
    purchaseModalOpen: false,

    // Live feed
    recentTakeovers: mockTakeovers,

    // Constants
    GRID_SIZE: 100,
    BLOCK_SIZE: 10,
    BASE_PRICE: 1000,
    TAKEOVER_MULTIPLIER: 1.5,
    DECAY_DAYS: 7,
    DECAY_RATE: 0.05,

    // Mode toggle
    setMode: (mode) => set({ mode, selectedBlocks: new Set(), selectionStart: null, selectionEnd: null }),

    // Viewport actions
    setViewport: (viewport) => set({ viewport }),

    // FIXED: Pan moves viewport in direction of drag (positive dx = view moves right)
    pan: (dx, dy) => set(state => ({
        viewport: {
            ...state.viewport,
            x: Math.max(0, Math.min(100, state.viewport.x - dx / (state.viewport.zoom * state.BLOCK_SIZE))),
            y: Math.max(0, Math.min(100, state.viewport.y - dy / (state.viewport.zoom * state.BLOCK_SIZE))),
        }
    })),

    zoom: (delta) => set(state => ({
        viewport: {
            ...state.viewport,
            zoom: Math.max(0.5, Math.min(5, state.viewport.zoom + delta * 0.2)),
        }
    })),

    // Selection actions
    toggleBlockSelection: (blockId) => set(state => {
        const newSelected = new Set(state.selectedBlocks);
        if (newSelected.has(blockId)) {
            newSelected.delete(blockId);
        } else {
            newSelected.add(blockId);
        }
        return { selectedBlocks: newSelected };
    }),

    selectSingleBlock: (blockId) => set({
        selectedBlocks: blockId !== null ? new Set([blockId]) : new Set()
    }),

    selectBlocksInRange: (startX, startY, endX, endY) => set(state => {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);

        const newSelected = new Set();
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x >= 0 && x < 100 && y >= 0 && y < 100) {
                    newSelected.add(y * 100 + x);
                }
            }
        }
        return { selectedBlocks: newSelected };
    }),

    clearSelection: () => set({ selectedBlocks: new Set() }),

    startSelection: (x, y) => set({ selectionStart: { x, y }, selectionEnd: { x, y }, isSelecting: true }),

    updateSelection: (x, y) => set(state => {
        if (!state.isSelecting) return {};
        return { selectionEnd: { x, y } };
    }),

    endSelection: () => set(state => {
        if (!state.isSelecting || !state.selectionStart || !state.selectionEnd) {
            return { isSelecting: false, selectionStart: null, selectionEnd: null };
        }

        const minX = Math.min(state.selectionStart.x, state.selectionEnd.x);
        const maxX = Math.max(state.selectionStart.x, state.selectionEnd.x);
        const minY = Math.min(state.selectionStart.y, state.selectionEnd.y);
        const maxY = Math.max(state.selectionStart.y, state.selectionEnd.y);

        const newSelected = new Set();
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (x >= 0 && x < 100 && y >= 0 && y < 100) {
                    newSelected.add(y * 100 + x);
                }
            }
        }

        return {
            selectedBlocks: newSelected,
            isSelecting: false,
            selectionStart: null,
            selectionEnd: null
        };
    }),

    hoverBlock: (blockId) => set({ hoveredBlockId: blockId }),

    toggleInspector: () => set(state => ({ inspectorOpen: !state.inspectorOpen })),

    openPurchaseModal: () => set({ purchaseModalOpen: true }),
    closePurchaseModal: () => set({ purchaseModalOpen: false }),

    // Get block by coordinates
    getBlockAt: (x, y) => {
        if (x < 0 || x >= 100 || y < 0 || y >= 100) return null;
        const id = y * 100 + x;
        return get().blocks.get(id) || {
            id, x, y, owner: null, price: get().BASE_PRICE, color: null, imageUrl: null, purchasedAt: null,
        };
    },

    // Get selection info
    getSelectionInfo: () => {
        const { selectedBlocks, blocks, BASE_PRICE, TAKEOVER_MULTIPLIER, DECAY_DAYS, DECAY_RATE } = get();

        if (selectedBlocks.size === 0) return null;

        const blockIds = Array.from(selectedBlocks);
        let totalPrice = 0;
        let ownedCount = 0;
        let unclaimedCount = 0;

        // Calculate bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        blockIds.forEach(id => {
            const x = id % 100;
            const y = Math.floor(id / 100);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);

            const block = blocks.get(id);
            if (block && block.owner) {
                ownedCount++;
                // Calculate with decay
                const daysSincePurchase = (Date.now() - block.purchasedAt) / (24 * 60 * 60 * 1000);
                let price = block.price * TAKEOVER_MULTIPLIER;
                if (daysSincePurchase > DECAY_DAYS) {
                    const daysInDecay = daysSincePurchase - DECAY_DAYS;
                    price *= Math.max(0.1, 1 - (daysInDecay * DECAY_RATE));
                }
                totalPrice += Math.floor(price);
            } else {
                unclaimedCount++;
                totalPrice += BASE_PRICE;
            }
        });

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        return {
            count: selectedBlocks.size,
            coordinates: { x: minX, y: minY },
            dimensions: { width, height },
            area: selectedBlocks.size,
            totalPrice,
            ownedCount,
            unclaimedCount,
        };
    },

    // Mock purchase
    purchaseBlocks: async (color) => {
        const { selectedBlocks, blocks, BASE_PRICE, TAKEOVER_MULTIPLIER } = get();

        await new Promise(resolve => setTimeout(resolve, 1500));

        const newBlocks = new Map(blocks);
        selectedBlocks.forEach(blockId => {
            const x = blockId % 100;
            const y = Math.floor(blockId / 100);
            const existing = blocks.get(blockId);
            const price = existing?.owner
                ? Math.floor(existing.price * TAKEOVER_MULTIPLIER)
                : BASE_PRICE;

            newBlocks.set(blockId, {
                id: blockId, x, y,
                owner: 'You...rWlt',
                price,
                color: color || '#00f6ff',
                imageUrl: null,
                purchasedAt: Date.now(),
            });
        });

        set({
            blocks: newBlocks,
            purchaseModalOpen: false,
            selectedBlocks: new Set(),
        });

        return { success: true };
    },
}));
