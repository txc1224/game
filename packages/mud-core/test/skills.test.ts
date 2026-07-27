import { describe, it, expect } from 'vitest';
import { newGame, exec, learnSkill, signatureSkillOf, type MudState } from '../src/index.js';

function strongPlayer(): MudState {
  const s = newGame('武学测试');
  // 拉高属性,让多数武功可学
  s.player.attrs = { strength: 40, agility: 40, constitution: 40, wisdom: 40, luck: 20, reputation: 10 };
  return s;
}

describe('武功系统', () => {
  it('learnSkill 习得武功并加属性', () => {
    const s = strongPlayer();
    const before = s.player.skills.length;
    const strBefore = s.player.attrs.strength;
    const r = learnSkill(s.player, 'xiahou-palm'); // 降龙十八掌 +9 臂力
    expect(r).toBeTruthy();
    expect(s.player.skills.length).toBe(before + 1);
    expect(s.player.attrs.strength).toBe(strBefore + 9);
  });

  it('已会的武功不可重复学', () => {
    const s = strongPlayer();
    learnSkill(s.player, 'jiuyang');
    const r = learnSkill(s.player, 'jiuyang');
    expect(r).toBeNull();
  });

  it('门槛不足不可学', () => {
    const s = newGame('弱者'); // 默认 attrs 全 10
    const r = learnSkill(s.player, 'jiuyang'); // 需 constitution>=28
    expect(r).toBeNull();
  });

  it('signatureSkillOf 返回最强武功', () => {
    const s = strongPlayer();
    learnSkill(s.player, 'shenxing'); // 神行百变
    learnSkill(s.player, 'jiuyang'); // 九阳(加成更高)
    const sig = signatureSkillOf(s.player);
    expect(sig?.id).toBe('jiuyang');
  });

  it('战斗招式文本使用最强武功名', () => {
    const s = strongPlayer();
    learnSkill(s.player, 'dugu-sword');
    // 强制战斗
    s.combat = { monster: { id: 'x', name: '木人', tier: 1, hp: 5, attack: 0, defense: 0, exp: 1, desc: '' }, monsterHp: 5 };
    exec(s, { type: 'attack' }, 5);
    const hit = s.log.some((l) => l.text.includes('独孤九剑'));
    expect(hit).toBe(true);
  });

  it('断魂崖探索可顿悟武功', () => {
    const s = strongPlayer();
    s.player.roomId = 'duan-hun-ya';
    let learned = false;
    // 多次探索,35% 概率顿悟
    for (let i = 0; i < 30 && !learned; i++) {
      const before = s.player.skills.length;
      exec(s, { type: 'explore' }, 5000 + i);
      if (s.player.skills.length > before) learned = true;
      // 若遭遇战斗则脱离
      s.combat = null;
    }
    expect(learned).toBe(true);
  });
});
