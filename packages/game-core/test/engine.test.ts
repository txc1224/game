import { describe, it, expect } from 'vitest';
import {
  TRAITS,
  rollTraits,
  startLife,
  advanceYear,
  resolveEnding,
  applyAllocation,
  BASE_ATTRS,
  INITIAL_POINTS,
  REROLL_MAX,
  type LifeState,
} from '../src/index.js';

describe('rollTraits', () => {
  it('抽取 3 条互不重复且都存在于词条表', () => {
    const { traits, rerollLeft } = rollTraits(3, { seed: 42 });
    expect(traits).toHaveLength(3);
    expect(rerollLeft).toBe(REROLL_MAX);
    const ids = traits.map((t) => t.id);
    expect(new Set(ids).size).toBe(3);
    for (const t of traits) {
      expect(TRAITS.find((x) => x.id === t.id)).toBeTruthy();
    }
  });

  it('相同 seed 可复现', () => {
    const a = rollTraits(3, { seed: 7 }).traits.map((t) => t.id);
    const b = rollTraits(3, { seed: 7 }).traits.map((t) => t.id);
    expect(a).toEqual(b);
  });

  it('词条都有合法稀有度与属性修正', () => {
    for (const t of TRAITS) {
      expect(['common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(t.rarity);
      expect(t.weight).toBeGreaterThan(0);
      expect(Object.keys(t.attrMod).length).toBeGreaterThan(0);
    }
  });
});

describe('startLife / applyAllocation', () => {
  it('词条修正叠加到基础属性上', () => {
    const s = startLife(['tian-sheng-shen-li'], {});
    expect(s.attrs.strength).toBe(BASE_ATTRS.strength + 12);
    expect(s.attrs.constitution).toBe(BASE_ATTRS.constitution + 4);
    expect(s.flags.has('mighty')).toBe(true);
  });

  it('初始加点受点数预算约束', () => {
    expect(() => applyAllocation(BASE_ATTRS, { strength: INITIAL_POINTS + 1 }, INITIAL_POINTS)).toThrow();
    const next = applyAllocation(BASE_ATTRS, { strength: 5, wisdom: 5 }, INITIAL_POINTS);
    expect(next.strength).toBe(BASE_ATTRS.strength + 5);
  });

  it('单项加点超过上限被拒绝', () => {
    expect(() => applyAllocation(BASE_ATTRS, { strength: 99 }, 999)).toThrow();
  });
});

describe('advanceYear 推进', () => {
  function runFull(seed: number): { state: LifeState; texts: string[] } {
    const state = startLife(['gu-er', 'cong-ming-ling-li'], { wisdom: 4, constitution: 4 });
    const texts: string[] = [];
    let guard = 0;
    while (!state.finished && guard < 200) {
      guard++;
      const r = advanceYear(state, {}, { seed: seed + state.age });
      texts.push(r.text);
    }
    return { state, texts };
  }

  it('年龄单调递增且每年产生叙述', () => {
    const state = startLife(['gu-er'], {});
    const r1 = advanceYear(state, {}, { seed: 1 });
    expect(r1.age).toBe(1);
    expect(r1.text.length).toBeGreaterThan(0);
    const r2 = advanceYear(state, {}, { seed: 2 });
    expect(r2.age).toBe(2);
  });

  it('整局最终落幕并给出结局', () => {
    const { state } = runFull(100);
    expect(state.finished).toBe(true);
    expect(state.ending).toBeTruthy();
    expect(state.ending!.title.length).toBeGreaterThan(0);
    expect(state.ending!.finalAge).toBe(state.age);
  });

  it('推进后 finished 的对局再推进会抛错', () => {
    const { state } = runFull(200);
    expect(() => advanceYear(state, {}, { seed: 1 })).toThrow();
  });

  it('幼年死亡会给出夭折结局', () => {
    const state = startLife(['gu-er'], {});
    state.attrs.constitution = 0; // 压低根骨触发旧伤复发
    state.age = 5;
    // 直接构造一个幼年死亡场景做 resolveEnding 判断
    const ending = resolveEnding({ ...state, age: 10 }, '测试死亡');
    expect(ending.id).toBe('died-young');
  });
});
