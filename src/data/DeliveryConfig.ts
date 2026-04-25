export interface ProgressionPoint {
  time: number;       // elapsed time in ms
  multiplier: number; // multiplier applied to the base value
}

export interface DeliveryConfigData {
  // Initial values
  initialSpawnInterval: number;   // ms
  initialBeltSpeed: number;       // px/s
  initialJitter: number;          // fraction 0–1

  // Floors and ceilings
  minSpawnInterval: number;       // ms floor
  maxBeltSpeed: number;           // px/s ceiling

  // Clamp
  minSpawnDelay: number;          // ms, absolute minimum per-spawn delay
}

export const DELIVERY_CONFIG: DeliveryConfigData = {
  initialSpawnInterval: 3000,
  initialBeltSpeed: 60,
  initialJitter: 0.25,

  minSpawnInterval: 800,
  maxBeltSpeed: 180,
  minSpawnDelay: 200,
};
