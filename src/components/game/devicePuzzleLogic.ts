export type AccessLogCategory = 'green' | 'amber' | 'red';

export type AccessLogRecord = {
  readonly category: AccessLogCategory;
  readonly risk: number;
  readonly authenticated: boolean;
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createGenerator(seed: string): () => number {
  let state = hashSeed(seed) || 0x9e3779b9;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffled<T>(values: readonly T[], seed: string): T[] {
  const random = createGenerator(seed);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createFuseOrder(seed: string): number[] {
  return shuffled([0, 1, 2, 3], `${seed}:fuses`);
}

export function createTerminalTargets(seed: string): number[] {
  const random = createGenerator(`${seed}:terminal`);
  return Array.from({ length: 4 }, () => Math.floor(random() * 4));
}

export function createTerminalSignal(seed: string): number[] {
  const random = createGenerator(`${seed}:signal`);
  const length = 5;
  const signal: number[] = [];
  while (signal.length < length) {
    const cell = Math.floor(random() * 16);
    if (signal[signal.length - 1] !== cell) signal.push(cell);
  }
  return signal;
}

export function createAccessLogTargets(seed: string): AccessLogCategory[] {
  return shuffled<AccessLogCategory>(
    ['green', 'amber', 'red', 'green', 'amber', 'red'],
    `${seed}:access`,
  );
}

export function createAccessLogRecords(seed: string): AccessLogRecord[] {
  const random = createGenerator(`${seed}:access-records`);
  return createAccessLogTargets(seed).map((category) => {
    if (category === 'green') {
      return {
        category,
        risk: 12 + Math.floor(random() * 25),
        authenticated: true,
      };
    }
    if (category === 'amber') {
      return {
        category,
        risk: 42 + Math.floor(random() * 25),
        authenticated: true,
      };
    }
    return {
      category,
      risk: 74 + Math.floor(random() * 24),
      authenticated: random() > 0.55,
    };
  });
}

export function createDoorRingTargets(seed: string): number[] {
  const random = createGenerator(`${seed}:door`);
  return Array.from({ length: 4 }, (_, index) => {
    const value = Math.floor(random() * 8);
    return (value + index * 2) % 8;
  });
}

export function arraysEqual<T>(
  first: readonly T[],
  second: readonly T[],
): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}
