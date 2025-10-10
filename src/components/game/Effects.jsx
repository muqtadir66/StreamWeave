import React from 'react'
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'

function Effects({ enabled = true }) {
  if (!enabled) return null
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <SMAA />
      <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.1} mipmapBlur radius={0.8} />
      <Vignette eskil={false} offset={0.2} darkness={0.6} />
    </EffectComposer>
  )
}

export default Effects

