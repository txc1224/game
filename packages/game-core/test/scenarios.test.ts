import { describe, it, expect } from 'vitest';
import {
  SCENARIOS,
  getScenario,
  rollTraits,
  startLife,
  advanceYear,
  resolveEnding,
} from '../src/index.js';

describe('剧本系统', () => {
  it('有三个剧本且结构合法', () => {
    expect(SCENARIOS.length).toBe(3);
    for (const s of SCENARIOS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.baseFlag.length).toBeGreaterThan(0);
    }
  });

  it('剑客剧本的词条池含专属词条', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const { traits } = rollTraits(3, { seed: i, scenario: 'swordsman' });
      traits.forEach((t) => ids.add(t.id));
    }
    // 应能抽到剑客专属词条(剑冢遗孤/孤狼之性/剑心通明/浪客命格 至少一个)
    const has = ['sword-orphan', 'lone-wolf', 'sword-heart', 'wanderer-fate'].some((id) => ids.has(id));
    expect(has).toBe(true);
  });

  it('剧本开局带基调 flag 与属性倾向', () => {
    const s = startLife(['sword-orphan'], {}, { scenario: 'swordsman' });
    expect(s.flags.has('scenario-swordsman')).toBe(true);
    expect(s.flags.has('sword-soul')).toBe(true);
  });

  it('刺客剧本可用专属词条开局', () => {
    const s = startLife(['shadow-born', 'night-walker'], {}, { scenario: 'assassin' });
    expect(s.flags.has('scenario-assassin')).toBe(true);
    expect(s.flags.has('shadow')).toBe(true);
    expect(s.flags.has('night')).toBe(true);
  });

  it('独行剑客达成剑仙结局', () => {
    const s = startLife(['sword-heart'], {}, { scenario: 'swordsman' });
    s.age = 70;
    const ending = resolveEnding(s, '寿终正寝,无疾而终');
    expect(ending.id).toBe('sword-immortal');
    expect(ending.title).toBe('剑仙');
  });

  it('快意刺客达成刺客之王结局', () => {
    const s = startLife(['kill-heart'], {}, { scenario: 'assassin' });
    s.age = 65;
    const ending = resolveEnding(s, '寿终正寝,无疾而终');
    expect(ending.id).toBe('assassin-king');
    expect(ending.title).toBe('刺客之王');
  });

  it('不传剧本走原逻辑(仗剑江湖)', () => {
    const s = startLife(['gu-er'], {});
    expect(s.flags.has('scenario-jianghu')).toBe(false);
    // 推进正常
    const r = advanceYear(s, {}, { seed: 1 });
    expect(r.age).toBe(1);
  });
});
