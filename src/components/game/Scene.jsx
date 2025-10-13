import React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'

import { useDrag } from '@use-gesture/react'
import Lights from './Lights'
import PlayerShip from './PlayerShip'
import WorldElements from './WorldElements'
import CameraRig from './CameraRig'
import { useGameStore } from '../../stores/gameStore'

function GameLoop() {
  const status = useGameStore((s) => s.status)
  const speed = useGameStore((s) => s.speed)
  const addScore = useGameStore((s) => s.addScore)
  useFrame((_, delta) => {
    if (status === 'running') {
      addScore(speed * 0.5 * delta)
    }
  })
  return null
}

function Effects({ enabled = true }) {
  if (!enabled) return null
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <SMAA />
      <Bloom 
        intensity={1.5} 
        luminanceThreshold={0.15}
        luminanceSmoothing={0.1} 
        mipmapBlur 
        radius={0.8} 
      />
      <Vignette eskil={false} offset={0.2} darkness={0.6} />
    </EffectComposer>
  )
}

function Scene() {
  useEffect(() => {
    console.log('[Starweave] Scene mounted')
    return () => console.log('[Starweave] Scene unmounted')
  }, [])
  const highQuality = useGameStore((s) => s.highQuality)
  const toggleHighQuality = useGameStore((s) => s.toggleHighQuality)
  const [mobileSteer, setMobileSteer] = useState({ x: 0, y: 0 })

  const bind = useDrag(({ active, xy: [x, y], movement: [mx, my] }) => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!active) {
        setMobileSteer({ x: 0, y: 0 });
        return;
    }
    
    const stickCenterX = window.innerWidth * 0.15;
    const stickCenterY = window.innerHeight - 80;
    
    let dx, dy;
    if (isTouch) {
        dx = x - stickCenterX;
        dy = y - stickCenterY;
    } else {
        dx = mx;
        dy = my;
    }

    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = 50;
    
    if (dist > maxDist) {
        setMobileSteer({ x: dx / dist, y: -dy / dist });
    } else {
        setMobileSteer({ x: dx / maxDist, y: -dy / maxDist });
    }
  }, { 
    pointer: { capture: true, keys: false },
    from: () => {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        return isTouch ? [window.innerWidth * 0.15, window.innerHeight-80] : [0,0]
    }
  })


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
    <div style={{ position: 'relative', width: '100vw', height: '100vh', touchAction: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 68 }}
        style={{ background: 'linear-gradient(180deg, #050814 0%, #000 70%)' }}
        dpr={highQuality ? [1, 2] : 1}
        gl={{ antialias: highQuality, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={["#0b1220", 26, 160]} />
        <Lights />
        <WorldElements key={`world-${runId}`} />
        <PlayerShip key={`ship-${runId}`} active={status === 'running'} mobileSteer={mobileSteer} />
        <CameraRig enabled={true} />
        <GameLoop />
        <Effects enabled={highQuality} />
      </Canvas>

      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 3, display: 'flex', gap: 8 }}>
        <button onClick={toggleHighQuality}>
          {highQuality ? 'High' : 'Low'} Quality
        </button>
      </div>

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 3, textAlign: 'right', fontSize: 14, lineHeight: 1.2, textShadow: '0 0 6px #17a' }}>
        <div>Score: {Math.floor(score)}</div>
        <div>Best: {best}</div>
      </div>

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
              {status === 'crashed' && <button onClick={reset}>Menu</button>}
              <button onClick={start}>{status === 'idle' ? 'Start' : 'Retry'}</button>
            </div>
            <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12, textAlign: 'center' }}>Enter: Start • Esc: Crash • R: Reset</div>
          </div>
        </div>
      )}

      <div {...bind()} style={{ position: 'absolute', bottom: 20, left: 'calc(15vw - 55px)', width: 110, height: 110, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(2px)', borderRadius: '50%', zIndex: 3, display: status === 'running' ? 'block' : 'none' }}>
        <div style={{ position: 'absolute', top: 55, left: 55, width: 24, height: 24, background: '#fff', boxShadow: '0 0 10px rgba(255,255,255,0.6)', borderRadius: '50%', transform: `translate(-50%, -50%) translate(${mobileSteer.x * 30}px, ${-mobileSteer.y * 30}px)` }}/>
      </div>

    </div>
  )
}

export default Scene