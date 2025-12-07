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
  const tickGameLoop = useGameStore((s) => s.tickGameLoop)

  useFrame((_, delta) => {
    if (status === 'running') {
      tickGameLoop(delta)
    }
  })
  return null
}

function Scene() {
  const [mobileSteer, setMobileSteer] = useState({ x: 0, y: 0 })
  const setBoosting = useGameStore((s) => s.setBoosting);
  const status = useGameStore((s) => s.status)
  const start = useGameStore((s) => s.start)
  const reset = useGameStore((s) => s.reset)
  const crash = useGameStore((s) => s.crash)
  const runId = useGameStore((s) => s.runId)
  
  // Economy Stats
  const bankedMultiplier = useGameStore((s) => s.bankedMultiplier)
  const wager = useGameStore((s) => s.wager)
  
  // Calculate projected win
  const projectedWin = Math.floor(wager * bankedMultiplier);
  const isProfit = bankedMultiplier >= 1.0;

  // Input Handling
  const bind = useDrag(({ active, movement: [mx, my] }) => {
    if (active) {
        const dist = Math.sqrt(mx * mx + my * my);
        const maxDist = 50;
        if (dist > maxDist) setMobileSteer({ x: mx / dist, y: -my / dist });
        else setMobileSteer({ x: mx / maxDist, y: -my / maxDist });
    } else {
        setMobileSteer({ x: 0, y: 0 });
    }
  }, { pointer: { capture: true, keys: false } })

  useEffect(() => {
    const handlePointerUp = () => setMobileSteer({ x: 0, y: 0 });
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Enter' && (status === 'idle' || status === 'crashed')) start()
      if (e.code === 'KeyR' && status === 'crashed') reset()
      if (e.code === 'Escape' && status === 'running') crash()
    }
    const onBoost = (e) => { if(e.code === 'Space') setBoosting(true); }
    const offBoost = (e) => { if(e.code === 'Space') setBoosting(false); }
    
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

      {/* Top Info Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, pointerEvents: 'none',
        display: 'flex', justifyContent: 'space-between', padding: '15px 25px',
        background: 'linear-gradient(180deg, rgba(0, 10, 20, 0.9) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(0, 246, 255, 0.2)'
      }}>
        {/* Left: Status & Multiplier */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', color: '#00f6ff', fontFamily: 'monospace' }}>
          <div style={{
            padding: '4px 12px', borderRadius: '15px',
            background: status === 'running' ? 'rgba(0, 246, 255, 0.2)' : 'rgba(255, 50, 50, 0.2)',
            border: `1px solid ${status === 'running' ? '#00f6ff' : '#ff3333'}`
          }}>
            {status === 'running' ? '● LIVE' : '● STOP'}
          </div>
          <div style={{ color: isProfit ? '#00ff88' : '#fff' }}>
            MULT: {bankedMultiplier.toFixed(1)}x
          </div>
        </div>

        {/* Right: Banked Payout & Wager */}
        <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
          <div style={{ fontSize: '18px', color: isProfit ? '#00ff88' : '#fff' }}>
            BANK: {projectedWin.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
            WAGER: {wager.toLocaleString()}
          </div>
        </div>
      </div>

      <MainMenu />
      
      {/* Controls (Hidden when idle) */}
      <div style={{ display: status === 'running' ? 'block' : 'none' }}>
          <div style={{
            position: 'absolute', bottom: '120px', left: 'calc(15vw - 75px)',
            width: '150px', height: '150px', zIndex: 10, pointerEvents: 'auto'
          }}>
            <div {...bind()} style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 246, 255, 0.2), transparent)',
              border: '2px solid rgba(0, 246, 255, 0.4)', position: 'relative'
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', width: '20px', height: '20px',
                background: '#00f6ff', borderRadius: '50%',
                transform: `translate(-50%, -50%) translate(${mobileSteer.x * 40}px, ${-mobileSteer.y * 40}px)`
              }} />
            </div>
          </div>

          <div style={{
            position: 'absolute', bottom: '120px', right: '20px', zIndex: 10, pointerEvents: 'auto'
          }}>
            <button
              onPointerDown={() => setBoosting(true)}
              onPointerUp={() => setBoosting(false)}
              onPointerLeave={() => setBoosting(false)}
              style={{
                width: '100px', height: '100px', borderRadius: '50%',
                border: '2px solid #ff4444', background: 'rgba(255, 68, 68, 0.1)',
                color: '#ff4444', fontWeight: 'bold', fontFamily: 'monospace',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              BOOST
            </button>
          </div>
      </div>
    </div>
  )
}

export default Scene