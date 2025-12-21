import React, { useRef, useMemo } from 'react' // Removed useEffect
import { useFrame } from '@react-three/fiber'
// Removed useGameStore import since we don't need sound check here anymore
import * as THREE from 'three'

// Colors extracted from PlayerShip.jsx palette
const SHIP_COLORS = ['#c0c0c0', '#111827', '#ff7a00'] 

export default function ShipExplosion({ position }) {
  const group = useRef()
  // Audio moved to WorldElements for better timing
  
  // Create 50 pieces of debris for a denser explosion
  const particles = useMemo(() => {
    return new Array(50).fill().map(() => {
        // Random velocity: Explode OUT (x/y) but keep moving FORWARD (z) slightly
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 15, 
            (Math.random() - 0.5) * 15, 
            (Math.random() * 8) + 8     
        )
        
        return {
            velocity,
            rotation: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
            scale: Math.random() * 0.5 + 0.1, 
            color: SHIP_COLORS[Math.floor(Math.random() * SHIP_COLORS.length)]
        }
    })
  }, [])

  useFrame((state, delta) => {
    if (!group.current) return
    
    // Iterate using particles.length to avoid crashing on the PointLight
    for (let i = 0; i < particles.length; i++) {
        const mesh = group.current.children[i];
        const p = particles[i];
        
        if (!mesh || !p) continue;

        // Move debris
        mesh.position.addScaledVector(p.velocity, delta)
        
        // Rotate debris
        mesh.rotation.x += p.rotation.x * 10 * delta
        mesh.rotation.y += p.rotation.y * 10 * delta
        
        // Physics
        p.velocity.y -= 9.0 * delta 
        p.velocity.z *= 0.99 
        p.velocity.x *= 0.98 
    }
  })

  return (
    <group ref={group} position={[position.x, position.y, position.z]}>
      {particles.map((data, i) => (
        <mesh key={i}>
          <boxGeometry args={[data.scale, data.scale, data.scale]} />
          <meshStandardMaterial color={data.color} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      <pointLight intensity={20} distance={25} color="#ffaa00" decay={3} />
    </group>
  )
}