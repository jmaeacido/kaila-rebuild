export const pullRefreshThreshold = 72;
export const pullRefreshMaximum = 112;

export function pullDistance(startY: number, currentY: number): number {
  return Math.min(pullRefreshMaximum, Math.max(0, (currentY - startY) * 0.55));
}

export function shouldRefresh(distance: number): boolean {
  return distance >= pullRefreshThreshold;
}
