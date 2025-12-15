export enum VisualizationMode {
  Globe = 'GLOBE',
  Cube = 'CUBE'
}

export enum DatasetId {
  Temperature = 'TEMP',
  Vegetation = 'NDVI',
  Precipitation = 'PRECIP',
  Clouds = 'CLOUD'
}

export interface DatasetConfig {
  id: DatasetId;
  name: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  gradient: string; // CSS gradient string for UI
}

export interface AppState {
  time: number; // 0 to 365 (Day of year)
  isPlaying: boolean;
  playbackSpeed: number;
  visualizationMode: VisualizationMode;
  activeDataset: DatasetId;
  opacity: number;
  threshold: number; // Value below which to discard (-1 to 1)
  timeLength: number; // Scaling factor for the Z-axis (Time axis) in Cube mode
}