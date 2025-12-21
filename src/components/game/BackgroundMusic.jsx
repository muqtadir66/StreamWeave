import React, { useRef, useEffect } from 'react'
import { useGameStore } from '../../stores/gameStore'

function BackgroundMusic() {
  const status = useGameStore((s) => s.status)
  const soundEnabled = useGameStore((s) => s.soundEnabled)
  const audioRef = useRef(null)

  // Ensure volume is set once
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = 0.4; // Set volume to 40% so it's not deafening
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (status === 'running') {
        if (soundEnabled) {
            // If the game just started (currentTime is 0 or it was paused), play
            // Use a promise catch to handle browser autoplay policies
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Audio autoplay prevented:", error);
                });
            }
        } else {
            audio.pause();
        }
    } else {
        // Stop audio when crashed or idle
        audio.pause();
        audio.currentTime = 0; // Reset to start for next round
    }
  }, [status, soundEnabled])

  // Handle re-triggering "Start from beginning" when round starts
  // We use a separate effect listening specifically for the transition to 'running'
  // to force the time reset.
  useEffect(() => {
     if (status === 'running' && audioRef.current) {
         audioRef.current.currentTime = 0;
         if (soundEnabled) audioRef.current.play().catch(() => {});
     }
  }, [status === 'running']) // Dependency on boolean ensures it fires on transition

  return (
    <audio 
        ref={audioRef} 
        src="/audio/game-loop.mp3" 
        loop 
        preload="auto"
    />
  )
}

export default BackgroundMusic