import { describe, it, expect } from 'vitest';
import {
  newInn,
  tick,
  hireStaff,
  learnRecipe,
  completeOrder,
  availableOrders,
  incomePerSec,
  levelOf,
  serializeInn,
  deserializeInn,
} from '../src/index.js';

describe('客栈经营', () => {
  it('开局有本钱与基础菜谱', () => {
    const s = newInn(0);
    expect(s.silver).toBeGreaterThan(0);
    expect(s.recipes.length).toBeGreaterThan(0);
  });

  it('tick 按时间产出银两', () => {
    const s = newInn(0);
    const before = s.silver;
    tick(s, 10000); // 10 秒
    expect(s.silver).toBeGreaterThan(before);
  });

  it('离线收益封顶 8 小时', () => {
    const s = newInn(0);
    const gain = tick(s, 24 * 3600 * 1000); // 24 小时
    // 实际只按 8 小时计
    expect(gain).toBeLessThanOrEqual(incomePerSec(s) * 8 * 3600 + 1);
  });

  it('雇伙计提升产出', () => {
    const s = newInn(0);
    s.silver = 1000;
    const before = incomePerSec(s);
    expect(hireStaff(s, 'huoji')).toBe(true);
    expect(incomePerSec(s)).toBeGreaterThan(before);
  });

  it('钱不够不能雇', () => {
    const s = newInn(0);
    s.silver = 10;
    expect(hireStaff(s, 'mingchu')).toBe(false);
  });

  it('研菜谱升口碑与等级', () => {
    const s = newInn(0);
    s.silver = 1000;
    const before = s.renown;
    expect(learnRecipe(s, 'hongshao')).toBe(true);
    expect(s.renown).toBe(before + 5);
  });

  it('口碑等级计算', () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(6)).toBe(2);
    expect(levelOf(22)).toBe(3);
    expect(levelOf(40)).toBe(4);
    expect(levelOf(60)).toBe(5);
  });

  it('订单需口碑门槛,完成得报酬', () => {
    const s = newInn(0);
    s.renown = 10;
    const avail = availableOrders(s);
    expect(avail.some((o) => o.id === 'shaolin')).toBe(true);
    expect(avail.some((o) => o.id === 'wulin-meng')).toBe(false);
    const before = s.silver;
    expect(completeOrder(s, 'shaolin')).toBe(true);
    expect(s.silver).toBe(before + 200);
    // 不可重复完成
    expect(completeOrder(s, 'shaolin')).toBe(false);
  });

  it('序列化往返无损', () => {
    const s = newInn(0);
    s.silver = 500;
    hireStaff(s, 'huoji');
    learnRecipe(s, 'hongshao');
    const restored = deserializeInn(serializeInn(s));
    expect(restored).toBeTruthy();
    expect(restored!.silver).toBe(s.silver);
    expect(restored!.staff).toEqual(s.staff);
    expect(restored!.renown).toBe(s.renown);
  });
});
