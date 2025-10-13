import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'

function SpeedStreaks() {
  const meshRef = useRef();
  const speed = useGameStore((s) => s.speed);
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const particleCount = 200;
    const arr = [];
    const spawnVolume = { x: 80, y: 80, z: 250 };
    
    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * spawnVolume.x;
        const y = (Math.random() - 0.5) * spawnVolume.y;
        const z = -Math.random() * spawnVolume.z;
        const velocity = 1.5 + Math.random() * 1.0; // Individual speed multiplier
        arr.push({ position: new THREE.Vector3(x, y, z), velocity });
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      
      // Move particle much faster than the world speed for parallax
      p.position.z += speed * p.velocity * delta;

      // Wrap particles that go past the camera
      if (p.position.z > 10) {
        p.position.z = -250;
        p.position.x = (Math.random() - 0.5) * 80;
        p.position.y = (Math.random() - 0.5) * 80;
      }

      tempObject.position.copy(p.position);
      tempObject.lookAt(0, 0, 1000); // Point streaks forward
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, particles.length]}>
      <boxGeometry args={[0.02, 0.02, 2.5]} />
      <meshBasicMaterial 
        color="#aef8ff" 
        toneMapped={false} 
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

export default SpeedStreaks;