import React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'

import { useDrag } from '@use-gesture/react'
import Lights from './Lights'
import PlayerShip from './PlayerShip'
import WorldElements from './WorldElements'
import CameraRig from './CameraRig'
import MainMenu from './MainMenu'
import BoostStreakHUD from './BoostStreakHUD'
import { useGameStore } from '../../stores/gameStore'

function GameLoop() {
  const status = useGameStore((s) => s.status)
  const speed = useGameStore((s) => s.speed)
  const addScore = useGameStore((s) => s.addScore)
  const tickBoostStreak = useGameStore((s) => s.tickBoostStreak)

  useFrame((_, delta) => {
    if (status === 'running') {
      addScore(speed * 0.5 * delta)
      tickBoostStreak(delta)
    }
  })
  return null
}

function Scene() {
  useEffect(() => {
    console.log('[StreamWeave] Scene mounted')
    return () => console.log('[StreamWeave] Scene unmounted')
  }, [])
  const [mobileSteer, setMobileSteer] = useState({ x: 0, y: 0 })
  const setBoosting = useGameStore((s) => s.setBoosting);


  const bind = useDrag(({ active, movement: [mx, my] }) => {
    if (active) {
        const dist = Math.sqrt(mx * mx + my * my);
        const maxDist = 50; // Original maxDist, this is the drag sensitivity
        if (dist > maxDist) {
            setMobileSteer({ x: mx / dist, y: -my / dist });
        } else {
            setMobileSteer({ x: mx / maxDist, y: -my / maxDist });
        }
    } else {
        setMobileSteer({ x: 0, y: 0 });
    }
  }, { 
    pointer: { capture: true, keys: false },
  })

  useEffect(() => {
    const handlePointerUp = () => setMobileSteer({ x: 0, y: 0 });
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);


  const status = useGameStore((s) => s.status)
  const start = useGameStore((s) => s.start)
  const reset = useGameStore((s) => s.reset)
  const crash = useGameStore((s) => s.crash)
  const score = useGameStore((s) => s.score)
  const best = useGameStore((s) => s.bestScore)
  const runId = useGameStore((s) => s.runId)

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Enter' && (status === 'idle' || status === 'crashed')) start()
      if (e.code === 'KeyR' && status === 'crashed') reset()
      if (e.code === 'Escape' && status === 'running') crash()
    }
    const onBoost = (e) => {
        if(e.code === 'Space') setBoosting(true);
    }
    const offBoost = (e) => {
        if(e.code === 'Space') setBoosting(false);
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keydown', onBoost)
    window.addEventListener('keyup', offBoost)
    return () => {
        window.removeEventListener('keydown', onKey)
        window.removeEventListener('keydown', onBoost)
        window.removeEventListener('keyup', offBoost)
    }
  }, [status, start, reset, crash, setBoosting])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', touchAction: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 68 }}
        style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #374151 50%, #111827 100%)' }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={["#6b7280", 40, 180]} />
        <Lights />
        <WorldElements key={`world-${runId}`} />
        <PlayerShip key={`ship-${runId}`} active={status === 'running'} mobileSteer={mobileSteer} />
        <CameraRig enabled={true} />
        <GameLoop />
      </Canvas>

      <BoostStreakHUD />

      {/* Enhanced Game HUD */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: 'none'
      }}>
        {/* Top HUD Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '15px 25px',
          background: 'linear-gradient(180deg, rgba(0, 10, 20, 0.8) 0%, transparent 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 246, 255, 0.2)'
        }}>
          {/* Left side - System status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            fontFamily: "'Courier New', 'Consolas', monospace",
            fontSize: '14px',
            color: '#00f6ff'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              background: status === 'running' ? 'rgba(0, 246, 255, 0.2)' : 'rgba(153, 0, 0, 0.2)',
              border: `1px solid ${status === 'running' ? 'rgba(0, 246, 255, 0.5)' : 'rgba(153, 0, 0, 0.5)'}`,
              borderRadius: '15px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: status === 'running' ? '#00f6ff' : '#ff4444',
                boxShadow: `0 0 8px ${status === 'running' ? 'rgba(0, 246, 255, 0.8)' : 'rgba(255, 68, 68, 0.8)'}`
              }} />
              <span>STATUS: {status === 'running' ? 'ACTIVE' : 'STANDBY'}</span>
            </div>
          </div>

          {/* Right side - Score display */}
          <div style={{
            textAlign: 'right',
            fontFamily: "'Courier New', 'Consolas', monospace",
            pointerEvents: 'auto'
          }}>
            <div style={{
              fontSize: '18px',
              color: '#00f6ff',
              textShadow: '0 0 10px rgba(0, 246, 255, 0.8)',
              marginBottom: '2px'
            }}>
              SCORE: {Math.floor(score)}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'rgba(0, 246, 255, 0.7)',
              textShadow: '0 0 5px rgba(0, 246, 255, 0.5)'
            }}>
              BEST: {best}
            </div>
          </div>
        </div>
      </div>

      {/* New Main Menu Component */}
      <MainMenu />
      
      {/* Wrapper div that toggles display */}
      <div style={{ display: status === 'running' ? 'block' : 'none' }}>
        
          {/* Enhanced Mobile Steering Control */}
          <div style={{
            position: 'absolute',
            bottom: '120px',
            /* --- FIX: Reverted left calc for 150px width --- */
            left: 'calc(15vw - 75px)',
            /* --- FIX: Reverted size to 150px --- */
            width: '150px',
            height: '150px',
            zIndex: 10,
            pointerEvents: 'auto'
          }}>
            <div {...bind()} 
              onPointerLeave={() => setMobileSteer({ x: 0, y: 0 })}
              onPointerCancel={() => setMobileSteer({ x: 0, y: 0 })}
              style={{
              width: '100%',
              height: '100%',
              background: 'radial-gradient(circle, rgba(0, 246, 255, 0.2) 0%, rgba(0, 246, 255, 0.05) 70%, transparent 100%)',
              border: '2px solid rgba(0, 246, 255, 0.4)',
              borderRadius: '50%',
              position: 'relative',
              transition: 'all 0.1s ease-out'
            }}>
              {/* Outer ring indicators */}
              <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                right: '10px',
                bottom: '10px',
                border: '1px solid rgba(0, 246, 255, 0.2)',
                borderRadius: '50%'
              }} />
              <div style={{
                position: 'absolute',
                top: '25px',
                left: '25px',
                right: '25px',
                bottom: '25px',
                border: '1px solid rgba(0, 246, 255, 0.1)',
                borderRadius: '50%'
              }} />

              {/* Center control dot */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '20px',
                height: '20px',
                background: '#00f6ff',
                border: '2px solid #ffffff',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                transition: 'all 0.1s ease-out',
                boxShadow: '0 0 15px rgba(0, 246, 255, 0.9)',
                /* --- FIX: Reverted drag multiplier for 150px area --- */
                transform: `translate(-50%, -50%) translate(${mobileSteer.x * 40}px, ${-mobileSteer.y * 40}px)`
              }} />

              {/* Direction indicators */}
              {mobileSteer.x !== 0 || mobileSteer.y !== 0 ? (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '2px',
                  height: '2px',
                  background: '#00f6ff',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px #00f6ff',
                  /* --- FIX: Reverted drag multiplier for 150px area --- */
                  transform: `translate(-50%, -50%) translate(${mobileSteer.x * 45}px, ${-mobileSteer.y * 45}px)`
                }} />
              ) : null}
            </div>
          </div>

          {/* Enhanced Boost Button */}
          <div style={{
            position: 'absolute',
            bottom: '120px',
            right: '20px',
            zIndex: 10,
            pointerEvents: 'auto'
          }}>
            <button
              onPointerDown={() => setBoosting(true)}
              onPointerUp={() => setBoosting(false)}
              onPointerLeave={() => setBoosting(false)}
              onPointerCancel={() => setBoosting(false)}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '2px solid #ff4444',
                background: 'radial-gradient(circle, rgba(255, 68, 68, 0.3) 0%, rgba(255, 68, 68, 0.1) 50%, transparent 100%)',
                color: '#ff4444',
                fontSize: '12px',
                fontWeight: 'bold',
                fontFamily: "'Courier New', 'Consolas', monospace",
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textShadow: '0 0 8px rgba(255, 68, 68, 0.8)',
                boxShadow: '0 0 20px rgba(255, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}
            >
              <div style={{ fontSize: '8px', opacity: 0.8 }}>THRUST</div>
              <div style={{ fontSize: '14px' }}>BOOST</div>
              <div style={{
                position: 'absolute',
                top: '5px',
                left: '5px',
                right: '5px',
                bottom: '5px',
                border: '1px solid rgba(255, 68, 68, 0.3)',
                borderRadius: '50%'
              }} />
            </button>
          </div>

          {/* Bottom HUD Bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            pointerEvents: 'none'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px 20px',
              background: 'linear-gradient(0deg, rgba(0, 10, 20, 0.8) 0%, transparent 100%)',
              backdropFilter: 'blur(10px)',
              borderTop: '1px solid rgba(0, 246, 255, 0.2)'
            }}>
              <div style={{
                fontFamily: "'Courier New', 'Consolas', monospace",
                fontSize: '12px',
                color: 'rgba(0, 246, 255, 0.7)',
                textAlign: 'center'
              }}>
                <div>🕹️ Touch: Steer • Press: Boost • Enter: Menu • Esc: Stop</div>
              </div>
            </div>
          </div>
        
      </div>
      {/* This is the closing tag for the new wrapper div */}

    </div>
  )
}

export default Scene
