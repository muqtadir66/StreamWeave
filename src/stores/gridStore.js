import { create } from 'zustand';

/**
 * Grid Store - State management for The Weave grid billboard
 * 
 * Grid is 100x100 blocks (10,000 total blocks)
 * Each block is 10x10 pixels at 1x zoom
 * Block ID is calculated as: y * 100 + x
 */

// Mock data for development - will be replaced with API calls
const generateMockBlocks = () => {
    const blocks = new Map();

    // Add some sample owned blocks
    const sampleBlocks = [
        { x: 45, y: 45, owner: '8xF3...9K2J', price: 1000, color: '#ff4444' },
        { x: 46, y: 45, owner: '8xF3...9K2J', price: 1500, color: '#ff4444' },
        { x: 47, y: 45, owner: '8xF3...9K2J', price: 2250, color: '#ff4444' },
        { x: 50, y: 50, owner: 'Ay7K...3M2L', price: 1000, color: '#00ff88' },
        { x: 51, y: 50, owner: 'Ay7K...3M2L', price: 1000, color: '#00ff88' },
        { x: 50, y: 51, owner: 'Ay7K...3M2L', price: 1500, color: '#00ff88' },
        { x: 51, y: 51, owner: 'Ay7K...3M2L', price: 1000, color: '#00ff88' },
        { x: 30, y: 60, owner: 'Qp9X...1N4R', price: 3375, color: '#9945FF' },
        { x: 31, y: 60, owner: 'Qp9X...1N4R', price: 2250, color: '#9945FF' },
        { x: 32, y: 60, owner: 'Qp9X...1N4R', price: 1500, color: '#9945FF' },
        { x: 70, y: 30, owner: 'Wm2T...8P5K', price: 1000, color: '#00f6ff' },
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
            purchasedAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Random within last 7 days
        });
    });

    return blocks;
};

// Mock takeover events
const mockTakeovers = [
    { id: 1, wallet: '8xF3...9K2J', blockId: 4745, price: 2250, timestamp: Date.now() - 60000 },
    { id: 2, wallet: 'Ay7K...3M2L', blockId: 5050, price: 1000, timestamp: Date.now() - 180000 },
    { id: 3, wallet: 'Qp9X...1N4R', blockId: 6030, price: 3375, timestamp: Date.now() - 300000 },
    { id: 4, wallet: 'Wm2T...8P5K', blockId: 3070, price: 1000, timestamp: Date.now() - 600000 },
];

export const useGridStore = create((set, get) => ({
    // Grid data (sparse map for efficiency)
    blocks: generateMockBlocks(),

    // View state
    viewport: {
        x: 50, // Center on grid
        y: 50,
        zoom: 1
    },

    // Selection state - NOW SUPPORTS MULTIPLE BLOCKS
    selectedBlockIds: [], // Array of selected block IDs
    hoveredBlockId: null,

    // UI state
    inspectorOpen: true,
    purchaseModalOpen: false,

    // Live feed
    recentTakeovers: mockTakeovers,

    // Grid constants
    GRID_SIZE: 100, // 100x100 blocks
    BLOCK_SIZE: 10, // 10px per block at 1x zoom
    BASE_PRICE: 1000, // 1000 WEAVE per block
    TAKEOVER_MULTIPLIER: 1.5,
    DECAY_DAYS: 7,
    DECAY_RATE: 0.05, // 5% per day after decay starts

    // Actions
    setViewport: (viewport) => set({ viewport }),

    pan: (dx, dy) => set(state => ({
        viewport: {
            ...state.viewport,
            x: Math.max(0, Math.min(100, state.viewport.x - dx / (state.viewport.zoom * state.BLOCK_SIZE))),
            y: Math.max(0, Math.min(100, state.viewport.y - dy / (state.viewport.zoom * state.BLOCK_SIZE))),
        }
    })),

    zoom: (delta, centerX, centerY) => set(state => {
        const newZoom = Math.max(0.5, Math.min(4, state.viewport.zoom * (1 + delta * 0.1)));
        return {
            viewport: {
                ...state.viewport,
                zoom: newZoom,
            }
        };
    }),

    // Select a single block (replaces current selection)
    selectBlock: (blockId) => set({
        selectedBlockIds: blockId !== null ? [blockId] : []
    }),

    // Toggle block selection (for multi-select with Ctrl/Cmd)
    toggleBlockSelection: (blockId) => set(state => {
        if (blockId === null) return { selectedBlockIds: [] };

        const isSelected = state.selectedBlockIds.includes(blockId);
        if (isSelected) {
            return { selectedBlockIds: state.selectedBlockIds.filter(id => id !== blockId) };
        } else {
            return { selectedBlockIds: [...state.selectedBlockIds, blockId] };
        }
    }),

    // Add block to selection (for shift-click range select)
    addToSelection: (blockId) => set(state => {
        if (blockId === null || state.selectedBlockIds.includes(blockId)) return state;
        return { selectedBlockIds: [...state.selectedBlockIds, blockId] };
    }),

    // Clear all selections
    clearSelection: () => set({ selectedBlockIds: [] }),

    // Check if a block is selected
    isBlockSelected: (blockId) => get().selectedBlockIds.includes(blockId),

    hoverBlock: (blockId) => set({ hoveredBlockId: blockId }),

    toggleInspector: () => set(state => ({ inspectorOpen: !state.inspectorOpen })),

    openPurchaseModal: () => set({ purchaseModalOpen: true }),

    closePurchaseModal: () => set({ purchaseModalOpen: false }),

    // Get block data by ID
    getBlock: (blockId) => get().blocks.get(blockId),

    // Get block by coordinates
    getBlockAt: (x, y) => {
        if (x < 0 || x >= 100 || y < 0 || y >= 100) return null;
        const id = y * 100 + x;
        return get().blocks.get(id) || {
            id,
            x,
            y,
            owner: null,
            price: get().BASE_PRICE,
            color: null,
            imageUrl: null,
            purchasedAt: null,
        };
    },

    // Calculate takeover price for a single block
    getTakeoverPrice: (blockId) => {
        const block = get().blocks.get(blockId);
        if (!block) return get().BASE_PRICE;

        // Calculate decay
        const now = Date.now();
        const daysSincePurchase = (now - block.purchasedAt) / (24 * 60 * 60 * 1000);

        if (daysSincePurchase < get().DECAY_DAYS) {
            // No decay yet
            return Math.floor(block.price * get().TAKEOVER_MULTIPLIER);
        }

        // Apply decay
        const daysInDecay = daysSincePurchase - get().DECAY_DAYS;
        const decayMultiplier = Math.max(0.1, 1 - (daysInDecay * get().DECAY_RATE));
        return Math.floor(block.price * get().TAKEOVER_MULTIPLIER * decayMultiplier);
    },

    // Calculate total price for all selected blocks
    getSelectionTotalPrice: () => {
        const { selectedBlockIds, getTakeoverPrice, BASE_PRICE, blocks } = get();

        return selectedBlockIds.reduce((total, blockId) => {
            const block = blocks.get(blockId);
            if (block) {
                // Owned block - calculate takeover price
                return total + getTakeoverPrice(blockId);
            } else {
                // Unclaimed block - base price
                return total + BASE_PRICE;
            }
        }, 0);
    },

    // Get breakdown of selection prices
    getSelectionBreakdown: () => {
        const { selectedBlockIds, getTakeoverPrice, getDecayInfo, BASE_PRICE, blocks } = get();

        let newBlocks = 0;
        let ownedBlocks = 0;
        let decayingBlocks = 0;
        let totalPrice = 0;

        const breakdown = selectedBlockIds.map(blockId => {
            const block = blocks.get(blockId);
            const x = blockId % 100;
            const y = Math.floor(blockId / 100);

            if (block) {
                const price = getTakeoverPrice(blockId);
                const decay = getDecayInfo(blockId);
                ownedBlocks++;
                if (decay?.isDecaying) decayingBlocks++;
                totalPrice += price;

                return {
                    id: blockId,
                    x,
                    y,
                    owner: block.owner,
                    currentPrice: block.price,
                    takeoverPrice: price,
                    isDecaying: decay?.isDecaying || false,
                    type: 'takeover'
                };
            } else {
                newBlocks++;
                totalPrice += BASE_PRICE;

                return {
                    id: blockId,
                    x,
                    y,
                    owner: null,
                    currentPrice: 0,
                    takeoverPrice: BASE_PRICE,
                    isDecaying: false,
                    type: 'claim'
                };
            }
        });

        return {
            blocks: breakdown,
            summary: {
                total: selectedBlockIds.length,
                newBlocks,
                ownedBlocks,
                decayingBlocks,
                totalPrice
            }
        };
    },

    // Get decay timer for block
    getDecayInfo: (blockId) => {
        const block = get().blocks.get(blockId);
        if (!block) return null;

        const now = Date.now();
        const decayStartsAt = block.purchasedAt + (get().DECAY_DAYS * 24 * 60 * 60 * 1000);
        const timeUntilDecay = decayStartsAt - now;

        if (timeUntilDecay <= 0) {
            const daysSinceDecay = Math.abs(timeUntilDecay) / (24 * 60 * 60 * 1000);
            const currentDecay = Math.min(90, Math.floor(daysSinceDecay * get().DECAY_RATE * 100));
            return { isDecaying: true, decayPercent: currentDecay };
        }

        const daysRemaining = Math.floor(timeUntilDecay / (24 * 60 * 60 * 1000));
        const hoursRemaining = Math.floor((timeUntilDecay % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        return { isDecaying: false, daysRemaining, hoursRemaining };
    },

    // Mock purchase action for multiple blocks
    purchaseBlocks: async (blockIds, color) => {
        const { blocks, BASE_PRICE, TAKEOVER_MULTIPLIER, getTakeoverPrice } = get();

        // Simulate transaction delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        set(state => {
            const newBlocks = new Map(state.blocks);
            const newTakeovers = [];

            blockIds.forEach(blockId => {
                const x = blockId % 100;
                const y = Math.floor(blockId / 100);
                const existingBlock = blocks.get(blockId);
                const price = existingBlock ? getTakeoverPrice(blockId) : BASE_PRICE;

                const newBlock = {
                    id: blockId,
                    x,
                    y,
                    owner: 'You...rWlt',
                    price,
                    color: color || '#00f6ff',
                    imageUrl: null,
                    purchasedAt: Date.now(),
                };

                newBlocks.set(blockId, newBlock);

                newTakeovers.push({
                    id: Date.now() + blockId,
                    wallet: 'You...rWlt',
                    blockId,
                    price,
                    timestamp: Date.now(),
                });
            });

            return {
                blocks: newBlocks,
                recentTakeovers: [...newTakeovers, ...state.recentTakeovers.slice(0, 19 - newTakeovers.length)],
                purchaseModalOpen: false,
                selectedBlockIds: [],
            };
        });

        return { success: true };
    },
}));