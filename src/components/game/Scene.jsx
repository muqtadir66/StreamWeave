import React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'

import { useDrag } from '@use-gesture/react'
import Lights from './Lights'
import PlayerShip from './PlayerShip'
import WorldElements from './WorldElements'
import CameraRig from './CameraRig'
import MainMenu from './MainMenu'
import BoostStreakHUD from './BoostStreakHUD'
import { useGameStore } from '../../stores/gameStore'
import { useWallet } from '@solana/wallet-adapter-react';

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
  const joystickPointerIdRef = useRef(null)
  const boostPointerIdRef = useRef(null)
  const joystickElRef = useRef(null)
  const boostBtnRef = useRef(null)
  const walletCtx = useWallet();
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
  const bind = useDrag(({ active, movement: [mx, my], event }) => {
    if (active) {
        if (joystickPointerIdRef.current == null && event?.pointerId != null) {
          joystickPointerIdRef.current = event.pointerId
        }
        const dist = Math.sqrt(mx * mx + my * my);
        const maxDist = 50;
        if (dist > maxDist) setMobileSteer({ x: mx / dist, y: -my / dist });
        else setMobileSteer({ x: mx / maxDist, y: -my / maxDist });
    } else {
        joystickPointerIdRef.current = null
        setMobileSteer({ x: 0, y: 0 });
    }
  }, { pointer: { capture: true, keys: false } })

  const stopAllInputs = () => {
    const boostPid = boostPointerIdRef.current
    const joyPid = joystickPointerIdRef.current

    if (boostPid != null && boostBtnRef.current) {
      try { boostBtnRef.current.releasePointerCapture(boostPid) } catch {}
    }
    if (joyPid != null && joystickElRef.current) {
      try { joystickElRef.current.releasePointerCapture(joyPid) } catch {}
    }

    boostPointerIdRef.current = null
    joystickPointerIdRef.current = null
    setBoosting(false)
    setMobileSteer({ x: 0, y: 0 })
  }

  useEffect(() => {
    const handlePointerEnd = (e) => {
      const pointerId = e?.pointerId
      if (pointerId == null) return

      if (boostPointerIdRef.current === pointerId) {
        boostPointerIdRef.current = null
        if (boostBtnRef.current) {
          try { boostBtnRef.current.releasePointerCapture(pointerId) } catch {}
        }
        setBoosting(false)
      }

      if (joystickPointerIdRef.current === pointerId) {
        joystickPointerIdRef.current = null
        if (joystickElRef.current) {
          try { joystickElRef.current.releasePointerCapture(pointerId) } catch {}
        }
        setMobileSteer({ x: 0, y: 0 })
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) stopAllInputs()
    }

    window.addEventListener('pointerup', handlePointerEnd, { passive: true })
    window.addEventListener('pointercancel', handlePointerEnd, { passive: true })
    window.addEventListener('blur', stopAllInputs)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handleLostPointerCapture = (e) => {
      const pointerId = e?.pointerId
      if (pointerId == null) return
      if (boostPointerIdRef.current === pointerId || joystickPointerIdRef.current === pointerId) {
        stopAllInputs()
      }
	    }
	    const joyEl = joystickElRef.current
	    const boostEl = boostBtnRef.current
	    joyEl?.addEventListener('lostpointercapture', handleLostPointerCapture)
	    boostEl?.addEventListener('lostpointercapture', handleLostPointerCapture)

	    return () => {
	      window.removeEventListener('pointerup', handlePointerEnd)
	      window.removeEventListener('pointercancel', handlePointerEnd)
	      window.removeEventListener('blur', stopAllInputs)
	      document.removeEventListener('visibilitychange', handleVisibilityChange)
	      joyEl?.removeEventListener('lostpointercapture', handleLostPointerCapture)
	      boostEl?.removeEventListener('lostpointercapture', handleLostPointerCapture)
	    }
	  }, [setBoosting]);

  useEffect(() => {
    if (status !== 'running') {
      stopAllInputs()
    }
  }, [status])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Enter' && (status === 'idle' || status === 'crashed')) start(walletCtx)
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
  }, [status, start, reset, crash, setBoosting, walletCtx])

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
	            <div
                ref={joystickElRef}
                {...bind()}
                onContextMenu={(e) => e.preventDefault()}
                style={{
	              width: '100%', height: '100%', borderRadius: '50%',
	              background: 'radial-gradient(circle, rgba(0, 246, 255, 0.2), transparent)',
	              border: '2px solid rgba(0, 246, 255, 0.4)', position: 'relative',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
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
                ref={boostBtnRef}
                onContextMenu={(e) => e.preventDefault()}
	              onPointerDown={(e) => {
                  boostPointerIdRef.current = e.pointerId
                  try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
                  setBoosting(true)
                }}
	              onPointerUp={(e) => {
                  if (boostPointerIdRef.current === e.pointerId) boostPointerIdRef.current = null
                  try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
                  setBoosting(false)
                }}
	              onPointerCancel={(e) => {
                  if (boostPointerIdRef.current === e.pointerId) boostPointerIdRef.current = null
                  try { e.currentTarget.releasePointerCapture(e.pointerId) } catch {}
                  setBoosting(false)
                }}
                onLostPointerCapture={() => {
                  boostPointerIdRef.current = null
                  setBoosting(false)
                }}
	              onPointerLeave={() => {
                  // If pointer capture failed for any reason, leaving should still stop boosting.
                  boostPointerIdRef.current = null
                  setBoosting(false)
                }}
	              style={{
	                width: '100px', height: '100px', borderRadius: '50%',
	                border: '2px solid #ff4444', background: 'rgba(255, 68, 68, 0.1)',
	                color: '#ff4444', fontWeight: 'bold', fontFamily: 'monospace',
	                display: 'flex', alignItems: 'center', justifyContent: 'center',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
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
