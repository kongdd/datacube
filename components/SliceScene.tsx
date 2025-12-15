import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { AppState, DatasetId } from '../types';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../constants';

// Augment JSX namespace to recognize React Three Fiber intrinsic elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      planeGeometry: any;
      shaderMaterial: any;
      gridHelper: any;
      color: any;
    }
  }
}

interface SliceSceneProps {
  state: AppState;
}

const SliceScene: React.FC<SliceSceneProps> = ({ state }) => {
  const getModeInt = (id: DatasetId) => {
    switch(id) {
      case DatasetId.Temperature: return 0;
      case DatasetId.Vegetation: return 1;
      case DatasetId.Precipitation: return 2;
      case DatasetId.Clouds: return 3;
      default: return 0;
    }
  };

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDay: { value: state.time },
      uMode: { value: getModeInt(state.activeDataset) },
      uOpacity: { value: 1.0 }, // Force full opacity for clarity in map view
      uThreshold: { value: state.threshold },
      uIsCube: { value: false },
      uTimeLength: { value: state.timeLength },
      uIsSlice: { value: true } 
    }),
    [] 
  );

  useFrame((clock) => {
    uniforms.uTime.value = clock.clock.getElapsedTime();
    uniforms.uDay.value = state.time;
    uniforms.uMode.value = getModeInt(state.activeDataset);
    uniforms.uOpacity.value = 1.0; 
    uniforms.uThreshold.value = state.threshold;
    uniforms.uIsCube.value = false;
    uniforms.uTimeLength.value = state.timeLength;
    uniforms.uIsSlice.value = true;
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 3.5]} fov={50} />
      <color attach="background" args={['#0f172a']} />
      
      {/* 2D Plane filling the view */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[4, 4]} />
        <shaderMaterial
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={uniforms}
          transparent={true}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Grid Overlay */}
      <gridHelper args={[4, 8, 0x334155, 0x1e293b]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.01]} />
      
      <Text position={[-1.8, 1.8, 0.1]} fontSize={0.15} color="#94a3b8" anchorX="left" anchorY="top">
         TIME SLICE: DAY {Math.floor(state.time)}
      </Text>
    </>
  );
};

export default SliceScene;