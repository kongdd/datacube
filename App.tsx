import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';
import VisualizationScene from './components/VisualizationScene';
import SliceScene from './components/SliceScene';
import Controls from './components/Controls';
import { AppState, DatasetId, VisualizationMode } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    time: 180, 
    isPlaying: true,
    playbackSpeed: 0.5,
    visualizationMode: VisualizationMode.Cube, 
    activeDataset: DatasetId.Temperature,
    opacity: 0.9,
    threshold: 0.2,
    timeLength: 2.0, 
    showSlicePanel: true, 
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const mainViewRef = useRef<HTMLDivElement>(null);
  const sliceViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      if (state.isPlaying) {
        setState((prev) => {
          let nextTime = prev.time + prev.playbackSpeed;
          if (nextTime > 365) nextTime = 0; 
          return { ...prev, time: nextTime };
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    if (state.isPlaying) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [state.isPlaying, state.playbackSpeed]);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-slate-950 overflow-hidden flex">
      {/* 3D Canvas Context (Invisible container, renders into Views) */}
      <Canvas
        className="absolute inset-0 pointer-events-none"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        eventSource={containerRef}
      >
        <View track={mainViewRef as React.MutableRefObject<HTMLElement>}>
            <VisualizationScene state={state} />
        </View>
        
        {state.showSlicePanel && (
           <View track={sliceViewRef as React.MutableRefObject<HTMLElement>}>
              <SliceScene state={state} />
           </View>
        )}
      </Canvas>

      {/* DOM Layout for Views */}
      <div ref={mainViewRef} className="flex-1 h-full relative" />
      
      {state.showSlicePanel && (
        <div ref={sliceViewRef} className="w-1/3 h-full border-l border-slate-700 relative bg-slate-900" />
      )}
      
      <Controls state={state} setState={setState} />
    </div>
  );
};

export default App;