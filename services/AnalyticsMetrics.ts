export function isDailyReturnWindow(prevSessionAt: number, currentSessionAt: number): boolean {
  if (!Number.isFinite(prevSessionAt) || !Number.isFinite(currentSessionAt)) return false;
  const diffMs = currentSessionAt - prevSessionAt;
  return diffMs >= 24 * 60 * 60 * 1000;
}
