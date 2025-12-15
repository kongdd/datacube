import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import VisualizationScene from './components/VisualizationScene';
import Controls from './components/Controls';
import { AppState, DatasetId, VisualizationMode } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    time: 180, // Start mid-year
    isPlaying: true,
    playbackSpeed: 0.5,
    visualizationMode: VisualizationMode.Cube, 
    activeDataset: DatasetId.Temperature,
    opacity: 0.8,
    threshold: 0.3, // Start with some filtering to show the "Anomaly" blobs clearly
    timeLength: 2.0, // Long cube by default to match screenshot
  });

  // Animation Loop for Time
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      if (state.isPlaying) {
        setState((prev) => {
          let nextTime = prev.time + prev.playbackSpeed;
          if (nextTime > 365) nextTime = 0; // Loop year
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
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [6, 4, 8], fov: 40 }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        <VisualizationScene state={state} />
      </Canvas>
      
      <Controls state={state} setState={setState} />
    </div>
  );
};

export default App;