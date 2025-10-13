import React from 'react'
import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../../stores/gameStore'
import * as THREE from 'three';

// Optimized geometry settings for the ship
const wingShape = new THREE.Shape();
wingShape.moveTo(0, 0);
wingShape.lineTo(12, 0);
wingShape.lineTo(8, -12);
wingShape.lineTo(0, -10);
wingShape.closePath();
const extrudeSettings = { depth: 0.7, bevelEnabled: false };

function PlayerShip({ active = true, mobileSteer = { x: 0, y: 0 } }) {
  const shipRef = useRef()
  const [keys, setKeys] = useState({ left: false, right: false, up: false, down: false })
  const setShipPos = useGameStore((s) => s.setShipPos)
  const status = useGameStore((s) => s.status)
  const { camera, viewport } = useThree()

  // Ship physics state
  const velocity = useMemo(() => new THREE.Vector3(), [])
  const shipPos = useMemo(() => new THREE.Vector3(), [])

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

  useFrame((state, delta) => {
    if (!shipRef.current) return
    if (!active || status !== 'running') {
        velocity.set(0,0,0);
        return
    }
    
    // Define movement constants
    const acceleration = 120.0;
    const damping = -4.0;

    // Reset acceleration
    const accel = new THREE.Vector3(0,0,0);
    
    // Keyboard controls
    if (keys.left) accel.x -= 1;
    if (keys.right) accel.x += 1;
    if (keys.up) accel.y += 1;
    if (keys.down) accel.y -= 1;
    
    // Mobile joystick controls
    accel.x += mobileSteer.x;
    accel.y += mobileSteer.y;

    // Apply acceleration
    velocity.addScaledVector(accel.normalize(), acceleration * delta);
    
    // Apply damping (drag)
    const dampingForce = velocity.clone().multiplyScalar(damping * delta)
    velocity.add(dampingForce)

    // Update position
    shipPos.addScaledVector(velocity, delta)

    // Define the playable field boundaries
    const boundX = 15 - 2; // Half of the fixed 30-unit spawnVolume.x, with a margin
    const vp = viewport.getCurrentViewport(camera, shipRef.current.position);
    const boundY = (vp.height * 0.5) - 2; // Vertical bound is dynamic for different aspect ratios
    
    shipPos.x = Math.max(-boundX, Math.min(boundX, shipPos.x));
    shipPos.y = Math.max(-boundY, Math.min(boundY, shipPos.y));
    
    shipRef.current.position.copy(shipPos);

    // Expressive banking based on velocity
    shipRef.current.rotation.z = -velocity.x * 0.05;
    shipRef.current.rotation.x = velocity.y * 0.03;
    shipRef.current.rotation.y = -velocity.x * 0.02;

    // Publish for camera & collisions
    setShipPos(shipPos)
  })

  return (
    <group ref={shipRef}>
      <group scale={0.15} rotation={[0, Math.PI, 0]}>
        {/* Main Hull */}
        <mesh>
          <boxGeometry args={[14, 4, 20]} />
          <meshStandardMaterial color={0xd1d5db} metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Cockpit */}
        <mesh position={[0, 2.5, 5]}>
          <boxGeometry args={[5, 1.5, 7]} />
          <meshStandardMaterial color={0xd1d5db} metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Canopy */}
        <mesh position={[0, 3.3, 5.5]} rotation={[-Math.PI / 2.2, 0, 0]}>
          <planeGeometry args={[3.5, 5]} />
          <meshStandardMaterial color={0x111827} roughness={0.1} metalness={0.8} />
        </mesh>
        {/* Wing base structure */}
        <mesh position={[0, -0.5, -4]}>
          <boxGeometry args={[22, 2, 8]} />
          <meshStandardMaterial color={0xd1d5db} metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Wings */}
        <mesh position={[-10, 0.2, 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <extrudeGeometry args={[wingShape, extrudeSettings]} />
          <meshStandardMaterial color={0xd1d5db} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[10, 0.2, 2]} rotation={[-Math.PI / 2, Math.PI, 0]}>
          <extrudeGeometry args={[wingShape, extrudeSettings]} />
          <meshStandardMaterial color={0xd1d5db} metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Dark panels on wings */}
        <mesh position={[-10, 0.95, 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.9, 0.9, 0.9]}>
          <shapeGeometry args={[wingShape]} />
          <meshStandardMaterial color={0x1f2937} metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh position={[10, 0.95, 2]} rotation={[-Math.PI / 2, Math.PI, 0]} scale={[0.9, 0.9, 0.9]}>
          <shapeGeometry args={[wingShape]} />
          <meshStandardMaterial color={0x1f2937} metalness={0.5} roughness={0.6} />
        </mesh>
        {/* Engine Block */}
        <mesh position={[0, 0, -11]}>
          <boxGeometry args={[9, 6, 5]} />
          <meshStandardMaterial color={0x1f2937} metalness={0.5} roughness={0.6} />
        </mesh>
        {/* Engines */}
        {
          [
            { x: -2.5, y: 1.5, z: -13 }, { x: 2.5, y: 1.5, z: -13 },
            { x: -2.5, y: -1.5, z: -13 }, { x: 2.5, y: -1.5, z: -13 }
          ].map((pos, i) => (
            <group key={i}>
              <mesh position={[pos.x, pos.y, pos.z + 1]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[1, 1.2, 2, 12]} />
                <meshStandardMaterial color={0xd1d5db} metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh position={[pos.x, pos.y, pos.z - 0.01]}>
                <circleGeometry args={[0.9, 12]} />
                <meshBasicMaterial color={0x56a1ff} toneMapped={false} />
              </mesh>
            </group>
          ))
        }
        {/* Top Detail */}
        <mesh position={[0, 2.2, -1.5]}>
          <boxGeometry args={[3, 0.5, 3]} />
          <meshStandardMaterial color={0x1f2937} metalness={0.5} roughness={0.6} />
        </mesh>
        {/* Accent Stripes */}
        <mesh position={[2.6, 2.5, 7.5]} rotation={[0, 0.1, 0]}>
          <boxGeometry args={[0.2, 0.2, 5]} />
          <meshStandardMaterial color={0xf9a825} metalness={0.8} roughness={0.3} emissive={0xf9a825} emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[-2.6, 2.5, 7.5]} rotation={[0, -0.1, 0]}>
          <boxGeometry args={[0.2, 0.2, 5]} />
          <meshStandardMaterial color={0xf9a825} metalness={0.8} roughness={0.3} emissive={0xf9a825} emissiveIntensity={0.2} />
        </mesh>
      </group>
    </group>
  )
}

export default PlayerShip