import { ProgressionPoint } from '../data/DeliveryConfig';

/**
 * Evaluate a piecewise-linear curve at the given time.
 *
 * - Empty curve: returns 1.0 (no progression).
 * - Before the first point: returns the first point's multiplier.
 * - After the last point: returns the last point's multiplier.
 * - Between two points: linearly interpolates.
 *
 * Assumes curve points are sorted by ascending `time`.
 */
export function evaluateCurve(curve: ProgressionPoint[], time: number): number {
  if (curve.length === 0) return 1.0;
  if (curve.length === 1) return curve[0].multiplier;

  // Before the first point
  if (time <= curve[0].time) return curve[0].multiplier;

  // After the last point
  const last = curve[curve.length - 1];
  if (time >= last.time) return last.multiplier;

  // Find the two surrounding points and interpolate
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i];
    const b = curve[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time);
      return a.multiplier + t * (b.multiplier - a.multiplier);
    }
  }

  // Fallback (should not be reached with sorted input)
  return last.multiplier;
}
