import React, { useRef, useMemo, forwardRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, SMAA, DepthOfField, ChromaticAberration } from '@react-three/postprocessing' // [NEW IMPORT]
import { useGameStore } from '../../stores/gameStore'
import { BlendFunction } from 'postprocessing'

// Custom Lens Distortion effect for the boost
import { Uniform } from 'three'
import { Effect } from 'postprocessing'

class LensDistortionEffect extends Effect {
  constructor({ distortion = new THREE.Vector2(0, 0), principalPoint = new THREE.Vector2(0, 0) } = {}) {
    super('LensDistortionEffect', `
      uniform vec2 distortion;
      uniform vec2 principalPoint;

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 centeredUv = uv - principalPoint;
        float r2 = dot(centeredUv, centeredUv);
        vec2 distortedUv = centeredUv * (1.0 + distortion.x * r2 + distortion.y * r2 * r2);
        outputColor = texture2D(inputBuffer, principalPoint + distortedUv);
      }
    `, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['distortion', new Uniform(distortion)],
        ['principalPoint', new Uniform(principalPoint)]
      ])
    })
    this.targetDistortion = new THREE.Vector2();
  }

  update(renderer, inputBuffer, deltaTime) {
    this.uniforms.get('distortion').value.lerp(this.targetDistortion, 0.05);
  }

  setDistortion(x, y) {
    this.targetDistortion.set(x, y);
  }
}

const LensDistortion = forwardRef(({ distortion, principalPoint }, ref) => {
  const effect = useMemo(() => new LensDistortionEffect({ distortion, principalPoint }), [distortion, principalPoint])
  return <primitive ref={ref} object={effect} />
})


function SceneEffects() {
  const isBoosting = useGameStore((s) => s.isBoosting)
  const status = useGameStore((s) => s.status) // [NEW: Needed for crash check]
  const lensDistortionRef = useRef();

  useFrame(() => {
    if (lensDistortionRef.current) {
      lensDistortionRef.current.setDistortion(isBoosting ? -0.15 : 0, 0);
    }
  });
  
  return (
    <EffectComposer multisampling={0} disableNormalPass>
      <SMAA />
      <Bloom 
        intensity={1.2} 
        luminanceThreshold={0.2}
        luminanceSmoothing={0.1} 
        mipmapBlur 
        radius={0.7} 
      />

      <LensDistortion ref={lensDistortionRef} />
      <DepthOfField 
        focusDistance={0}
        focalLength={0.02}
        bokehScale={isBoosting ? 5 : 0}
        height={480}
      />
      <Vignette eskil={false} offset={0.2} darkness={0.6} />
    </EffectComposer>
  )
}

export default SceneEffects;