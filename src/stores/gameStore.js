import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useGameStore = create(
  persist(
    (set, get) => ({
      status: 'idle', // idle | running | crashed
      score: 0,
      bestScore: 0,
      // Core game pacing
      speed: 22, // world flow speed units/s
      maxSpeed: 80,
      acceleration: 2, // units/s^2 to ramp difficulty
      // Ship state (for camera and collisions)
      shipPos: { x: 0, y: 0, z: 0 },
      setShipPos: (pos) => set({ shipPos: pos }),
      // FX
      shake: 0,
      setShake: (v) => set({ shake: v }),
      // Visual toggles
      highQuality: false,
      toggleHighQuality: () => set((s) => ({ highQuality: !s.highQuality })),
      // World remount key for hard resets
      runId: 0,
      start: () => set((s) => ({ status: 'running', score: 0, speed: 22, runId: s.runId + 1, shipPos: { x: 0, y: 0, z: 0 }, shake: 0 })),
      crash: () => {
        const { score, bestScore } = get()
        const newBest = Math.max(bestScore ?? 0, Math.floor(score))
        set({ status: 'crashed', bestScore: newBest })
      },
      reset: () => set((s) => ({ status: 'idle', score: 0, speed: 22, runId: s.runId + 1, shipPos: { x: 0, y: 0, z: 0 }, shake: 0 })),
      addScore: (delta) => set((s) => ({ score: s.status === 'running' ? s.score + delta : s.score })),
      tickPacing: (delta) => set((s) => {
        if (s.status !== 'running') return {}
        const next = Math.min(s.maxSpeed, s.speed + s.acceleration * delta)
        return { speed: next }
      }),
    }),
    {
      name: 'starweave-game',
      partialize: (state) => ({ bestScore: state.bestScore }),
      storage: createJSONStorage(() => {
        try {
          return localStorage
        } catch (e) {
          console.warn('[Starweave] localStorage unavailable, using memory storage')
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
      }),
    }
  )
)
