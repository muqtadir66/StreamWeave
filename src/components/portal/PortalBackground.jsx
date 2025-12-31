import React, { useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, Stars } from '@react-three/drei'

function CameraDrift() {
  const t0 = useMemo(() => Math.random() * 1000, [])

  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime() + t0
    camera.position.x = Math.sin(t * 0.12) * 0.55
    camera.position.y = 5.2 + Math.sin(t * 0.08) * 0.18
    camera.position.z = 10.5 + Math.sin(t * 0.1) * 0.65
    camera.rotation.x = -0.18 + Math.sin(t * 0.06) * 0.02
    camera.rotation.y = Math.sin(t * 0.08) * 0.06
  })

  return null
}

export default function PortalBackground() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 5.2, 10.5], fov: 55 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#02040a']} />
      <fog attach="fog" args={['#02040a', 14, 34]} />

      <ambientLight intensity={0.25} />
      <directionalLight position={[8, 12, 4]} intensity={0.6} color="#a8f3ff" />
      <directionalLight position={[-6, 8, -8]} intensity={0.45} color="#ffcc00" />

      <Stars radius={120} depth={60} count={2200} factor={3.1} saturation={0} fade speed={0.5} />

      <group position={[0, -1.25, 0]}>
        <Grid
          args={[40, 40]}
          cellSize={0.65}
          cellThickness={0.5}
          cellColor="#00f6ff"
          sectionSize={5.2}
          sectionThickness={1.25}
          sectionColor="#00ff88"
          fadeDistance={28}
          fadeStrength={1}
          infiniteGrid
        />
      </group>

      <CameraDrift />
    </Canvas>
  )
}
