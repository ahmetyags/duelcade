import type { ObjectState } from '@/types/game';

export const SERVER_ROOM_IMAGE_SIZE = {
  width: 1672,
  height: 941,
} as const;

export type NormalizedPoint = {
  readonly x: number;
  readonly y: number;
};

export type ScenePoint = {
  readonly x: number;
  readonly y: number;
};

export type SceneRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type SceneHotspotId =
  | 'mainFuseBox'
  | 'securityTerminal'
  | 'accessLog'
  | 'exitDoor';

export type SceneHotspotState = 'available' | 'focused' | 'completed' | 'locked';

export type SceneHotspot = {
  readonly id: SceneHotspotId;
  readonly objectIds: readonly string[];
  readonly polygon: readonly NormalizedPoint[];
  readonly focus: {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
  };
  readonly priority: number;
};

/**
 * Polygons are calibrated against secure-server-room-2_5d.png and kept in
 * normalized image coordinates so they stay aligned through contain scaling.
 */
export const SERVER_ROOM_HOTSPOTS: readonly SceneHotspot[] = [
  {
    id: 'mainFuseBox',
    objectIds: ['fuse_box_main'],
    polygon: [
      { x: 0.096, y: 0.188 },
      { x: 0.211, y: 0.198 },
      { x: 0.218, y: 0.572 },
      { x: 0.101, y: 0.581 },
      { x: 0.087, y: 0.535 },
      { x: 0.087, y: 0.224 },
    ],
    focus: { x: 0.153, y: 0.39, scale: 1.22 },
    priority: 2,
  },
  {
    id: 'securityTerminal',
    objectIds: ['room_terminal'],
    polygon: [
      { x: 0.466, y: 0.421 },
      { x: 0.558, y: 0.431 },
      { x: 0.572, y: 0.633 },
      { x: 0.546, y: 0.794 },
      { x: 0.413, y: 0.793 },
      { x: 0.398, y: 0.618 },
      { x: 0.44, y: 0.493 },
    ],
    focus: { x: 0.49, y: 0.59, scale: 1.24 },
    priority: 1,
  },
  {
    id: 'accessLog',
    objectIds: ['note_access_log', 'key_card_alpha'],
    polygon: [
      { x: 0.596, y: 0.385 },
      { x: 0.635, y: 0.392 },
      { x: 0.635, y: 0.523 },
      { x: 0.596, y: 0.526 },
    ],
    focus: { x: 0.616, y: 0.455, scale: 1.32 },
    priority: 4,
  },
  {
    id: 'exitDoor',
    objectIds: ['escape_door'],
    polygon: [
      { x: 0.657, y: 0.264 },
      { x: 0.779, y: 0.264 },
      { x: 0.797, y: 0.591 },
      { x: 0.77, y: 0.618 },
      { x: 0.638, y: 0.617 },
      { x: 0.638, y: 0.307 },
    ],
    focus: { x: 0.715, y: 0.44, scale: 1.2 },
    priority: 3,
  },
] as const;

export function calculateContainRect(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth = SERVER_ROOM_IMAGE_SIZE.width,
  imageHeight = SERVER_ROOM_IMAGE_SIZE.height,
): SceneRect {
  if (
    viewportWidth <= 0 ||
    viewportHeight <= 0 ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const scale = Math.min(viewportWidth / imageWidth, viewportHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    x: (viewportWidth - width) / 2,
    y: (viewportHeight - height) / 2,
    width,
    height,
  };
}

export function normalizedToScene(
  point: NormalizedPoint,
  imageRect: SceneRect,
): ScenePoint {
  return {
    x: imageRect.x + point.x * imageRect.width,
    y: imageRect.y + point.y * imageRect.height,
  };
}

export function sceneToNormalized(
  point: ScenePoint,
  imageRect: SceneRect,
): NormalizedPoint | null {
  if (imageRect.width <= 0 || imageRect.height <= 0) return null;
  const normalized = {
    x: (point.x - imageRect.x) / imageRect.width,
    y: (point.y - imageRect.y) / imageRect.height,
  };
  if (
    normalized.x < 0 ||
    normalized.x > 1 ||
    normalized.y < 0 ||
    normalized.y > 1
  ) {
    return null;
  }
  return normalized;
}

export function isPointInPolygon(
  point: NormalizedPoint,
  polygon: readonly NormalizedPoint[],
): boolean {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const currentPoint = polygon[current];
    const previousPoint = polygon[previous];
    const crosses =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function findHotspotAtPoint(
  point: ScenePoint,
  imageRect: SceneRect,
  hotspots: readonly SceneHotspot[] = SERVER_ROOM_HOTSPOTS,
): SceneHotspot | null {
  const normalized = sceneToNormalized(point, imageRect);
  if (!normalized) return null;
  return (
    [...hotspots]
      .sort((first, second) => second.priority - first.priority)
      .find((hotspot) => isPointInPolygon(normalized, hotspot.polygon)) ?? null
  );
}

export function getPolygonBounds(
  polygon: readonly NormalizedPoint[],
  imageRect: SceneRect,
  minimumSize = 44,
): SceneRect {
  const points = polygon.map((point) => normalizedToScene(point, imageRect));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(minimumSize, maxX - minX);
  const height = Math.max(minimumSize, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
}

export function isObjectComplete(state: ObjectState): boolean {
  return ['active', 'unlocked', 'open', 'powered'].includes(state);
}
