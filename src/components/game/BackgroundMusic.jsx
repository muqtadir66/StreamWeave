import React, { useRef, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'
import { preloadCrashSfx, unlockAudio } from '../../utils/sfx'

function BackgroundMusic() {
  const status = useGameStore((s) => s.status)
  const isBoosting = useGameStore((s) => s.isBoosting)
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  const audioRef = useRef(null)
  const pauseTimerRef = useRef(null)
  const didPrimeForRoundRef = useRef(false)

  const isIOS = (() => {
    const ua = globalThis?.navigator?.userAgent || ''
    const isiPhoneIpadIpod = /iPad|iPhone|iPod/.test(ua)
    const isiPadOS = /Mac/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document
    return isiPhoneIpadIpod || isiPadOS
  })()

  // Ensure volume is set once
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = 0.4; // Set volume to 40% so it's not deafening
    }
  }, [])

  // Preload short SFX assets early (prevents iOS "first play" delay/miss).
  useEffect(() => {
    if (!soundEnabled) return;
    preloadCrashSfx({ volume: 0.5 });
  }, [soundEnabled]);

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }

    if (status === 'running') {
      if (!soundEnabled) {
        audio.pause()
        return
      }

      // Ensure the WebAudio context is unlocked for SFX on iOS (Phantom WebView).
      void unlockAudio()

      // New behavior: music only plays while boosting; pause (do not reset) when boost ends.
      if (isBoosting) {
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {})
        }
      } else {
        audio.pause()
      }
    } else {
        // Stop audio when crashed or idle.
        // iOS/Phantom WebView: pausing the HTMLAudio element at the exact same time as SFX starts
        // can occasionally suppress the SFX. Delay the pause slightly on iOS only.
        if (isIOS && soundEnabled) {
          pauseTimerRef.current = setTimeout(() => {
            pauseTimerRef.current = null
            audio.pause()
          }, 250)
        } else {
          audio.pause()
        }
    }
  }, [status, soundEnabled, isBoosting])

  // Handle re-triggering "Start from beginning" when round starts
  // We use a separate effect listening specifically for the transition to 'running'
  // to force the time reset.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (status === 'running') {
      // Reset soundtrack to beginning each round.
      audio.currentTime = 0
      didPrimeForRoundRef.current = true
      // Do not start playing unless boosting is active.
      if (!isBoosting) audio.pause()
    } else {
      didPrimeForRoundRef.current = false
    }
  }, [status === 'running']) // fires on transition

  return (
    <audio 
        ref={audioRef} 
        id="streamweave-bgm"
        src="/audio/game-loop.mp3" 
        loop 
        preload="auto"
    />
  )
}

export default BackgroundMusic
