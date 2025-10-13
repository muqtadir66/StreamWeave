import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../../stores/gameStore'
import * as THREE from 'three'

function CameraRig({ enabled = true }) {
  const { camera } = useThree()
  const shipPos = useGameStore((s) => s.shipPos)
  const speed = useGameStore((s) => s.speed)
  const shake = useGameStore((s) => s.shake)
  const setShake = useGameStore((s) => s.setShake)
  const cameraPos = useRef(new THREE.Vector3(0, 5, 18))

  useFrame((_, delta) => {
    if (!enabled) return

    // Tighter look-ahead
    const lookAtPos = new THREE.Vector3(shipPos.x * 0.2, shipPos.y * 0.2, -50);

    // Closer, more responsive camera position
    const desiredPos = new THREE.Vector3(shipPos.x * 0.3, shipPos.y + 4, 16 + Math.min(4, speed * 0.01));
    
    // Smooth camera following with faster interpolation
    const t = Math.min(1, 8 * delta);
    cameraPos.current.lerp(desiredPos, t);

    // Camera shake (decay)
    const nextShake = Math.max(0, shake - 2.8 * delta);
    if (nextShake !== shake) setShake(nextShake);
    const sx = (Math.random() - 0.5) * nextShake * 0.8;
    const sy = (Math.random() - 0.5) * nextShake * 0.8;

    camera.position.set(cameraPos.current.x + sx, cameraPos.current.y + sy, cameraPos.current.z);
    camera.lookAt(lookAtPos);
  })

  return null
}

export default CameraRig