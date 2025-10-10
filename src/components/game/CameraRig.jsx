import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../../stores/gameStore'

function CameraRig({ enabled = true }) {
  const { camera } = useThree()
  const shipPos = useGameStore((s) => s.shipPos)
  const speed = useGameStore((s) => s.speed)
  const shake = useGameStore((s) => s.shake)
  const setShake = useGameStore((s) => s.setShake)
  const targetRef = useRef({ x: 0, y: 0, z: 8 })

  useFrame((_, delta) => {
    if (!enabled) return
    // Look ahead down the track so all lanes are visible
    const look = { x: shipPos.x * 0.1, y: shipPos.y * 0.1, z: -40 }
    // smooth camera following from above and back
    const desired = { x: shipPos.x * 0.15, y: shipPos.y + 12, z: 22 + Math.min(6, speed * 0.02) }
    const lerp = (a, b, t) => a + (b - a) * t
    const t = Math.min(1, 6 * delta)
    targetRef.current.x = lerp(targetRef.current.x, desired.x, t)
    targetRef.current.y = lerp(targetRef.current.y, desired.y, t)
    targetRef.current.z = lerp(targetRef.current.z, desired.z, t)

    // camera shake (decay)
    const nextShake = Math.max(0, shake - 2.5 * delta)
    if (nextShake !== shake) setShake(nextShake)
    const sx = (Math.random() - 0.5) * nextShake * 0.6
    const sy = (Math.random() - 0.5) * nextShake * 0.6

    camera.position.set(targetRef.current.x + sx, targetRef.current.y + sy, targetRef.current.z)
    camera.lookAt(look.x, look.y, look.z)
  })

  return null
}

export default CameraRig
