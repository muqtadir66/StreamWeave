import React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useState } from 'react'

import { useDrag } from '@use-gesture/react'
import Lights from './Lights'
import PlayerShip from './PlayerShip'
import WorldElements from './WorldElements'
import CameraRig from './CameraRig'
import SceneEffects from './SceneEffects.jsx'
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

function Scene() {
  useEffect(() => {
    console.log('[StreamWeave] Scene mounted')
    return () => console.log('[StreamWeave] Scene unmounted')
  }, [])
  const highQuality = useGameStore((s) => s.highQuality)
  const toggleHighQuality = useGameStore((s) => s.toggleHighQuality)
  const [mobileSteer, setMobileSteer] = useState({ x: 0, y: 0 })
  const setBoosting = useGameStore((s) => s.setBoosting);


  const bind = useDrag(({ active, movement: [mx, my] }) => {
    if (active) {
        const dist = Math.sqrt(mx * mx + my * my);
        const maxDist = 50;
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
        style={{ background: 'linear-gradient(180deg, #050814 0%, #000 70%)' }}
        dpr={1}
        gl={{ antialias: highQuality, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={["#0b1220", 40, 180]} />
        <Lights />
        <WorldElements key={`world-${runId}`} highQuality={highQuality} />
        <PlayerShip key={`ship-${runId}`} active={status === 'running'} mobileSteer={mobileSteer} />
        <CameraRig enabled={true} />
        <GameLoop />
        {highQuality && <SceneEffects />}
      </Canvas>

      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 3, display: 'flex', gap: 8 }}>
        <button onClick={toggleHighQuality}>
          {highQuality ? 'High' : 'Low'} Quality
        </button>
      </div>

      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 3, textAlign: 'right', fontFamily: "'Consolas', 'Monaco', monospace", fontSize: 16, lineHeight: 1.4, textShadow: '0 0 8px rgba(0, 246, 255, 0.7)' }}>
        <div>Score: {Math.floor(score)}</div>
        <div>Best: {best}</div>
      </div>

      {(status === 'idle' || status === 'crashed') && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, background: 'rgba(10, 20, 40, 0.2)', backdropFilter: 'blur(10px)' }}>
          <div style={{ textAlign: 'center', color: '#00f6ff' }}>
            <h1 style={{ fontSize: '4em', margin: 0, textShadow: '0 0 15px rgba(0, 246, 255, 0.8)' }}>
                {status === 'idle' ? 'StreamWeave' : 'CRASHED'}
            </h1>
            {status === 'crashed' && (
              <div style={{ fontSize: '1.5em', margin: '10px 0 20px', textShadow: '0 0 8px rgba(0, 246, 255, 0.7)' }}>Score: {Math.floor(score)} • Best: {best}</div>
            )}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: status === 'idle' ? '20px' : 0 }}>
              {status === 'crashed' && <button onClick={reset}>MENU</button>}
              <button onClick={start} style={{ color: '#fff', borderColor: '#fff' }}>{status === 'idle' ? 'START' : 'RETRY'}</button>
            </div>
            <div style={{ marginTop: 30, opacity: 0.6, fontSize: 12, fontFamily: 'sans-serif', letterSpacing: '1px' }}>
                Enter: Start • Esc: Crash • R: Reset • Space: Boost
            </div>
          </div>
        </div>
      )}
      
      {status === 'running' && (
        <>
            <div {...bind()} style={{ position: 'absolute', bottom: 20, left: 'calc(15vw - 55px)', width: 110, height: 110, background: 'rgba(0, 246, 255, 0.1)', border: '1px solid rgba(0, 246, 255, 0.3)', borderRadius: '50%', zIndex: 3}}>
                <div style={{ position: 'absolute', top: 55, left: 55, width: 24, height: 24, background: '#00f6ff', boxShadow: '0 0 10px rgba(0, 246, 255, 0.8)', borderRadius: '50%', transform: `translate(-50%, -50%) translate(${mobileSteer.x * 30}px, ${-mobileSteer.y * 30}px)` }}/>
            </div>
            <button 
                onPointerDown={() => setBoosting(true)}
                onPointerUp={() => setBoosting(false)}
                style={{ position: 'absolute', bottom: 30, right: 30, width: 80, height: 80, borderRadius: '50%', zIndex: 3 }}
            >
                BOOST
            </button>
        </>
      )}

    </div>
  )
}

export default Scene