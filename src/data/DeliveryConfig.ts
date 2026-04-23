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

  // Progression curves (piecewise-linear)
  spawnIntervalCurve: ProgressionPoint[];  // multiplier decreases over time
  beltSpeedCurve: ProgressionPoint[];      // multiplier increases over time
}

export const DELIVERY_CONFIG: DeliveryConfigData = {
  initialSpawnInterval: 3000,
  initialBeltSpeed: 60,
  initialJitter: 0.25,

  minSpawnInterval: 800,
  maxBeltSpeed: 180,
  minSpawnDelay: 200,

  spawnIntervalCurve: [
    { time: 0,      multiplier: 1.0 },
    { time: 60000,  multiplier: 0.7 },   // 1 min → 2100 ms
    { time: 120000, multiplier: 0.5 },   // 2 min → 1500 ms
    { time: 300000, multiplier: 0.3 },   // 5 min → 900 ms
  ],
  beltSpeedCurve: [
    { time: 0,      multiplier: 1.0 },
    { time: 60000,  multiplier: 1.3 },   // 1 min → 78 px/s
    { time: 120000, multiplier: 1.7 },   // 2 min → 102 px/s
    { time: 300000, multiplier: 2.5 },   // 5 min → 150 px/s
  ],
};
