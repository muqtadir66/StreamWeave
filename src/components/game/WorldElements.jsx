import React from 'react'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'
import SpeedStreaks from './SpeedStreaks'

// --- ATMOSPHERIC GLOW COMPONENT ---
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor;
  void main() {
    float dist = distance(vUv, vec2(0.5));
    float strength = 1.0 - smoothstep(0.0, 0.5, dist);
    
    // Add a shimmering effect
    float shimmer = (sin((vUv.x + uTime * 0.1) * 20.0) + sin((vUv.y + uTime * 0.1) * 10.0)) * 0.05;
    strength *= 1.0 - shimmer;

    gl_FragColor = vec4(uColor, strength * 0.5);
  }
`;

function AtmosphericGlow() {
  const materialRef = useRef();
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#89d0ff') }
  }), []);

  return (
    <mesh position={[0, 10, -300]} scale={250}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}


// --- MAIN WORLD ELEMENTS COMPONENT ---
const createAsteroidGeometry = () => {
    const geo = new THREE.IcosahedronGeometry(1.4, 1);
    const vertices = geo.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i], y = vertices[i+1], z = vertices[i+2];
        const noise = 0.8 + Math.random() * 0.8;
        const vec = new THREE.Vector3(x, y, z).normalize().multiplyScalar(noise);
        vertices[i] += vec.x;
        vertices[i+1] += vec.y;
        vertices[i+2] += vec.z;
    }
    geo.computeVertexNormals();
    return geo;
}

function WorldElements() {
  const speedRef = useRef(20)
  const speed = useGameStore((s) => s.speed)
  const status = useGameStore((s) => s.status)
  const tickPacing = useGameStore((s) => s.tickPacing)
  const crash = useGameStore((s) => s.crash)
  const shipPos = useGameStore((s) => s.shipPos)
  const setShake = useGameStore((s) => s.setShake)

  // Starfield
  const starCountNear = 350, starCountFar = 500, starDepth = 400;
  const nearStarsRef = useRef(), farStarsRef = useRef();
  const nearStars = useMemo(() => new THREE.BufferAttribute(new Float32Array(starCountNear * 3).map((_, i) => (Math.random() - 0.5) * [180, 90, starDepth*2][i%3]), 3), []);
  const farStars = useMemo(() => new THREE.BufferAttribute(new Float32Array(starCountFar * 3).map((_, i) => (Math.random() - 0.5) * [240, 120, starDepth*2][i%3]), 3), []);

  // Asteroid Field
  const rockRef = useRef()
  const coreRef = useRef()
  const obstacleCount = 60;
  const spawnVolume = { x: 30, y: 35, z: 220 };
  const baseAsteroidGeometry = useMemo(() => createAsteroidGeometry(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  
  const obstacles = useMemo(() => {
    const arr = []
    for (let i = 0; i < obstacleCount; i++) {
        const x = (Math.random() - 0.5) * spawnVolume.x;
        const y = (Math.random() - 0.5) * spawnVolume.y;
        const z = -Math.random() * spawnVolume.z - 40;
        const scale = 0.8 + Math.random() * 1.5;
        arr.push({ 
            position: new THREE.Vector3(x, y, z), 
            spin: new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5),
            scale,
        })
    }
    return arr
  }, [])

  useFrame((state, delta) => {
    if (status !== 'running') return
    speedRef.current = speed
    tickPacing(delta)

    if (nearStarsRef.current) { nearStarsRef.current.position.z += speedRef.current * 0.9 * delta; if(nearStarsRef.current.position.z > starDepth) nearStarsRef.current.position.z = -starDepth; }
    if (farStarsRef.current) { farStarsRef.current.position.z += speedRef.current * 0.55 * delta; if(farStarsRef.current.position.z > starDepth) farStarsRef.current.position.z = -starDepth; }

    if (rockRef.current) {
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i]
        o.position.z += speedRef.current * delta
        
        if (o.position.z > 4) {
          o.position.x = (Math.random() - 0.5) * spawnVolume.x;
          o.position.y = (Math.random() - 0.5) * spawnVolume.y;
          o.position.z -= (spawnVolume.z + 20);
        }

        tempMatrix.makeRotationFromEuler(new THREE.Euler(state.clock.elapsedTime * o.spin.x, state.clock.elapsedTime * o.spin.y, state.clock.elapsedTime * o.spin.z));
        tempMatrix.setPosition(o.position.x, o.position.y, o.position.z);
        
        const rockMatrix = tempMatrix.clone().scale(new THREE.Vector3(o.scale, o.scale, o.scale));
        rockRef.current.setMatrixAt(i, rockMatrix);
        
        const coreMatrix = tempMatrix.clone().scale(new THREE.Vector3(o.scale * 0.6, o.scale * 0.6, o.scale * 0.6));
        coreRef.current.setMatrixAt(i, coreMatrix);

        const dx = Math.abs(shipPos.x - o.position.x), dy = Math.abs(shipPos.y - o.position.y), dz = Math.abs(shipPos.z - o.position.z);
        
        const shipRadius = 1.8;
        const hit = dx < (shipRadius + o.scale) && dy < (shipRadius + o.scale) && dz < (shipRadius + o.scale)
        if (hit) {
          setShake(0.9);
          crash();
          break;
        }

        const proximity = 1 - Math.min(1, dz / 10);
        if (proximity > 0.5 && dx < 4 && dy < 4) {
            setShake(proximity * 0.4);
        }
      }
      rockRef.current.instanceMatrix.needsUpdate = true
      coreRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <AtmosphericGlow />
      <SpeedStreaks /> 
      <points ref={nearStarsRef}><bufferGeometry attach="geometry"><bufferAttribute attach="attributes-position" {...nearStars} /></bufferGeometry><pointsMaterial size={0.12} color="#88ddff" sizeAttenuation transparent opacity={0.95} /></points>
      <points ref={farStarsRef}><bufferGeometry attach="geometry"><bufferAttribute attach="attributes-position" {...farStars} /></bufferGeometry><pointsMaterial size={0.08} color="#66aaff" sizeAttenuation transparent opacity={0.75} /></points>
      <mesh receiveShadow position={[0, 0, -100]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[spawnVolume.x + 10, 400]} />
        <shadowMaterial opacity={0.4} />
      </mesh>
      <lineSegments>
          <bufferGeometry setFromPoints={useMemo(() => {
              const lines = [];
              const halfWidth = spawnVolume.x / 2 + 5, halfHeight = spawnVolume.y / 2 + 5;
              for (let i = -halfWidth; i <= halfWidth; i += 4) lines.push(new THREE.Vector3(i, -halfHeight, 0), new THREE.Vector3(i, halfHeight, 0));
              for (let i = -halfHeight; i <= halfHeight; i += 4) lines.push(new THREE.Vector3(-halfWidth, i, 0), new THREE.Vector3(halfWidth, i, 0));
              return lines;
          }, [spawnVolume.x, spawnVolume.y])} />
        <lineBasicMaterial color="#2a6dff" opacity={0.2} transparent />
      </lineSegments>
      <instancedMesh ref={rockRef} args={[baseAsteroidGeometry, undefined, obstacleCount]} castShadow>
        <meshStandardMaterial color="#222222" roughness={0.8} metalness={0.9} />
      </instancedMesh>
      <instancedMesh ref={coreRef} args={[baseAsteroidGeometry, undefined, obstacleCount]}>
        <meshBasicMaterial color="#ff4060" toneMapped={false} />
      </instancedMesh>
    </>
  )
}

export default WorldElements