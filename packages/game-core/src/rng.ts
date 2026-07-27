/**
 * 可注入的随机源,便于测试复现(种子随机)与线上真随机。
 * next() 返回 [0,1)。
 */
export interface Rng {
  next(): number;
}

/** mulberry32 种子随机 —— 可复现 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** 真随机(默认) */
export const cryptoRng: Rng = {
  next: () => Math.random(),
};

/** 整数区间 [min, max] 含端点 */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng.next() * (max - min + 1));
}

/** 概率判定,chance ∈ [0,1] */
export function chance(rng: Rng, p: number): boolean {
  return rng.next() < p;
}

/** 从数组随机取一个 */
export function pickOne<T>(rng: Rng, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pickOne: empty array');
  return arr[Math.floor(rng.next() * arr.length)]!;
}

/** 带权重随机:返回选中项的索引 */
export function weightedIndex(rng: Rng, weights: readonly number[]): number {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return Math.floor(rng.next() * weights.length);
  let roll = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= Math.max(0, weights[i]!);
    if (roll < 0) return i;
  }
  return weights.length - 1;
}
