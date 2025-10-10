import React from 'react'
function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <hemisphereLight args={[0x5588ff, 0x000011, 0.6]} />
      <directionalLight position={[10, 10, 6]} intensity={0.5} color="#99ccff" />
      <pointLight position={[-8, -6, 4]} intensity={0.6} color="#ff6699" distance={40} />
    </>
  )
}

export default Lights
