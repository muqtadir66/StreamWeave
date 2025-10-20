import React, { useRef } from 'react'
import { useHelper } from '@react-three/drei'
import * as THREE from 'three'

function Lights() {
  const lightRef = useRef()
  // useHelper(lightRef, THREE.DirectionalLightHelper, 5) // Optional: uncomment to see the light's direction

  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={[0x5588ff, 0x000011, 0.6]} />
      <directionalLight 
        ref={lightRef}
        position={[10, 20, 15]} 
        intensity={2.0} 
        color="#99ccff" 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
      />
      <pointLight position={[-8, -6, 4]} intensity={0.6} color="#ff6699" distance={40} />
    </>
  )
}

export default Lights