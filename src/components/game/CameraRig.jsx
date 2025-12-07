import React, { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../../stores/gameStore'
import * as THREE from 'three'

function CameraRig({ enabled = true }) {
  const { camera, size } = useThree() // Get screen size for responsive check
  const shipPos = useGameStore((s) => s.shipPos)
  const speed = useGameStore((s) => s.speed)
  const maxSpeed = useGameStore((s) => s.maxSpeed)
  const shake = useGameStore((s) => s.shake)
  const setShake = useGameStore((s) => s.setShake)
  const cameraPos = useRef(new THREE.Vector3(0, 5, 18))

  useFrame((_, delta) => {
    if (!enabled) return

    const lookAtPos = new THREE.Vector3(shipPos.x * 0.2, shipPos.y * 0.2, -50);
    
    // --- RESPONSIVE SETTINGS (TUNED) ---
    // Check if we are in portrait mode (Mobile)
    const isMobile = size.width < size.height;
    
    // Mobile: FOV 75 (was 85), Base Z 18.5 (was 22) -> Closer & tighter
    // Desktop: FOV 68, Base Z 16 (Unchanged)
    const targetFov = isMobile ? 75 : 68;
    const baseZ = isMobile ? 18.5 : 16; 

    // Dynamic Z-Pull based on speed
    const speedRatio = (speed / maxSpeed);
    const pullBack = speedRatio * 8; 
    const desiredZ = baseZ + pullBack;

    const desiredPos = new THREE.Vector3(shipPos.x * 0.3, shipPos.y + 4, desiredZ);
    
    const t = Math.min(1, 8 * delta);
    cameraPos.current.lerp(desiredPos, t);

    const nextShake = Math.max(0, shake - 2.8 * delta);
    if (nextShake !== shake) setShake(nextShake);
    const sx = (Math.random() - 0.5) * nextShake * 0.8;
    const sy = (Math.random() - 0.5) * nextShake * 0.8;

    // Apply Responsive FOV smoothly
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
    camera.updateProjectionMatrix();

    camera.position.set(cameraPos.current.x + sx, cameraPos.current.y + sy, cameraPos.current.z);
    camera.lookAt(lookAtPos);
  })

  return null
}

export default CameraRig