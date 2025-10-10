import React from 'react'
import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../../stores/gameStore'

// Arcade: 3x3 lanes (top/middle/bottom x left/center/right)
function PlayerShip({ laneImpulseX = 0, laneImpulseY = 0, active = true }) {
  const shipRef = useRef()
  const bankAngle = Math.PI / 6
  const [keys, setKeys] = useState({ left: false, right: false, up: false, down: false })
  const setShipPos = useGameStore((s) => s.setShipPos)
  const status = useGameStore((s) => s.status)
  const { camera, viewport } = useThree()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') setKeys(k => ({ ...k, left: true }))
      if (e.code === 'KeyD' || e.code === 'ArrowRight') setKeys(k => ({ ...k, right: true }))
      if (e.code === 'KeyW' || e.code === 'ArrowUp') setKeys(k => ({ ...k, up: true }))
      if (e.code === 'KeyS' || e.code === 'ArrowDown') setKeys(k => ({ ...k, down: true }))
    }
    const handleKeyUp = (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') setKeys(k => ({ ...k, left: false }))
      if (e.code === 'KeyD' || e.code === 'ArrowRight') setKeys(k => ({ ...k, right: false }))
      if (e.code === 'KeyW' || e.code === 'ArrowUp') setKeys(k => ({ ...k, up: false }))
      if (e.code === 'KeyS' || e.code === 'ArrowDown') setKeys(k => ({ ...k, down: false }))
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const posRef = useRef({ x: 0, y: 0, z: 0 })
  const targetXRef = useRef(0)
  const targetYRef = useRef(0)
  const laneIndexXRef = useRef(1) // 0..2
  const laneIndexYRef = useRef(1) // 0..2
  const lanesX = [-10, 0, 10]
  const lanesY = [8, 0, -8]

  // apply keyboard lane changes
  useEffect(() => {
    if (keys.left) laneIndexXRef.current = Math.max(0, laneIndexXRef.current - 1)
    if (keys.right) laneIndexXRef.current = Math.min(lanesX.length - 1, laneIndexXRef.current + 1)
  }, [keys.left, keys.right])
  useEffect(() => {
    if (keys.up) laneIndexYRef.current = Math.max(0, laneIndexYRef.current - 1)
    if (keys.down) laneIndexYRef.current = Math.min(lanesY.length - 1, laneIndexYRef.current + 1)
  }, [keys.up, keys.down])

  // apply swipe lane impulse
  useEffect(() => {
    if (!laneImpulseX) return
    if (laneImpulseX < 0) laneIndexXRef.current = Math.max(0, laneIndexXRef.current - 1)
    if (laneImpulseX > 0) laneIndexXRef.current = Math.min(lanesX.length - 1, laneIndexXRef.current + 1)
  }, [laneImpulseX])
  useEffect(() => {
    if (!laneImpulseY) return
    if (laneImpulseY < 0) laneIndexYRef.current = Math.min(lanesY.length - 1, laneIndexYRef.current + 1) // swipe down -> positive y downwards in screen, but lanesY index increases downward
    if (laneImpulseY > 0) laneIndexYRef.current = Math.max(0, laneIndexYRef.current - 1)
  }, [laneImpulseY])

  useFrame((state, delta) => {
    if (!shipRef.current) return
    if (!active || status !== 'running') return

    // Compute dynamic viewport bounds at ship depth
    const vp = viewport.getCurrentViewport(camera, shipRef.current.position)
    const boundX = (vp.width * 0.5) - 1.2 // margin so ship never clips
    const boundY = (vp.height * 0.5) - 1.2

    // Update target lane positions and smooth toward them
    targetXRef.current = Math.min(boundX, Math.max(-boundX, lanesX[laneIndexXRef.current]))
    targetYRef.current = Math.min(boundY, Math.max(-boundY, lanesY[laneIndexYRef.current]))
    const lerp = (a, b, t) => a + (b - a) * t
    posRef.current.x = lerp(posRef.current.x, targetXRef.current, Math.min(1, 10 * delta))
    posRef.current.y = lerp(posRef.current.y, targetYRef.current, Math.min(1, 10 * delta))

    shipRef.current.position.set(posRef.current.x, posRef.current.y, 0)

    // expressive banking based on movement toward target lane
    const dx = targetXRef.current - posRef.current.x
    const dy = targetYRef.current - posRef.current.y
    shipRef.current.rotation.z = -dx * 0.08
    shipRef.current.rotation.x = dy * 0.06
    shipRef.current.rotation.y = -dx * 0.04

    // publish for camera & collisions
    setShipPos({ ...posRef.current })
  })

  return (
    <group ref={shipRef}>
      {/* Lane highlight ring */}
      <mesh rotation={[0,0,0]} position={[0,0,0]}>
        <ringGeometry args={[1.2, 1.8, 24]} />
        <meshBasicMaterial color="#5ec8ff" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      {/* Fuselage */}
      <mesh>
        <cylinderGeometry args={[0.4, 0.6, 2, 12]} />
        <meshStandardMaterial color="#9ec1ff" metalness={0.3} roughness={0.2} emissive="#0af" emissiveIntensity={0.2} />
      </mesh>
      {/* Wings */}
      <mesh position={[1.2, 0, 0]}>
        <boxGeometry args={[2.2, 0.15, 0.8]} />
        <meshStandardMaterial color="#aaf" metalness={0.2} roughness={0.3} />
      </mesh>
      <mesh position={[-1.2, 0, 0]}>
        <boxGeometry args={[2.2, 0.15, 0.8]} />
        <meshStandardMaterial color="#aaf" metalness={0.2} roughness={0.3} />
      </mesh>
      {/* Engine glow */}
      <mesh position={[0, 0, -1.1]}
            scale={[1, 1, 1.6]}
            rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.1, 0.5, 12]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff7a00" emissiveIntensity={0.9} />
      </mesh>
    </group>
  )
}

export default PlayerShip
