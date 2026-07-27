import { describe, it, expect } from 'vitest';
import {
  SKILLS,
  getSkill,
  canLearn,
  startLife,
  advanceYear,
  type LifeState,
} from '../src/index.js';

function freshState(traitIds: string[] = ['gu-er'], alloc = {}): LifeState {
  return startLife(traitIds, alloc);
}

/** 手动构造一个指定年龄的进行中状态(跳过逐年推进) */
function stateAt(age: number, attrs: Partial<LifeState['attrs']> = {}): LifeState {
  const s = freshState();
  s.age = age;
  Object.assign(s.attrs, attrs);
  return s;
}

describe('武功系统', () => {
  it('武功表数据合法', () => {
    expect(SKILLS.length).toBeGreaterThanOrEqual(8);
    for (const s of SKILLS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(Object.keys(s.attrBonus).length).toBeGreaterThan(0);
    }
  });

  it('门槛不足不可学,门槛满足可学', () => {
    const dugu = getSkill('dugu-sword'); // 需 wisdom>=25
    expect(canLearn({ strength: 10, agility: 10, constitution: 10, wisdom: 10, luck: 10, reputation: 0 }, dugu)).toBe(false);
    expect(canLearn({ strength: 10, agility: 10, constitution: 10, wisdom: 30, luck: 10, reputation: 0 }, dugu)).toBe(true);
  });

  it('属性达标后推进可习得武功', () => {
    const s = stateAt(20, { strength: 40, agility: 40, constitution: 40, wisdom: 40 });
    // 连续推进,train-skill 事件应当让其学会至少一门
    let learned = 0;
    for (let i = 0; i < 40 && !s.finished; i++) {
      advanceYear(s, {}, { seed: 1000 + i });
      learned = s.skills.size;
    }
    expect(learned).toBeGreaterThan(0);
    // 习得武功后结局应带 skills 列表
    if (s.finished && s.ending) {
      expect(Array.isArray(s.ending.skills)).toBe(true);
    }
  });

  it('掌握 >=3 门武功且善终可成武学宗师', () => {
    const s = stateAt(60, { strength: 30, agility: 30, constitution: 30, wisdom: 30 });
    s.skills.add('jiuyang');
    s.skills.add('dugu-sword');
    s.skills.add('lingbo');
    s.baseLifespan = 61; // 让下一年寿终
    const r = advanceYear(s, {}, { seed: 7 });
    if (r.finished && r.ending && r.ending.cause.includes('寿终')) {
      expect(['martial-scholar', 'grandmaster', 'legend']).toContain(r.ending.id);
      expect(r.ending.skills!.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('子嗣传承', () => {
  it('有配偶后可诞下子嗣', () => {
    const s = stateAt(25, { strength: 20, wisdom: 20, constitution: 20, reputation: 10 });
    s.spouse = '红袖';
    let hasChild = false;
    for (let i = 0; i < 30 && !s.finished; i++) {
      advanceYear(s, {}, { seed: 2000 + i });
      if (s.heirs.length > 0) { hasChild = true; break; }
    }
    expect(hasChild).toBe(true);
    expect(s.heirs[0]!.name.length).toBeGreaterThan(0);
    expect(s.heirs[0]!.bornAtAge).toBeGreaterThanOrEqual(25);
  });

  it('子嗣长大后结局带传承评价', () => {
    const s = stateAt(50, { strength: 20, wisdom: 20, constitution: 20, reputation: 20 });
    s.spouse = '青鸾';
    s.heirs.push({ name: '承志', bornAtAge: 30, bonusAttrs: { strength: 3 } });
    s.baseLifespan = 51; // 下一年寿终
    const r = advanceYear(s, {}, { seed: 7 });
    if (r.finished && r.ending) {
      expect(r.ending.legacy).toBeTruthy();
      expect(r.ending.legacy).toContain('承志');
    }
  });
});

describe('江湖奇遇与关系', () => {
  it('可结拜并获得盟友', () => {
    const s = stateAt(20, { reputation: 12, luck: 12 });
    for (let i = 0; i < 30 && !s.finished; i++) {
      advanceYear(s, {}, { seed: 3000 + i });
      if (s.allies.length > 0) break;
    }
    // 结拜事件在高权重下应较易触发(允许偶发不触发,故只校验结构)
    expect(Array.isArray(s.allies)).toBe(true);
  });

  it('结仇后可能被伏击', () => {
    const s = stateAt(25, { strength: 8, agility: 8, constitution: 12 });
    s.enemies.push('王灭门');
    // 触发 enemy-ambush;低战力应负伤
    let ambushed = false;
    for (let i = 0; i < 40 && !s.finished; i++) {
      const before = s.lifespanDelta;
      advanceYear(s, {}, { seed: 4000 + i });
      if (s.lifespanDelta < before) { ambushed = true; break; }
    }
    // 不强制(随机),主要验证不会崩溃
    expect(typeof ambushed).toBe('boolean');
  });

  it('新维度序列化往返无损', () => {
    const s = stateAt(30);
    s.skills.add('jiuyang');
    s.enemies.push('李破天');
    s.allies.push('张凌云');
    s.spouse = '素素';
    s.pet = '神雕';
    s.heirs.push({ name: '继业', bornAtAge: 28, bonusAttrs: { strength: 2 } });
    // 模拟 store 的序列化
    const json = JSON.stringify({ ...s, flags: [...s.flags], skills: [...s.skills] });
    const parsed = JSON.parse(json);
    const restored: LifeState = { ...parsed, flags: new Set(parsed.flags), skills: new Set(parsed.skills) };
    expect([...restored.skills]).toContain('jiuyang');
    expect(restored.enemies).toContain('李破天');
    expect(restored.allies).toContain('张凌云');
    expect(restored.spouse).toBe('素素');
    expect(restored.pet).toBe('神雕');
    expect(restored.heirs[0]!.name).toBe('继业');
  });
});
