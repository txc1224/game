import { seededRng, type Rng } from './battle.js';
import { newRun, type RunState } from './run.js';

/**
 * 每日一塔:按日期生成固定种子,同一天所有人面对同一座塔、同一手牌、同一事件。
 * 用于每日挑战比分/分享。
 */

/** 日期字符串(YYYY-MM-DD,本地时区) */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 把日期字符串哈希成 uint32 种子(FNV-1a,简单稳定) */
export function seedOfDay(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 今日之塔的种子 */
export function dailySeed(d: Date = new Date()): number {
  return seedOfDay(todayKey(d));
}

/** 每日一塔:同一天固定一座塔 */
export function newDailyRun(d: Date = new Date()): RunState {
  const rng: Rng = seededRng(dailySeed(d));
  const run = newRun(rng);
  run.log.push({ text: `【每日一塔 · ${todayKey(d)}】今日之塔已开启,与天下侠客同闯此塔,看谁走得远!`, kind: 'system' });
  return run;
}
