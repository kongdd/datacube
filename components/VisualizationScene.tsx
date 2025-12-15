import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { AppState, DatasetId, VisualizationMode } from '../types';
import { VERTEX_SHADER, FRAGMENT_SHADER } from '../constants';

interface VisualizationSceneProps {
  state: AppState;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const VisualizationScene: React.FC<VisualizationSceneProps> = ({ state }) => {
  // Convert dataset ID to integer for shader
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
      uOpacity: { value: state.opacity },
      uThreshold: { value: state.threshold },
      uIsCube: { value: state.visualizationMode === VisualizationMode.Cube },
      uTimeLength: { value: state.timeLength },
    }),
    [] 
  );

  // Update uniforms
  useFrame((clock) => {
    uniforms.uTime.value = clock.clock.getElapsedTime();
    uniforms.uDay.value = state.time;
    uniforms.uMode.value = getModeInt(state.activeDataset);
    uniforms.uOpacity.value = state.opacity;
    uniforms.uThreshold.value = state.threshold;
    uniforms.uIsCube.value = state.visualizationMode === VisualizationMode.Cube;
    uniforms.uTimeLength.value = state.timeLength;
  });

  const isGlobe = state.visualizationMode === VisualizationMode.Globe;
  
  // Dimensions
  const boxSize = 2.5;
  const zSize = boxSize * state.timeLength;
  
  // Volumetric Slices Logic
  const sliceCount = 80; // Increased slices for smoother 3D look
  const slices = useMemo(() => {
    if (isGlobe) return [];
    return Array.from({ length: sliceCount }).map((_, i) => {
      // Distribute slices from -Z/2 to Z/2
      const z = -zSize / 2 + (i / (sliceCount - 1)) * zSize;
      return z;
    });
  }, [zSize, sliceCount, isGlobe]);

  // Current Time Plane Position
  const timePlaneZ = -zSize/2 + (state.time / 365) * zSize;

  return (
    <>
      <color attach="background" args={['#020617']} />
      
      <OrbitControls 
        enablePan={true} 
        enableZoom={true} 
        minDistance={3} 
        maxDistance={25} 
        autoRotate={state.isPlaying && isGlobe}
        autoRotateSpeed={0.5}
        target={[0, 0, 0]}
      />
      
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />

      {isGlobe ? (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1.5, 128, 128]} />
          <shaderMaterial
            vertexShader={VERTEX_SHADER}
            fragmentShader={FRAGMENT_SHADER}
            uniforms={uniforms}
            transparent={true}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <group>
          {/* --- GRAY REFERENCE PLANES (The "Box") --- */}
          
          {/* Floor Plane (Bottom X-Z) */}
          <mesh position={[0, -boxSize/2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[boxSize, zSize]} />
            <meshBasicMaterial color="#334155" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>

          {/* Back Wall Plane (Far Z) - "Start of time" or "End of time" depending on perspective */}
          <mesh position={[0, 0, -zSize/2]} rotation={[0, 0, 0]}>
            <planeGeometry args={[boxSize, boxSize]} />
            <meshBasicMaterial color="#1e293b" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>

          {/* Side Wall Plane (Left Y-Z) */}
          <mesh position={[-boxSize/2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[zSize, boxSize]} />
            <meshBasicMaterial color="#1e293b" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>

          {/* --- DATA VOLUMETRIC SLICES --- */}
          {slices.map((z, i) => (
             <mesh key={i} position={[0, 0, z]}>
               <planeGeometry args={[boxSize, boxSize]} />
               <shaderMaterial
                  vertexShader={VERTEX_SHADER}
                  fragmentShader={FRAGMENT_SHADER}
                  uniforms={uniforms}
                  transparent={true}
                  side={THREE.DoubleSide}
                  depthWrite={false} // Important for transparency stacking
               />
             </mesh>
          ))}

          {/* Wireframe Outline */}
          <mesh>
            <boxGeometry args={[boxSize, boxSize, zSize]} />
            <meshBasicMaterial color="#64748b" wireframe transparent opacity={0.3} />
          </mesh>

          {/* Current Time Indicator Plane */}
          <mesh position={[0, 0, timePlaneZ]}>
            <planeGeometry args={[boxSize + 0.1, boxSize + 0.1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} />
            <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(boxSize + 0.1, boxSize + 0.1)]} />
                <lineBasicMaterial color="#ffffff" transparent opacity={0.6} />
            </lineSegments>
          </mesh>

          {/* Axis Labels (Months) - Aligned to the floor edge */}
          <group position={[boxSize/2 + 0.2, -boxSize/2, 0]}>
            {MONTHS.map((month, i) => {
              const z = -zSize/2 + (i / 11) * zSize;
              return (
                <Text
                  key={month}
                  position={[0, 0, z]}
                  rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Lay flat on floor
                  fontSize={0.12}
                  color="#94a3b8"
                  anchorX="center"
                  anchorY="top"
                >
                  {month}
                </Text>
              );
            })}
            {/* Year Label */}
            <Text
              position={[0.5, 0, zSize/2]}
              rotation={[-Math.PI / 2, 0, Math.PI / 2]}
              fontSize={0.25}
              color="white"
              anchorX="right"
              anchorY="top"
              fontWeight="bold"
            >
              2024
            </Text>
          </group>

          {/* Helper Grid on the Floor */}
          <group position={[0, -boxSize/2 + 0.01, 0]}>
             <Grid 
                args={[boxSize, zSize]} 
                cellSize={0.25} 
                cellThickness={0.5} 
                cellColor="#475569" 
                sectionSize={1.25} 
                sectionThickness={1} 
                sectionColor="#64748b" 
                fadeDistance={50} 
                infiniteGrid={false}
              />
          </group>
        </group>
      )}
    </>
  );
};

export default VisualizationScene;