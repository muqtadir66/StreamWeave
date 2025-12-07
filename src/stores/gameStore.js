import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useGameStore = create(
  persist(
    (set, get) => ({
      status: 'idle', // idle | running | crashed
      
      // --- ECONOMY (MOCK TOKENS) ---
      balance: 10000,     // Total wallet balance
      wager: 1000,        // Current selected wager
      payout: 0,          // Payout from the last run
      
      bankedMultiplier: 0.0, // DIRECT MULTIPLIER (e.g. 1.5, 3.5)
      
      // --- FUEL SYSTEM (ANTI-CAMPING) ---
      fuel: 100,
      maxFuel: 100,
      fuelDrain: 8,       // Drains 8% per sec while NOT boosting (~12s survival)
      fuelRegen: 15,      // Regens 15% per sec while boosting
      
      // --- GAMEPLAY STATE ---
      boostStreak: 0,
      currentTier: 0,
      isBoosting: false,
      speed: 22,
      maxSpeed: 80,
      acceleration: 2,
      shipPos: { x: 0, y: 0, z: 0 },
      shake: 0,
      runId: 0,

      // --- ACTIONS ---
      setShipPos: (pos) => set({ shipPos: pos }),
      setShake: (v) => set({ shake: v }),

      // New: Set Wager (500 - 100,000)
      setWager: (amount) => set({ wager: amount }),

      // New: Refill if broke (< 500)
      refill: () => set({ balance: 10000 }),

      start: () => {
        const { balance, wager, runId } = get()
        if (balance < wager) return // Prevent start if insufficient funds

        set({ 
          status: 'running', 
          balance: balance - wager, // Deduct wager immediately
          payout: 0,
          bankedMultiplier: 0.0, // Reset multiplier
          boostStreak: 0,
          currentTier: 0,
          fuel: 100,
          speed: 22,
          runId: runId + 1 
        })
      },

      setBoosting: (active) => {
        const { status, boostStreak, bankedMultiplier } = get()
        if (status !== 'running') return

        if (active) {
          set({ isBoosting: true })
        } else {
          // --- STEP FUNCTION MECHANIC ---
          // You must release SAFELY to bank the multiplier.
          // Tiers: 10s=0.5x, 20s=1.5x, 30s=3.5x, 40s=8.0x, 50s=20x
          let addedMult = 0.0;
          
          if (boostStreak >= 50) addedMult = 20.0;      // Tier 5: Jackpot
          else if (boostStreak >= 40) addedMult = 8.0;  // Tier 4: Mars
          else if (boostStreak >= 30) addedMult = 3.5;  // Tier 3: Moon
          else if (boostStreak >= 20) addedMult = 1.5;  // Tier 2: Profit
          else if (boostStreak >= 10) addedMult = 0.5;  // Tier 1: Safety
          else addedMult = 0.0;                         // Tier 0: Fail

          set({ 
            isBoosting: false, 
            boostStreak: 0, 
            currentTier: 0,
            bankedMultiplier: bankedMultiplier + addedMult
          })
        }
      },

      tickGameLoop: (delta) => set((s) => {
        if (s.status !== 'running') return {}

        // 1. Fuel Logic
        let newFuel = s.fuel
        if (s.isBoosting) {
          newFuel = Math.min(s.maxFuel, s.fuel + s.fuelRegen * delta)
        } else {
          newFuel = s.fuel - s.fuelDrain * delta
        }

        // Empty Fuel = Crash
        if (newFuel <= 0) {
          get().crash()
          return { fuel: 0 }
        }

        // 2. Streak & Tier Logic
        let newStreak = 0
        let newTier = 0
        
        if (s.isBoosting) {
          newStreak = s.boostStreak + delta
          // Update visual tier for HUD
          if (newStreak >= 50) newTier = 5
          else if (newStreak >= 40) newTier = 4
          else if (newStreak >= 30) newTier = 3
          else if (newStreak >= 20) newTier = 2
          else if (newStreak >= 10) newTier = 1
        }

        return { 
          fuel: newFuel, 
          boostStreak: newStreak,
          currentTier: newTier
        }
      }),

      tickPacing: (delta) => set((s) => {
        if (s.status !== 'running') return {}
        // Speed up when boosting, slow down quickly when not
        if (s.isBoosting) {
          return { speed: Math.min(s.maxSpeed, s.speed + s.maxSpeed * 0.5 * delta) }
        }
        return { speed: Math.max(22, s.speed - s.maxSpeed * 1.5 * delta) }
      }),

      crash: () => {
        const { wager, bankedMultiplier, balance } = get()
        
        // Payout Calculation: Wager * Total Multiplier
        const winAmount = Math.floor(wager * bankedMultiplier);
        
        set({ 
          status: 'crashed', 
          isBoosting: false, 
          payout: winAmount,
          balance: balance + winAmount // Credit winnings
        })
      },

      reset: () => set((s) => ({ status: 'idle' })),
    }),
    {
      name: 'streamweave-storage',
      partialize: (state) => ({ balance: state.balance }), // Persist balance only
      storage: createJSONStorage(() => localStorage),
    }
  )
)