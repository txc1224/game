import type { Allocation, AttrKey, Attributes } from './types.js';

export const ATTR_KEYS: readonly AttrKey[] = [
  'strength',
  'agility',
  'constitution',
  'wisdom',
  'luck',
  'reputation',
];

/** 属性中文名(展示层) */
export const ATTR_LABELS: Record<AttrKey, string> = {
  strength: '臂力',
  agility: '身法',
  constitution: '根骨',
  wisdom: '悟性',
  luck: '福缘',
  reputation: '声望',
};

export const ATTR_MIN = 0;
export const ATTR_MAX = 100;

/** 初始基础值(未加词条) */
export const BASE_ATTRS: Attributes = {
  strength: 8,
  agility: 8,
  constitution: 8,
  wisdom: 8,
  luck: 8,
  reputation: 0,
};

/** 开局可自由分配的初始属性点 */
export const INITIAL_POINTS = 12;
/** 每年获得的属性点 */
export const POINTS_PER_YEAR = 2;
/** 单次加点单项上限(防爆点) */
export const ALLOC_CAP_PER_ATTR = 5;

export function clampAttr(v: number): number {
  return Math.max(ATTR_MIN, Math.min(ATTR_MAX, Math.round(v)));
}

export function zeroAttrs(): Attributes {
  return { strength: 0, agility: 0, constitution: 0, wisdom: 0, luck: 0, reputation: 0 };
}

export function cloneAttrs(a: Attributes): Attributes {
  return { ...a };
}

/** 将一个偏量叠加到属性上并夹取到合法区间(返回新对象) */
export function applyMod(attrs: Attributes, mod: Partial<Attributes>): Attributes {
  const next = cloneAttrs(attrs);
  for (const k of ATTR_KEYS) {
    const delta = mod[k];
    if (typeof delta === 'number' && delta !== 0) {
      next[k] = clampAttr(next[k] + delta);
    }
  }
  return next;
}

/**
 * 校验并应用一次加点。返回新属性;若分配非法(超点/超上限/负数)抛错。
 * budget 为可用点数。
 */
export function applyAllocation(
  attrs: Attributes,
  alloc: Allocation,
  budget: number,
): Attributes {
  let spent = 0;
  for (const k of ATTR_KEYS) {
    const v = alloc[k];
    if (v === undefined) continue;
    if (!Number.isInteger(v) || v < 0) throw new Error(`加点必须是非负整数: ${k}=${v}`);
    if (v > ALLOC_CAP_PER_ATTR) throw new Error(`单项加点超过上限 ${ALLOC_CAP_PER_ATTR}: ${k}=${v}`);
    spent += v;
  }
  if (spent > budget) throw new Error(`加点超出可用点数: 用了 ${spent},仅有 ${budget}`);
  return applyMod(attrs, alloc);
}

/** 由根骨推导寿元(约 65~95) */
export function deriveLifespan(constitution: number, jitter = 0): number {
  const base = 65 + constitution * 0.3;
  return Math.round(base + jitter);
}

/** 综合战力(用于战斗类事件判定) */
export function combatPower(a: Attributes): number {
  return a.strength * 1.2 + a.agility * 1.0 + a.constitution * 0.8 + a.wisdom * 0.6;
}

/** 江湖地位(用于结局判定) */
export function renownScore(a: Attributes): number {
  return a.reputation * 1.5 + a.wisdom * 0.5 + combatPower(a) * 0.3;
}
