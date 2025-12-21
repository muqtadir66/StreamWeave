import React from 'react'
import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../../stores/gameStore'
import * as THREE from 'three';

function PlayerShip({ active = true, mobileSteer = { x: 0, y: 0 } }) {
  const shipRef = useRef()
  const engineGlowL = useRef()
  const engineGlowR = useRef()
  const [keys, setKeys] = useState({ left: false, right: false, up: false, down: false })
  
  const setShipPos = useGameStore((s) => s.setShipPos)
  const status = useGameStore((s) => s.status)
  const isBoosting = useGameStore((s) => s.isBoosting)
  const bounceVelocity = useGameStore((s) => s.bounceVelocity)
  
  // Keep the hook to match original behavior exactly, even if unused in logic
  const { camera, viewport } = useThree() 

  const velocity = useMemo(() => new THREE.Vector3(), [])
  const shipPos = useMemo(() => new THREE.Vector3(), [])
  
  // Random spin for the collision tumble
  const tumbleSpin = useMemo(() => ({
    x: (Math.random() - 0.5) * 15,
    y: (Math.random() - 0.5) * 15,
    z: (Math.random() - 0.5) * 15
  }), []);

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
    
    // --- CASE 1: Normal Gameplay ---
    if (status === 'running') {
        if (!active) {
            velocity.set(0,0,0);
            return
        }

        const acceleration = 120.0;
        const damping = -4.0;
        const accel = new THREE.Vector3(0,0,0);
        
        if (keys.left) accel.x -= 1;
        if (keys.right) accel.x += 1;
        if (keys.up) accel.y += 1;
        if (keys.down) accel.y -= 1;
        
        accel.x += mobileSteer.x;
        accel.y += mobileSteer.y;

        if (accel.length() > 0) velocity.addScaledVector(accel.normalize(), acceleration * delta);
        const dampingForce = velocity.clone().multiplyScalar(damping * delta)
        velocity.add(dampingForce)
        shipPos.addScaledVector(velocity, delta)

        const boundX = 15 - 6; 
        const boundY = 17.5 - 2; 
        
        shipPos.x = Math.max(-boundX, Math.min(boundX, shipPos.x));
        shipPos.y = Math.max(-boundY, Math.min(boundY, shipPos.y));
        
        shipRef.current.position.copy(shipPos);

        shipRef.current.rotation.z = -velocity.x * 0.05;
        shipRef.current.rotation.x = velocity.y * 0.03;
        shipRef.current.rotation.y = -velocity.x * 0.02;

        // Engine Effects
        const targetScale = isBoosting ? 3 : 1;
        const targetIntensity = isBoosting ? 3.5 : 1.2;
        [engineGlowL, engineGlowR].forEach(ref => {
            if(ref.current) {
                ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
                ref.current.material.emissiveIntensity = THREE.MathUtils.lerp(ref.current.material.emissiveIntensity, targetIntensity, 0.1);
            }
        });

        setShipPos(shipPos)
    }
    
    // --- CASE 2: Collision Tumble ---
    else if (status === 'collided') {
        // Apply bounce velocity
        shipPos.x += bounceVelocity.x * delta
        shipPos.y += bounceVelocity.y * delta
        shipPos.z += bounceVelocity.z * delta
        
        // Apply position
        shipRef.current.position.copy(shipPos);
        
        // Apply violent rotation (tumble)
        shipRef.current.rotation.x += tumbleSpin.x * delta
        shipRef.current.rotation.y += tumbleSpin.y * delta
        shipRef.current.rotation.z += tumbleSpin.z * delta

        setShipPos(shipPos)
    }
    
    // --- CASE 3: Reset (Idle/Crashed) ---
    // [CRITICAL FIX]: Ensure velocity is wiped when not playing, preventing drift on restart
    else {
        velocity.set(0, 0, 0);
    }
  })

  return (
    <group ref={shipRef}>
      <group scale={0.15} rotation={[0, Math.PI, 0]}>
        <mesh>
          <boxGeometry args={[14, 4, 20]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 2.5, 5]}>
          <boxGeometry args={[5, 1.5, 7]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 3.3, 5.5]} rotation={[-Math.PI / 2.2, 0, 0]}>
          <planeGeometry args={[3.5, 5]} />
          <meshStandardMaterial color="#111827" roughness={0.1} metalness={0.8} />
        </mesh>
        <mesh ref={engineGlowL} position={[-2.5, 0, -11.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.8, 0.1, 2, 16]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff7a00" emissiveIntensity={1.2} />
        </mesh>
        <mesh ref={engineGlowR} position={[2.5, 0, -11.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.8, 0.1, 2, 16]} />
            <meshStandardMaterial color="#ffb347" emissive="#ff7a00" emissiveIntensity={1.2} />
        </mesh>
      </group>
    </group>
  )
}

export default PlayerShip