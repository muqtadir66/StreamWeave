import React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'

import { useDrag } from '@use-gesture/react'
import Lights from './Lights'
import PlayerShip from './PlayerShip'
import WorldElements from './WorldElements'
import CameraRig from './CameraRig'
import Effects from './Effects'
import { useGameStore } from '../../stores/gameStore'

function GameLoop() {
  const status = useGameStore((s) => s.status)
  const speed = useGameStore((s) => s.speed)
  const addScore = useGameStore((s) => s.addScore)
  useFrame((_, delta) => {
    if (status === 'running') {
      // Score = distance ~ speed per second
      addScore(speed * 0.5 * delta)
    }
  })
  return null
}

function Scene() {
  useEffect(() => {
    console.log('[Starweave] Scene mounted')
    return () => console.log('[Starweave] Scene unmounted')
  }, [])
  const highQuality = useGameStore((s) => s.highQuality)
  const toggleHighQuality = useGameStore((s) => s.toggleHighQuality)
  const [mobileSteer, setMobileSteer] = useState({ x: 0, y: 0 })
  const [laneImpulseX, setLaneImpulseX] = useState(0)
  const [laneImpulseY, setLaneImpulseY] = useState(0)
  const [controlMode, setControlMode] = useState('swipe')

  const bind = useDrag(({ active, xy: [x, y] }) => {
    if (!active) setMobileSteer({ x: 0, y: 0 })
    else {
      const dx = x - 70 // joystick center at 50 + 20 margin
      const dy = y - 70
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 50) {
        setMobileSteer({ x: dx / dist, y: dy / dist })
      } else {
        setMobileSteer({ x: dx / 50, y: dy / 50 })
      }
    }
  }, { pointer: { capture: true } })

  const bindScene = useDrag(({ active, movement: [moveX, moveY] }) => {
    if (!active && (Math.abs(moveX) > 15 || Math.abs(moveY) > 15)) {
      const dirX = moveX > 0 ? 1 : moveX < 0 ? -1 : 0
      const dirY = moveY > 0 ? -1 : moveY < 0 ? 1 : 0
      if (dirX !== 0) {
        setLaneImpulseX(dirX)
        setTimeout(() => setLaneImpulseX(0), 60)
      }
      if (dirY !== 0) {
        setLaneImpulseY(dirY)
        setTimeout(() => setLaneImpulseY(0), 60)
      }
    }
  }, { pointer: { capture: true }, swipe: true })

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
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status, start, reset, crash])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', touchAction: 'none' }} {...(controlMode === 'swipe' ? bindScene() : {})}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 68 }}
        style={{ background: 'linear-gradient(180deg, #050814 0%, #000 70%)' }}
        dpr={highQuality ? [1, 2] : 1}
        gl={{ antialias: highQuality, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={["#0b1220", 26, 160]} />
        <Lights />
        <WorldElements key={`world-${runId}`} />
        <PlayerShip key={`ship-${runId}`} laneImpulseX={laneImpulseX} laneImpulseY={laneImpulseY} active={status === 'running'} />
        <CameraRig enabled={true} />
        <GameLoop />
        <Effects enabled={highQuality} />
      </Canvas>

      {/* Top-left controls */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 3, display: 'flex', gap: 8 }}>
        <button onClick={toggleHighQuality}>
          {highQuality ? 'High' : 'Low'} Quality
        </button>
        <button onClick={() => setControlMode(mode => mode === 'drag' ? 'swipe' : 'drag')}>
          Mode: {controlMode}
        </button>
      </div>

      {/* D-pad for lane changes */}
      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 3, display: 'grid', gridTemplateColumns: '40px 40px 40px', gridTemplateRows: '40px 40px 40px', gap: 6 }}>
        <div />
        <button onClick={() => { setLaneImpulseY(1); setTimeout(()=>setLaneImpulseY(0),60) }}>↑</button>
        <div />
        <button onClick={() => { setLaneImpulseX(-1); setTimeout(()=>setLaneImpulseX(0),60) }}>←</button>
        <div />
        <button onClick={() => { setLaneImpulseX(1); setTimeout(()=>setLaneImpulseX(0),60) }}>→</button>
        <div />
        <button onClick={() => { setLaneImpulseY(-1); setTimeout(()=>setLaneImpulseY(0),60) }}>↓</button>
        <div />
      </div>

      {/* HUD */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 3, textAlign: 'right', fontSize: 14, lineHeight: 1.2, textShadow: '0 0 6px #17a' }}>
        <div>Score: {Math.floor(score)}</div>
        <div>Best: {best}</div>
      </div>

      {/* Center overlay */}
      {(status === 'idle' || status === 'crashed') && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', padding: 20, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: 24, marginBottom: 12, textAlign: 'center' }}>
              {status === 'idle' ? 'Starweave' : 'Crashed'}
            </div>
            {status === 'crashed' && (
              <div style={{ fontSize: 14, marginBottom: 8, textAlign: 'center' }}>Score: {Math.floor(score)} • Best: {best}</div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {status === 'crashed' && (
                <button onClick={reset}>Menu</button>
              )}
              <button onClick={start}>{status === 'idle' ? 'Start' : 'Retry'}</button>
            </div>
            <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12, textAlign: 'center' }}>Enter: Start • Esc: Crash • R: Reset</div>
          </div>
        </div>
      )}

      {/* Virtual joystick */}
      {controlMode === 'drag' && (
        <div {...bind()} style={{ position: 'absolute', bottom: 20, left: 20, width: 110, height: 110, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(2px)', borderRadius: '50%', zIndex: 3 }}>
          <div
            style={{
              position: 'absolute',
              top: 55,
              left: 55,
              width: 24,
              height: 24,
              background: '#fff',
              boxShadow: '0 0 10px rgba(255,255,255,0.6)',
              borderRadius: '50%',
              transform: `translate(-50%, -50%) translate(${mobileSteer.x * 30}px, ${mobileSteer.y * 30}px)`,
            }}
          />
        </div>
      )}
    </div>
  )
}

export default Scene
