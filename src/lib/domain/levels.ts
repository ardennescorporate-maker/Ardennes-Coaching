/** level = floor(sqrt(xp / 40)) + 1 */
export function levelFor(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1;
}

/** Total XP needed to reach level L: 40 × (L − 1)² */
export function xpForLevel(level: number): number {
  return 40 * (Math.max(1, level) - 1) ** 2;
}

export type LevelProgress = { level: number; into: number; span: number; toNext: number; nextLevelXp: number };

/** Where the user sits inside their current level (for XP bars). */
export function levelProgress(xp: number): LevelProgress {
  const level = levelFor(xp);
  const base = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  return { level, into: xp - base, span: nextLevelXp - base, toNext: nextLevelXp - xp, nextLevelXp };
}
