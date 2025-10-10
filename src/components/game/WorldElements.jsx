import React from 'react'
import { useMemo, useRef } from 'react'
import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../../stores/gameStore'

function WorldElements() {
  const speedRef = useRef(20)
  const tempMatrix = useMemo(() => new THREE.Matrix4(), [])
  const speed = useGameStore((s) => s.speed)
  const status = useGameStore((s) => s.status)
  const tickPacing = useGameStore((s) => s.tickPacing)
  const crash = useGameStore((s) => s.crash)
  const shipPos = useGameStore((s) => s.shipPos)
  const setShake = useGameStore((s) => s.setShake)

  // Starfield (two layers for parallax)
  const starCountNear = 350
  const starCountFar = 500
  const starDepth = 400
  const nearStarsRef = useRef()
  const farStarsRef = useRef()
  const nearStars = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(starCountNear * 3)
    for (let i = 0; i < starCountNear; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 120
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60
      positions[i * 3 + 2] = -Math.random() * starDepth
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])
  const farStars = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(starCountFar * 3)
    for (let i = 0; i < starCountFar; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 180
      positions[i * 3 + 1] = (Math.random() - 0.5) * 90
      positions[i * 3 + 2] = -Math.random() * starDepth
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  // Static lane rails for depth and lane clarity
  const railsRef = useRef()
  const lanesX = [-10, 0, 10]
  const lanesY = [8, 0, -8]
  const railLength = 420
  const railInstances = lanesX.length * lanesY.length

  // Obstacles (instanced boxes) — 3x3 lanes
  const obstacleRef = useRef()
  const haloRef = useRef()
  const perLane = 10
  const obstacleSize = { x: 2.6, y: 2.6, z: 2.6 }
  const obstacles = useMemo(() => {
    const arr = []
    // initialize spawn cursors per lane, slightly random to avoid sync walls
    const cursors = Array.from({ length: lanesY.length }, () => Array.from({ length: lanesX.length }, () => -40 - Math.random() * 60))
    for (let iy = 0; iy < lanesY.length; iy++) {
      for (let ix = 0; ix < lanesX.length; ix++) {
        for (let k = 0; k < perLane; k++) {
          const gap = 22 + Math.random() * 24
          cursors[iy][ix] -= gap
          arr.push({ ix, iy, position: new THREE.Vector3(lanesX[ix], lanesY[iy], cursors[iy][ix]), spin: (Math.random() - 0.5) * 1.2 })
        }
      }
    }
    return arr
  }, [])

  // Initialize static lane rails
  useEffect(() => {
    if (railsRef.current) {
      let i = 0
      for (let iy = 0; iy < lanesY.length; iy++) {
        for (let ix = 0; ix < lanesX.length; ix++) {
          const m = new THREE.Matrix4()
          m.setPosition(lanesX[ix], lanesY[iy], -railLength * 0.5)
          railsRef.current.setMatrixAt(i++, m)
        }
      }
      railsRef.current.instanceMatrix.needsUpdate = true
    }
  }, [railsRef, obstacleRef])

  useFrame((state, delta) => {
    if (status !== 'running') return
    speedRef.current = speed
    tickPacing(delta)

    // Move and wrap near stars
    if (nearStarsRef.current) {
      const pos = nearStarsRef.current.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        let z = pos.getZ(i) + speedRef.current * 0.9 * delta
        if (z > 1) {
          z = -starDepth
          pos.setX(i, (Math.random() - 0.5) * 120)
          pos.setY(i, (Math.random() - 0.5) * 60)
        }
        pos.setZ(i, z)
      }
      pos.needsUpdate = true
    }
    // Move and wrap far stars slower
    if (farStarsRef.current) {
      const pos = farStarsRef.current.geometry.attributes.position
      for (let i = 0; i < pos.count; i++) {
        let z = pos.getZ(i) + speedRef.current * 0.55 * delta
        if (z > 1) {
          z = -starDepth
          pos.setX(i, (Math.random() - 0.5) * 180)
          pos.setY(i, (Math.random() - 0.5) * 90)
        }
        pos.setZ(i, z)
      }
      pos.needsUpdate = true
    }

    // Obstacles per-lane spacing
    if (obstacleRef.current) {
      for (let i = 0; i < obstacles.length; i++) {
        const o = obstacles[i]
        o.position.z += speedRef.current * delta
        if (o.position.z > 4) {
          // respawn behind per-lane cursor
          const gap = 22 + Math.random() * 28
          // reuse lane info
          o.position.z -= gap + 160 // push back sufficiently
          // keep lane x/y fixed
        }
        // place & rotate
        tempMatrix.identity()
        tempMatrix.makeRotationAxis(new THREE.Vector3(0, 0, 1), (state.clock.elapsedTime * o.spin))
        tempMatrix.setPosition(o.position.x, o.position.y, o.position.z)
        obstacleRef.current.setMatrixAt(i, tempMatrix)
        if (haloRef.current) haloRef.current.setMatrixAt(i, tempMatrix)

        // Collision (AABB)
        const dx = Math.abs(shipPos.x - o.position.x)
        const dy = Math.abs(shipPos.y - o.position.y)
        const dz = Math.abs(0 - o.position.z)
        const shipRadius = 1.6
        const hit = dx < (shipRadius + obstacleSize.x * 0.5) &&
                    dy < (shipRadius + obstacleSize.y * 0.5) &&
                    dz < (shipRadius + obstacleSize.z * 0.5)
        if (hit) {
          setShake(0.8)
          crash()
          break
        }
        // Near miss shake
        if (!hit && dz < 6 && dx < 2.5 && dy < 2.5) setShake(0.25)
      }
      obstacleRef.current.instanceMatrix.needsUpdate = true
      if (haloRef.current) haloRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      {/* Starfield */}
      <points ref={nearStarsRef} geometry={nearStars}>
        <pointsMaterial size={0.12} color="#88ddff" sizeAttenuation transparent opacity={0.95} />
      </points>
      <points ref={farStarsRef} geometry={farStars}>
        <pointsMaterial size={0.08} color="#66aaff" sizeAttenuation transparent opacity={0.75} />
      </points>

      {/* Lane rails (static) */}
      <instancedMesh ref={railsRef} args={[undefined, undefined, railInstances]}
        frustumCulled={false}>
        <boxGeometry args={[0.15, 0.15, railLength]} />
        <meshStandardMaterial color="#2a6dff" emissive="#2a6dff" emissiveIntensity={0.6} opacity={0.3} transparent depthWrite={false} />
      </instancedMesh>

      {/* Obstacles */}
      <instancedMesh ref={obstacleRef} args={[undefined, undefined, (lanesX.length * lanesY.length * perLane)]}
        frustumCulled={false}>
        <boxGeometry args={[obstacleSize.x, obstacleSize.y, obstacleSize.z]} />
        <meshBasicMaterial color="#ff304f" toneMapped={false} fog={false} />
      </instancedMesh>

      {/* Red glow halo to improve visibility */}
      <instancedMesh ref={haloRef} args={[undefined, undefined, (lanesX.length * lanesY.length * perLane)]}
        frustumCulled={false}>
        <boxGeometry args={[obstacleSize.x * 1.25, obstacleSize.y * 1.25, obstacleSize.z * 1.25]} />
        <meshBasicMaterial color="#ff5c7a" opacity={0.32} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
      </instancedMesh>
    </>
  )
}

export default WorldElements
