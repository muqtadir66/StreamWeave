import React from 'react'
import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGameStore } from '../../stores/gameStore'
import * as THREE from 'three';

const createAsteroidGeometry = () => {
    const geo = new THREE.IcosahedronGeometry(1.0, 0); 
    const vertices = geo.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i], y = vertices[i+1], z = vertices[i+2];
        const noise = 0.1 + Math.random() * 0.2;
        const vec = new THREE.Vector3(x, y, z).normalize().multiplyScalar(noise);
        vertices[i] += vec.x;
        vertices[i+1] += vec.y;
        vertices[i+2] += vec.z;
    }
    geo.computeVertexNormals();
    return geo;
}

function PlayerShip({ active = true, mobileSteer = { x: 0, y: 0 } }) {
  const shipRef = useRef()
  const engineGlowL = useRef()
  const engineGlowR = useRef()
  const [keys, setKeys] = useState({ left: false, right: false, up: false, down: false })
  const setShipPos = useGameStore((s) => s.setShipPos)
  const status = useGameStore((s) => s.status)
  const isBoosting = useGameStore((s) => s.isBoosting)
  const { camera, viewport } = useThree()

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

    // --- REVERTED TO ORIGINAL BOUNDARIES ---
    const boundX = 15 - 6; // Half of the 30-unit horizontal spawn volume
    const boundY = 17.5 - 2; // Half of the 35-unit vertical spawn volume
    
    shipPos.x = Math.max(-boundX, Math.min(boundX, shipPos.x));
    shipPos.y = Math.max(-boundY, Math.min(boundY, shipPos.y));
    // --- END REVERT ---
    
    shipRef.current.position.copy(shipPos);

    shipRef.current.rotation.z = -velocity.x * 0.05;
    shipRef.current.rotation.x = velocity.y * 0.03;
    shipRef.current.rotation.y = -velocity.x * 0.02;

    // Engine flare logic
    const targetScale = isBoosting ? 3 : 1;
    const targetIntensity = isBoosting ? 3.5 : 1.2;
    [engineGlowL, engineGlowR].forEach(ref => {
        if(ref.current) {
            ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
            ref.current.material.emissiveIntensity = THREE.MathUtils.lerp(ref.current.material.emissiveIntensity, targetIntensity, 0.1);
        }
    });

    setShipPos(shipPos)
  })

  return (
    <group ref={shipRef}>
      <group scale={0.15} rotation={[0, Math.PI, 0]}>
        {/* Simplified Ship Model */}
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
        {/* Engine Glows */}
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