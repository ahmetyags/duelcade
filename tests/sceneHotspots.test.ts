import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SERVER_ROOM_HOTSPOTS,
  calculateContainRect,
  findHotspotAtPoint,
  getPolygonBounds,
  isObjectComplete,
  normalizedToScene,
  sceneToNormalized,
} from '../src/components/game/sceneHotspots';

test('contain rect preserves the scene ratio in portrait and landscape viewports', () => {
  const portrait = calculateContainRect(390, 700);
  assert.equal(portrait.width, 390);
  assert.ok(portrait.height < 220);
  assert.ok(portrait.y > 200);

  const landscape = calculateContainRect(1200, 600);
  assert.equal(landscape.height, 600);
  assert.ok(landscape.width > 1000);
  assert.ok(landscape.x > 60);
});

test('scene conversion round-trips and ignores letterbox touches', () => {
  const rect = calculateContainRect(390, 700);
  const original = { x: 0.42, y: 0.67 };
  const screen = normalizedToScene(original, rect);
  const normalized = sceneToNormalized(screen, rect);

  assert.ok(normalized);
  assert.ok(Math.abs(normalized.x - original.x) < 0.00001);
  assert.ok(Math.abs(normalized.y - original.y) < 0.00001);
  assert.equal(sceneToNormalized({ x: 195, y: 40 }, rect), null);
});

test('every calibrated object center resolves to its own hotspot', () => {
  const rect = calculateContainRect(1000, 700);
  for (const hotspot of SERVER_ROOM_HOTSPOTS) {
    const center = normalizedToScene(hotspot.focus, rect);
    assert.equal(findHotspotAtPoint(center, rect)?.id, hotspot.id);
  }
});

test('a point outside objects and image letterbox starts no interaction', () => {
  const rect = calculateContainRect(390, 700);
  const emptyFloor = normalizedToScene({ x: 0.34, y: 0.85 }, rect);
  assert.equal(findHotspotAtPoint(emptyFloor, rect), null);
  assert.equal(findHotspotAtPoint({ x: 30, y: 30 }, rect), null);
});

test('accessibility bounds stay at least 44 by 44 points', () => {
  const compactRect = calculateContainRect(320, 220);
  for (const hotspot of SERVER_ROOM_HOTSPOTS) {
    const bounds = getPolygonBounds(hotspot.polygon, compactRect);
    assert.ok(bounds.width >= 44);
    assert.ok(bounds.height >= 44);
  }
});

test('object completion recognizes stable completed server states', () => {
  assert.equal(isObjectComplete('idle'), false);
  assert.equal(isObjectComplete('locked'), false);
  assert.equal(isObjectComplete('active'), true);
  assert.equal(isObjectComplete('powered'), true);
  assert.equal(isObjectComplete('open'), true);
});
