import type { InkStroke, Point } from '../types';

export function smoothStrokePoints(stroke: InkStroke): InkStroke {
  const points = stroke.points;
  if (points.length < 3) {
    return stroke;
  }

  // 1. Filter out extreme duplicate / micro-jitter points (< 1.2px)
  const filtered: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = points[i];
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    if (dist >= 1.2 || i === points.length - 1) {
      filtered.push(curr);
    }
  }

  if (filtered.length < 3) {
    return { ...stroke, points: filtered };
  }

  // 2. Chaikin / weighted moving average smoothing passes (2 passes)
  let smoothed = [...filtered];
  const passes = 2;

  for (let pass = 0; pass < passes; pass++) {
    const nextPoints: Point[] = [smoothed[0]];

    for (let i = 1; i < smoothed.length - 1; i++) {
      const prev = smoothed[i - 1];
      const curr = smoothed[i];
      const next = smoothed[i + 1];

      // Weighted average: 20% prev, 60% curr, 20% next
      const newX = prev.x * 0.2 + curr.x * 0.6 + next.x * 0.2;
      const newY = prev.y * 0.2 + curr.y * 0.6 + next.y * 0.2;
      const newPressure = prev.pressure * 0.2 + curr.pressure * 0.6 + next.pressure * 0.2;

      nextPoints.push({
        ...curr,
        x: newX,
        y: newY,
        pressure: newPressure,
      });
    }

    nextPoints.push(smoothed[smoothed.length - 1]);
    smoothed = nextPoints;
  }

  return {
    ...stroke,
    points: smoothed,
  };
}
