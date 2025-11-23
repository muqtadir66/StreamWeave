import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useGameStore = create(
  persist(
    (set, get) => ({
      status: 'idle', // idle | running | crashed
      score: 0,
      bestScore: 0,
      // Boost streak
      boostStreak: 0,
      longestBoostStreak: 0,
      allTimeLongestBoostStreak: 0,
      // Core game pacing
      speed: 22, // world flow speed units/s
      maxSpeed: 80,
      acceleration: 2, // units/s^2 to ramp difficulty
      // Boost state
      isBoosting: false,
      setBoosting: (isBoosting) => set({ isBoosting }),
      // Ship state (for camera and collisions)
      shipPos: { x: 0, y: 0, z: 0 },
      setShipPos: (pos) => set({ shipPos: pos }),
      // FX
      shake: 0,
      setShake: (v) => set({ shake: v }),

      // World remount key for hard resets
      runId: 0,
      start: () => set((s) => ({ status: 'running', score: 0, speed: 22, runId: s.runId + 1, shipPos: { x: 0, y: 0, z: 0 }, shake: 0 })),
      crash: () => {
        const { score, bestScore, boostStreak, longestBoostStreak, allTimeLongestBoostStreak } = get()
        const newBest = Math.max(bestScore ?? 0, Math.floor(score))
        const finalStreak = Math.max(boostStreak, longestBoostStreak)
        const newAllTimeBest = Math.max(allTimeLongestBoostStreak ?? 0, finalStreak)
        set({ status: 'crashed', bestScore: newBest, isBoosting: false, allTimeLongestBoostStreak: newAllTimeBest, boostStreak: 0, longestBoostStreak: finalStreak })
      },
      reset: () => set((s) => ({ status: 'idle', score: 0, speed: 22, runId: s.runId + 1, shipPos: { x: 0, y: 0, z: 0 }, shake: 0, isBoosting: false, boostStreak: 0, longestBoostStreak: 0 })),
      addScore: (delta) => set((s) => {
        const { isBoosting, boostStreak } = get()
        const scoreMultiplier = isBoosting ? 1 + Math.floor(boostStreak / 10) * 0.5 : 1;
        return { score: s.status === 'running' ? s.score + delta * scoreMultiplier : s.score }
      }),
      tickPacing: (delta) => set((s) => {
        if (s.status !== 'running') return {}
        const normalMaxSpeed = s.maxSpeed * 0.7;
        if (get().isBoosting) {
          return { speed: Math.min(s.maxSpeed, s.speed + s.maxSpeed * 0.8 * delta) }
        }
        // Instant reset logic
        const currentSpeed = get().speed;
        if (currentSpeed > normalMaxSpeed) {
            return { speed: Math.max(normalMaxSpeed, currentSpeed - s.maxSpeed * 2.0 * delta) }
        }
        const next = Math.min(normalMaxSpeed, s.speed + s.acceleration * delta)
        return { speed: next }
      }),
      tickBoostStreak: (delta) => set((s) => {
        if (s.status !== 'running') return {}
        if (get().isBoosting) {
          return { boostStreak: s.boostStreak + delta }
        } else {
          // Streak is broken
          const { boostStreak, longestBoostStreak } = get()
          const newLongest = Math.max(longestBoostStreak, boostStreak)
          return { boostStreak: 0, longestBoostStreak: newLongest }
        }
      }),
    }),
    {
      name: 'streamweave-game',
      partialize: (state) => ({ bestScore: state.bestScore, allTimeLongestBoostStreak: state.allTimeLongestBoostStreak }),
      storage: createJSONStorage(() => {
        try {
          return localStorage
        } catch (e) {
          console.warn('[StreamWeave] localStorage unavailable, using memory storage')
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
