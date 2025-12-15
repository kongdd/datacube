import React from 'react';
import { Play, Pause, Square, Globe, Layers, Settings, Filter, Clock, LayoutTemplate } from 'lucide-react';
import { AppState, DatasetId, VisualizationMode } from '../types';
import { DATASETS } from '../constants';

interface ControlsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const Controls: React.FC<ControlsProps> = ({ state, setState }) => {
  
  const handleTogglePlay = () => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, time: parseFloat(e.target.value), isPlaying: false }));
  };

  const handleModeToggle = (mode: VisualizationMode) => {
    setState(prev => ({ ...prev, visualizationMode: mode }));
  };

  const activeDatasetConfig = DATASETS[state.activeDataset];
  const isCube = state.visualizationMode === VisualizationMode.Cube;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-50">
      
      {/* Header */}
      <div className="pointer-events-auto flex justify-between items-start">
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700 p-4 rounded-xl shadow-2xl max-w-xs">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Lexcube React
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Interactive Earth System Datacube
          </p>
        </div>

        <div className="flex gap-2">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-1">
              <button
                onClick={() => handleModeToggle(VisualizationMode.Globe)}
                className={`p-2 rounded-md transition-colors ${
                  state.visualizationMode === VisualizationMode.Globe 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Globe View"
              >
                <Globe size={20} />
              </button>
              <button
                onClick={() => handleModeToggle(VisualizationMode.Cube)}
                className={`p-2 rounded-md transition-colors ${
                  state.visualizationMode === VisualizationMode.Cube 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Datacube View"
              >
                <Square size={20} />
              </button>
            </div>

            {/* Slice Panel Toggle */}
            <div className="flex bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-1">
              <button
                onClick={() => setState(prev => ({ ...prev, showSlicePanel: !prev.showSlicePanel }))}
                className={`p-2 rounded-md transition-colors ${
                  state.showSlicePanel
                    ? 'bg-emerald-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Toggle Spatial Slice View"
              >
                <LayoutTemplate size={20} />
              </button>
            </div>
        </div>
      </div>

      {/* Dataset & Filters (Left Panel) */}
      <div className="pointer-events-auto absolute left-6 top-32 flex flex-col gap-2">
        
        {/* Dataset Selection */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-4 w-64">
          <div className="flex items-center gap-2 mb-4 text-slate-300">
            <Layers size={16} />
            <span className="text-sm font-semibold uppercase tracking-wider">Datasets</span>
          </div>
          
          <div className="space-y-2">
            {Object.values(DATASETS).map((ds) => (
              <button
                key={ds.id}
                onClick={() => setState(prev => ({ ...prev, activeDataset: ds.id }))}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                  state.activeDataset === ds.id
                    ? 'bg-blue-900/40 border-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                    : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {ds.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filters & Options */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-4 w-64">
           <div className="flex items-center gap-2 mb-4 text-slate-300">
              <Filter size={16} />
              <span className="text-sm font-semibold uppercase tracking-wider">Filters</span>
           </div>

           {/* Opacity Slider */}
           <div className="mb-4">
             <div className="flex justify-between text-xs text-slate-400 mb-2">
               <span>Opacity</span>
               <span>{Math.round(state.opacity * 100)}%</span>
             </div>
             <input
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={state.opacity}
                onChange={(e) => setState(prev => ({...prev, opacity: parseFloat(e.target.value)}))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
          </div>

          {/* Threshold Slider */}
          <div className="mb-4">
             <div className="flex justify-between text-xs text-slate-400 mb-2">
               <span>Filter Threshold</span>
               <span>{state.threshold.toFixed(2)}</span>
             </div>
             <input
                type="range"
                min="0.0"
                max="0.9"
                step="0.05"
                value={state.threshold}
                onChange={(e) => setState(prev => ({...prev, threshold: parseFloat(e.target.value)}))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
             />
          </div>

          {/* Time Axis Length (Only in Cube Mode) */}
          {isCube && (
            <div className="pt-4 border-t border-slate-700">
               <div className="flex items-center gap-2 mb-3 text-slate-300">
                  <Clock size={16} />
                  <span className="text-sm font-semibold uppercase tracking-wider">Time Axis</span>
               </div>
               <div className="flex justify-between text-xs text-slate-400 mb-2">
                 <span>Drawing Length</span>
                 <span>{state.timeLength.toFixed(1)}x</span>
               </div>
               <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={state.timeLength}
                  onChange={(e) => setState(prev => ({...prev, timeLength: parseFloat(e.target.value)}))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
               />
            </div>
          )}
        </div>
      </div>

      {/* Legend & Info (Bottom Left) */}
      <div className="pointer-events-auto bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-4 w-64 mb-20 md:mb-0">
        <h3 className="font-medium text-slate-200">{activeDatasetConfig.name}</h3>
        <p className="text-xs text-slate-400 mt-1 mb-3 leading-relaxed">
          {activeDatasetConfig.description}
        </p>
        
        {/* Color Scale Legend */}
        <div className="w-full h-3 rounded-full mb-1" style={{ background: activeDatasetConfig.gradient }}></div>
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>{activeDatasetConfig.min} {activeDatasetConfig.unit}</span>
          <span>{activeDatasetConfig.max} {activeDatasetConfig.unit}</span>
        </div>
      </div>

      {/* Time Controls (Bottom Center/Full) */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[600px] bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl p-4 flex flex-col gap-2 shadow-2xl z-50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-mono text-blue-400">DAY {Math.floor(state.time)} / 365</span>
          <div className="flex items-center gap-2">
             <Settings size={14} className="text-slate-500" />
             <span className="text-[10px] text-slate-500 uppercase">Speed: {state.playbackSpeed.toFixed(1)}x</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleTogglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shrink-0"
          >
            {state.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
          
          <input
            type="range"
            min="0"
            max="365"
            step="0.5"
            value={state.time}
            onChange={handleTimeChange}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
          />
        </div>
      </div>
    </div>
  );
};

export default Controls;