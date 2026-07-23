import type { InkStroke, Point, ShapeObject, ShapeType } from '../types';

export function detectShapeFromStroke(stroke: InkStroke): ShapeObject | null {
  const points = stroke.points;

  if (points.length < 8) {
    return null;
  }

  const start = points[0];
  const end = points[points.length - 1];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let totalLength = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;

    if (i > 0) {
      const prev = points[i - 1];
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      totalLength += Math.hypot(dx, dy);
    }
  }

  const width = Math.max(20, maxX - minX);
  const height = Math.max(20, maxY - minY);
  const directDistance = Math.hypot(end.x - start.x, end.y - start.y);
  const startEndDistance = directDistance;

  // 1. Line detection
  if (totalLength > 30 && totalLength / directDistance < 1.25) {
    // Check if it's an arrow (sharp hook near end)
    const arrowHeadLength = Math.hypot(
      end.x - points[Math.floor(points.length * 0.8)].x,
      end.y - points[Math.floor(points.length * 0.8)].y,
    );

    let isArrow = false;
    if (points.length > 12) {
      const lastSegmentAngle = Math.atan2(end.y - points[points.length - 3].y, end.x - points[points.length - 3].x);
      const prevSegmentAngle = Math.atan2(
        points[points.length - 3].y - points[points.length - 6].y,
        points[points.length - 3].x - points[points.length - 6].x,
      );
      const angleDiff = Math.abs(lastSegmentAngle - prevSegmentAngle);
      if (angleDiff > 0.8 && angleDiff < 2.5) {
        isArrow = true;
      }
    }

    const shapeType: ShapeType = isArrow ? 'arrow' : 'line';
    return {
      id: stroke.id,
      type: 'shape',
      shape: shapeType,
      x: start.x,
      y: start.y,
      width: end.x - start.x,
      height: end.y - start.y,
      color: stroke.color,
      createdAt: stroke.createdAt,
    };
  }

  // Closed shape detection (Circle, Rectangle, Triangle)
  const isClosed = startEndDistance < Math.max(40, Math.min(width, height) * 0.4);

  if (isClosed) {
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Check corner count by sampling angles
    let cornerCount = 0;
    const step = Math.max(2, Math.floor(points.length / 16));
    for (let i = step; i < points.length - step; i += step) {
      const pPrev = points[i - step];
      const pCurr = points[i];
      const pNext = points[i + step];

      const v1 = { x: pCurr.x - pPrev.x, y: pCurr.y - pPrev.y };
      const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };

      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.hypot(v1.x, v1.y);
      const mag2 = Math.hypot(v2.x, v2.y);

      if (mag1 > 2 && mag2 > 2) {
        const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        const angle = Math.acos(cosAngle);
        if (angle > 0.85) {
          cornerCount++;
          i += step; // skip nearby
        }
      }
    }

    let shapeType: ShapeType = 'ellipse';
    if (cornerCount >= 4) {
      shapeType = 'rectangle';
    } else if (cornerCount === 3) {
      shapeType = 'triangle';
    } else {
      shapeType = 'ellipse';
    }

    return {
      id: stroke.id,
      type: 'shape',
      shape: shapeType,
      x: minX,
      y: minY,
      width: width,
      height: height,
      color: stroke.color,
      createdAt: stroke.createdAt,
    };
  }

  return null;
}
