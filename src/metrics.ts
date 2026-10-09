export function isShortLived(age: number): boolean {
  return age <= 2;
}

export function percentage(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}
