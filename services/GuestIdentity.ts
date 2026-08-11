import { SeededRandom } from '@/engine/SeededRandom';

export function generateGuestDisplayName(seed: number = Date.now()): string {
  const rng = new SeededRandom(seed.toString());
  return `Guest-${rng.nextInt(1000, 9999)}`;
}
