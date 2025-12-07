import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useGameStore = create(
  persist(
    (set, get) => ({
      status: 'idle', // idle | running | crashed
      
      // --- ECONOMY ---
      balance: 10000,     
      wager: 1000,        
      lastWager: 0,       // NEW: Snapshot of the wager used in the previous run
      payout: 0,          
      
      bankedMultiplier: 0.0,
      
      // --- FUEL SYSTEM ---
      fuel: 100,
      maxFuel: 100,
      fuelDrain: 8,       
      fuelRegen: 15,      
      
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
      setWager: (amount) => set({ wager: amount }),
      refill: () => set({ balance: 10000 }),

      start: () => {
        const { balance, wager, runId } = get()
        if (balance < wager) return 

        set({ 
          status: 'running', 
          balance: balance - wager, 
          lastWager: wager, // SNAPSHOT: Lock in the wager for this run
          payout: 0,
          bankedMultiplier: 0.0,
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
          let addedMult = 0.0;
          
          if (boostStreak >= 50) addedMult = 20.0;      
          else if (boostStreak >= 40) addedMult = 8.0;  
          else if (boostStreak >= 30) addedMult = 3.5;  
          else if (boostStreak >= 20) addedMult = 1.5;  
          else if (boostStreak >= 10) addedMult = 0.5;  
          else addedMult = 0.0;                         

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

        // Fuel Logic
        let newFuel = s.fuel
        if (s.isBoosting) {
          newFuel = Math.min(s.maxFuel, s.fuel + s.fuelRegen * delta)
        } else {
          newFuel = s.fuel - s.fuelDrain * delta
        }

        if (newFuel <= 0) {
          get().crash()
          return { fuel: 0 }
        }

        // Streak & Tier Logic
        let newStreak = 0
        let newTier = 0
        
        if (s.isBoosting) {
          newStreak = s.boostStreak + delta
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
        if (s.isBoosting) {
          return { speed: Math.min(s.maxSpeed, s.speed + s.maxSpeed * 0.5 * delta) }
        }
        return { speed: Math.max(22, s.speed - s.maxSpeed * 1.5 * delta) }
      }),

      crash: () => {
        // Use lastWager here to calculate winnings (it's safer, though effectively the same as wager during a run)
        const { lastWager, bankedMultiplier, balance } = get()
        
        const winAmount = Math.floor(lastWager * bankedMultiplier);
        
        set({ 
          status: 'crashed', 
          isBoosting: false, 
          payout: winAmount,
          balance: balance + winAmount 
        })
      },

      reset: () => set((s) => ({ status: 'idle' })),
    }),
    {
      name: 'streamweave-storage',
      partialize: (state) => ({ balance: state.balance }), 
      storage: createJSONStorage(() => localStorage),
    }
  )
)