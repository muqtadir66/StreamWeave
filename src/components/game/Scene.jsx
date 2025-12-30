import React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'

import Lights from './Lights'
import PlayerShip from './PlayerShip'
import ShipExplosion from './ShipExplosion' 
import WorldElements from './WorldElements'
import CameraRig from './CameraRig'
import MainMenu from './MainMenu'
import BoostStreakHUD from './BoostStreakHUD'
import BackgroundMusic from './BackgroundMusic'
import { useGameStore } from '../../stores/gameStore'
import { useWallet } from '@solana/wallet-adapter-react';
import { primeCrashSfx, unlockAudio } from '../../utils/sfx'

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
  const mobileSteerRef = useRef({ x: 0, y: 0 })
  const steerUiRafRef = useRef(null)
  const joystickPointerIdRef = useRef(null)
  const joystickOriginRef = useRef(null) 
  const boostPointerIdRef = useRef(null)
  const joystickTouchIdRef = useRef(null)
  const boostTouchIdRef = useRef(null)
  const lastTouchIdsRef = useRef(new Set())
  const debugEventsRef = useRef({
    last: null,
    joy: null,
    boost: null,
    updatedAt: 0,
  })
  const debugUiRafRef = useRef(null)

  const [isIOS] = useState(() => {
    const ua = globalThis?.navigator?.userAgent || ''
    const isiPhoneIpadIpod = /iPad|iPhone|iPod/.test(ua)
    const isiPadOS = /Mac/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document
    return isiPhoneIpadIpod || isiPadOS
  })
  const debugInput = useMemo(() => {
    try {
      return new URLSearchParams(globalThis?.location?.search || '').has('debugInput')
    } catch {
      return false
    }
  }, [])
  const [debugState, setDebugState] = useState(null)
  const joystickElRef = useRef(null)
  const boostBtnRef = useRef(null)
  const walletCtx = useWallet();
  const setBoosting = useGameStore((s) => s.setBoosting);
  const status = useGameStore((s) => s.status)
  const start = useGameStore((s) => s.start)
  const reset = useGameStore((s) => s.reset)
  const crash = useGameStore((s) => s.crash)
  const runId = useGameStore((s) => s.runId)
  const shipPos = useGameStore((s) => s.shipPos)
  
  // Economy & Sound Stats
  const bankedMultiplier = useGameStore((s) => s.bankedMultiplier)
  const wager = useGameStore((s) => s.wager)
  const soundEnabled = useGameStore((s) => s.soundEnabled) 
  const toggleSound = useGameStore((s) => s.toggleSound)   
  
  const projectedWin = Math.floor(wager * bankedMultiplier);
  const isProfit = bankedMultiplier >= 1.0;

  const JOY_MAX_DIST = 50
  const JOY_DEADZONE_PX = 4

  const scheduleDebugUpdate = () => {
    if (!debugInput) return
    if (debugUiRafRef.current != null) return
    debugUiRafRef.current = requestAnimationFrame(() => {
      debugUiRafRef.current = null
      setDebugState({
        ts: Date.now(),
        status,
        isIOS,
        steer: { ...mobileSteerRef.current },
        joyPointerId: joystickPointerIdRef.current,
        boostPointerId: boostPointerIdRef.current,
        joyTouchId: joystickTouchIdRef.current,
        boostTouchId: boostTouchIdRef.current,
        touchCount: lastTouchIdsRef.current.size,
        last: debugEventsRef.current.last,
        lastJoy: debugEventsRef.current.joy,
        lastBoost: debugEventsRef.current.boost,
      })
    })
  }

  const noteDebug = (kind, label) => {
    if (!debugInput) return
    const now = Date.now()
    debugEventsRef.current.updatedAt = now
    debugEventsRef.current.last = `${kind}:${label}@${now}`
    if (kind === 'joy') debugEventsRef.current.joy = `${label}@${now}`
    if (kind === 'boost') debugEventsRef.current.boost = `${label}@${now}`
    scheduleDebugUpdate()
  }

  const setSteer = (next) => {
    mobileSteerRef.current = next

    // iOS/Phantom WebView: avoid driving gameplay via React re-renders.
    // Throttle UI knob updates to rAF; physics reads from the ref.
    if (isIOS) {
      if (steerUiRafRef.current == null) {
        steerUiRafRef.current = requestAnimationFrame(() => {
          steerUiRafRef.current = null
          setMobileSteer(mobileSteerRef.current)
        })
      }
      return
    }

    // Non-iOS: keep existing behavior (state updates on move).
    setMobileSteer(next)
  }

  const updateSteerFromPointerEvent = (e) => {
    const origin = joystickOriginRef.current
    if (!origin) return
    let dx = (e.clientX ?? 0) - origin.x
    let dy = (e.clientY ?? 0) - origin.y
    const dist = Math.hypot(dx, dy)
    const max = JOY_MAX_DIST

    if (dist <= JOY_DEADZONE_PX) {
      setSteer({ x: 0, y: 0 })
      return
    }

    if (dist > max && dist > 0) {
      dx = (dx / dist) * max
      dy = (dy / dist) * max
    }
    setSteer({ x: dx / max, y: -(dy / max) })
  }

  const onJoystickPointerDown = (e) => {
    if (isIOS) return
    if (joystickPointerIdRef.current != null) return
    joystickPointerIdRef.current = e.pointerId
    joystickOriginRef.current = { x: e.clientX ?? 0, y: e.clientY ?? 0 }
    updateSteerFromPointerEvent(e)
  }

  const onJoystickPointerMove = (e) => {
    if (isIOS) return
    if (joystickPointerIdRef.current !== e.pointerId) return
    updateSteerFromPointerEvent(e)
  }

  const onJoystickPointerUp = (e) => {
    if (isIOS) return
    if (joystickPointerIdRef.current !== e.pointerId) return
    joystickPointerIdRef.current = null
    joystickOriginRef.current = null
    setSteer({ x: 0, y: 0 })
  }

  const onJoystickPointerCancel = (e) => {
    if (isIOS) return
    if (joystickPointerIdRef.current !== e.pointerId) return
    joystickPointerIdRef.current = null
    joystickOriginRef.current = null
    setSteer({ x: 0, y: 0 })
  }

  const stopAllInputs = () => {
    const boostPid = boostPointerIdRef.current

    if (boostPid != null && boostBtnRef.current) {
      try { boostBtnRef.current.releasePointerCapture(boostPid) } catch {}
    }

    boostPointerIdRef.current = null
    joystickPointerIdRef.current = null
    joystickOriginRef.current = null
    boostTouchIdRef.current = null
    joystickTouchIdRef.current = null
    setBoosting(false)
    setSteer({ x: 0, y: 0 })
    noteDebug('all', 'stopAllInputs')
  }

  useEffect(() => {
    const syncTouchIdsFromEvent = (e) => {
      const ids = new Set()
      try {
        const touches = e?.touches
        if (touches && typeof touches.length === 'number') {
          for (let i = 0; i < touches.length; i++) ids.add(touches[i].identifier)
        }
      } catch {}
      lastTouchIdsRef.current = ids
      if (debugInput) scheduleDebugUpdate()

      // Failsafe: if our tracked ids are not present in the current touch set, clear them.
      if (boostTouchIdRef.current != null && !ids.has(boostTouchIdRef.current)) {
        boostTouchIdRef.current = null
        setBoosting(false)
        noteDebug('boost', 'failsafeClear')
      }
      if (joystickTouchIdRef.current != null && !ids.has(joystickTouchIdRef.current)) {
        joystickTouchIdRef.current = null
        joystickOriginRef.current = null
        setSteer({ x: 0, y: 0 })
        noteDebug('joy', 'failsafeClear')
      }

      // Failsafe: no touches => reset everything.
      if (ids.size === 0) stopAllInputs()
    }

    const findTouch = (touchList, identifier) => {
      if (!touchList || identifier == null) return null
      for (let i = 0; i < touchList.length; i++) {
        if (touchList[i].identifier === identifier) return touchList[i]
      }
      return null
    }

    const updateSteerFromTouch = (t) => {
      const origin = joystickOriginRef.current
      if (!origin || !t) return
      let dx = (t.clientX ?? 0) - origin.x
      let dy = (t.clientY ?? 0) - origin.y
      const dist = Math.hypot(dx, dy)
      const max = JOY_MAX_DIST

      if (dist <= JOY_DEADZONE_PX) {
        setSteer({ x: 0, y: 0 })
        return
      }
      if (dist > max && dist > 0) {
        dx = (dx / dist) * max
        dy = (dy / dist) * max
      }
      setSteer({ x: dx / max, y: -(dy / max) })
    }

    const onJoyTouchStart = (e) => {
      if (!isIOS) return
      if (status !== 'running') return
      syncTouchIdsFromEvent(e)
      if (joystickTouchIdRef.current != null) return
      const t = e?.changedTouches?.[0]
      if (!t) return
      void unlockAudio()
      void primeCrashSfx()
      joystickTouchIdRef.current = t.identifier
      joystickOriginRef.current = { x: t.clientX ?? 0, y: t.clientY ?? 0 }
      updateSteerFromTouch(t)
      if (e.cancelable) e.preventDefault()
      noteDebug('joy', 'touchstart')
    }

    const onJoyTouchMove = (e) => {
      if (!isIOS) return
      if (status !== 'running') return
      syncTouchIdsFromEvent(e)
      const id = joystickTouchIdRef.current
      if (id == null) return
      const t = findTouch(e.touches, id) || findTouch(e.changedTouches, id)
      if (!t) return
      updateSteerFromTouch(t)
      if (e.cancelable) e.preventDefault()
      noteDebug('joy', 'touchmove')
    }

    const onJoyTouchEnd = (e) => {
      if (!isIOS) return
      syncTouchIdsFromEvent(e)
      const id = joystickTouchIdRef.current
      if (id == null) return
      const ended = findTouch(e.changedTouches, id)
      if (!ended) return
      joystickTouchIdRef.current = null
      joystickOriginRef.current = null
      setSteer({ x: 0, y: 0 })
      if (e.cancelable) e.preventDefault()
      noteDebug('joy', 'touchend')
    }

    const onBoostTouchStart = (e) => {
      if (!isIOS) return
      if (status !== 'running') return
      syncTouchIdsFromEvent(e)
      if (boostTouchIdRef.current != null) return
      const t = e?.changedTouches?.[0]
      if (!t) return
      void unlockAudio()
      void primeCrashSfx()
      boostTouchIdRef.current = t.identifier
      setBoosting(true)
      if (e.cancelable) e.preventDefault()
      noteDebug('boost', 'touchstart')
    }

    const onBoostTouchEnd = (e) => {
      if (!isIOS) return
      syncTouchIdsFromEvent(e)
      const id = boostTouchIdRef.current
      if (id == null) return
      const ended = findTouch(e.changedTouches, id)
      if (!ended) return
      boostTouchIdRef.current = null
      setBoosting(false)
      if (e.cancelable) e.preventDefault()
      noteDebug('boost', 'touchend')
    }

    const handlePointerEnd = (e) => {
      if (isIOS) return
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
        joystickOriginRef.current = null
        setSteer({ x: 0, y: 0 })
      }
    }

    // Global move tracking for the joystick pointer. This avoids relying on element pointer capture,
    // which can be flaky on iOS (especially during multi-touch with boost).
    const handlePointerMove = (e) => {
      if (isIOS) return
      if (joystickPointerIdRef.current !== e.pointerId) return
      updateSteerFromPointerEvent(e)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) stopAllInputs()
    }

    // Non-iOS: pointer-event model
    window.addEventListener('pointerup', handlePointerEnd, { passive: true })
    window.addEventListener('pointercancel', handlePointerEnd, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true, capture: true })

    // iOS: touch-event model (element-scoped, plus global failsafes)
    const joyEl = joystickElRef.current
    const boostEl = boostBtnRef.current
    if (isIOS) {
      joyEl?.addEventListener('touchstart', onJoyTouchStart, { passive: false })
      joyEl?.addEventListener('touchmove', onJoyTouchMove, { passive: false })
      joyEl?.addEventListener('touchend', onJoyTouchEnd, { passive: false })
      joyEl?.addEventListener('touchcancel', onJoyTouchEnd, { passive: false })

      boostEl?.addEventListener('touchstart', onBoostTouchStart, { passive: false })
      boostEl?.addEventListener('touchend', onBoostTouchEnd, { passive: false })
      boostEl?.addEventListener('touchcancel', onBoostTouchEnd, { passive: false })

      // Global capture to keep last touch snapshot fresh and ensure cleanup
      const onAnyTouch = (e) => {
        syncTouchIdsFromEvent(e)
        if (status === 'running' && (joystickTouchIdRef.current != null || boostTouchIdRef.current != null)) {
          if (e.cancelable) e.preventDefault()
        }
      }
      document.addEventListener('touchstart', onAnyTouch, { capture: true, passive: false })
      document.addEventListener('touchmove', onAnyTouch, { capture: true, passive: false })
      document.addEventListener('touchend', onAnyTouch, { capture: true, passive: false })
      document.addEventListener('touchcancel', onAnyTouch, { capture: true, passive: false })

      // Cleanup for global touch listeners
      const cleanupTouches = () => {
        document.removeEventListener('touchstart', onAnyTouch, { capture: true })
        document.removeEventListener('touchmove', onAnyTouch, { capture: true })
        document.removeEventListener('touchend', onAnyTouch, { capture: true })
        document.removeEventListener('touchcancel', onAnyTouch, { capture: true })
      }

      window.addEventListener('blur', stopAllInputs)
      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        cleanupTouches()
        joyEl?.removeEventListener('touchstart', onJoyTouchStart)
        joyEl?.removeEventListener('touchmove', onJoyTouchMove)
        joyEl?.removeEventListener('touchend', onJoyTouchEnd)
        joyEl?.removeEventListener('touchcancel', onJoyTouchEnd)
        boostEl?.removeEventListener('touchstart', onBoostTouchStart)
        boostEl?.removeEventListener('touchend', onBoostTouchEnd)
        boostEl?.removeEventListener('touchcancel', onBoostTouchEnd)

        window.removeEventListener('pointerup', handlePointerEnd)
        window.removeEventListener('pointercancel', handlePointerEnd)
        window.removeEventListener('pointermove', handlePointerMove, { capture: true })
        window.removeEventListener('blur', stopAllInputs)
        document.removeEventListener('visibilitychange', handleVisibilityChange)

        if (steerUiRafRef.current != null) {
          cancelAnimationFrame(steerUiRafRef.current)
          steerUiRafRef.current = null
        }
        if (debugUiRafRef.current != null) {
          cancelAnimationFrame(debugUiRafRef.current)
          debugUiRafRef.current = null
        }
      }
    }

    window.addEventListener('blur', stopAllInputs)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
      window.removeEventListener('pointermove', handlePointerMove, { capture: true })
      window.removeEventListener('blur', stopAllInputs)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (steerUiRafRef.current != null) {
        cancelAnimationFrame(steerUiRafRef.current)
        steerUiRafRef.current = null
      }
      if (debugUiRafRef.current != null) {
        cancelAnimationFrame(debugUiRafRef.current)
        debugUiRafRef.current = null
      }
    }
  }, [setBoosting, isIOS, status, debugInput]);

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
      if (e.code === 'KeyM') toggleSound() 
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
  }, [status, start, reset, crash, setBoosting, walletCtx, toggleSound])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <BackgroundMusic />

      <Canvas
        camera={{ position: [0, 0, 8], fov: 68 }}
        style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #374151 50%, #111827 100%)' }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={["#6b7280", 40, 180]} />
        <Lights />
        <WorldElements key={`world-${runId}`} />
        
        {/* [MODIFIED] Render PlayerShip during 'collided' phase too */}
        {status === 'crashed' ? (
          <ShipExplosion position={shipPos} />
        ) : (
          <PlayerShip
            key={`ship-${runId}`}
            active={status === 'running'}
            mobileSteer={mobileSteer}
            mobileSteerRef={isIOS ? mobileSteerRef : undefined}
          />
        )}

        <CameraRig enabled={true} />
        <GameLoop />
      </Canvas>

      <BoostStreakHUD />

      {/* Top Info Bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', padding: '15px 25px',
        background: 'linear-gradient(180deg, rgba(0, 10, 20, 0.9) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(0, 246, 255, 0.2)',
        pointerEvents: 'none'
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', color: '#00f6ff', fontFamily: 'monospace', pointerEvents: 'auto' }}>
          <div style={{
            padding: '4px 12px', borderRadius: '15px',
            background: status === 'running' ? 'rgba(0, 246, 255, 0.2)' : 'rgba(255, 50, 50, 0.2)',
            border: `1px solid ${status === 'running' ? '#00f6ff' : '#ff3333'}`
          }}>
            {status === 'running' ? '● LIVE' : '● STOP'}
          </div>
          
          <button 
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.blur(); 
              toggleSound();
            }}
            onKeyDown={(e) => e.preventDefault()}
            style={{
                background: 'rgba(0, 246, 255, 0.1)', 
                border: '1px solid rgba(0, 246, 255, 0.3)',
                color: soundEnabled ? '#00ff88' : '#888',
                cursor: 'pointer', padding: '4px 10px', borderRadius: '4px',
                fontFamily: 'monospace', fontSize: '0.9rem',
                minWidth: '80px', textAlign: 'center',
                pointerEvents: 'auto',
                outline: 'none'
            }}
          >
            {soundEnabled ? '🔊 ON' : '🔇 OFF'}
          </button>

          <div style={{ color: isProfit ? '#00ff88' : '#fff' }}>
            MULT: {bankedMultiplier.toFixed(1)}x
          </div>
        </div>

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

      {debugInput && (
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 80,
            zIndex: 5000,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,246,255,0.35)',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: 12,
            padding: 10,
            borderRadius: 6,
            pointerEvents: 'none',
            maxWidth: 320,
          }}
        >
          <div style={{ color: '#00f6ff', marginBottom: 6 }}>INPUT DEBUG</div>
          <div>status: {debugState?.status || status}</div>
          <div>isIOS: {String(debugState?.isIOS ?? isIOS)}</div>
          <div>touchCount: {debugState?.touchCount ?? lastTouchIdsRef.current.size}</div>
          <div>joyTouchId: {String(debugState?.joyTouchId ?? joystickTouchIdRef.current)}</div>
          <div>boostTouchId: {String(debugState?.boostTouchId ?? boostTouchIdRef.current)}</div>
          <div>joyPointerId: {String(debugState?.joyPointerId ?? joystickPointerIdRef.current)}</div>
          <div>boostPointerId: {String(debugState?.boostPointerId ?? boostPointerIdRef.current)}</div>
          <div>steer: {JSON.stringify(debugState?.steer ?? mobileSteerRef.current)}</div>
          <div style={{ marginTop: 6, opacity: 0.85 }}>last: {debugState?.last || debugEventsRef.current.last}</div>
          <div style={{ opacity: 0.85 }}>joy: {debugState?.lastJoy || debugEventsRef.current.joy}</div>
          <div style={{ opacity: 0.85 }}>boost: {debugState?.lastBoost || debugEventsRef.current.boost}</div>
        </div>
      )}
      
	      {/* Controls */}
	      <div style={{ display: status === 'running' ? 'block' : 'none' }}>
	          <div style={{
	            position: 'absolute',
              bottom: 'calc(env(safe-area-inset-bottom) + 110px)',
              left: 'calc(env(safe-area-inset-left) + 24px)',
	            width: '150px', height: '150px', zIndex: 10, pointerEvents: 'auto'
	          }}>
	            <div
	              ref={joystickElRef}
	                onPointerDown={isIOS ? undefined : onJoystickPointerDown}
	                onPointerMove={isIOS ? undefined : onJoystickPointerMove}
	                onPointerUp={isIOS ? undefined : onJoystickPointerUp}
	                onPointerCancel={isIOS ? undefined : onJoystickPointerCancel}
	                onContextMenu={(e) => e.preventDefault()}
	                style={{
			              width: '100%', height: '100%', borderRadius: '50%',
			              background: 'radial-gradient(circle, rgba(0, 246, 255, 0.2), transparent)',
			              border: '2px solid rgba(0, 246, 255, 0.4)', position: 'relative',
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitUserDrag: 'none',
                  WebkitTextSizeAdjust: 'none',
		          }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', width: '20px', height: '20px',
                background: '#00f6ff', borderRadius: '50%',
                transform: `translate(-50%, -50%) translate(${mobileSteer.x * 40}px, ${-mobileSteer.y * 40}px)`
              }} />
            </div>
		          </div>

		          <div style={{
		            position: 'absolute',
                bottom: 'calc(env(safe-area-inset-bottom) + 110px)',
                right: 'calc(env(safe-area-inset-right) + 24px)',
                zIndex: 10,
                pointerEvents: 'auto',
		          }}>
	            <button
	              ref={boostBtnRef}
	              onContextMenu={(e) => e.preventDefault()}
	              onPointerDown={
                  isIOS
                    ? undefined
                    : (e) => {
                        boostPointerIdRef.current = e.pointerId
                        setBoosting(true)
                        noteDebug('boost', 'pointerdown')
                      }
                }
	              onPointerUp={
                  isIOS
                    ? undefined
                    : (e) => {
                        if (boostPointerIdRef.current === e.pointerId) {
                          boostPointerIdRef.current = null
                          setBoosting(false)
                          noteDebug('boost', 'pointerup')
                        }
                      }
                }
	              onPointerCancel={
                  isIOS
                    ? undefined
                    : (e) => {
                        if (boostPointerIdRef.current === e.pointerId) {
                          boostPointerIdRef.current = null
                          setBoosting(false)
                          noteDebug('boost', 'pointercancel')
                        }
                      }
                }
	              style={{
	                width: '100px', height: '100px', borderRadius: '50%',
	                border: '2px solid #ff4444', background: 'rgba(255, 68, 68, 0.1)',
	                color: '#ff4444', fontWeight: 'bold', fontFamily: 'monospace',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent',
                WebkitUserDrag: 'none',
                WebkitTextSizeAdjust: 'none',
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
