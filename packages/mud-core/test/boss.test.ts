import { describe, it, expect } from 'vitest';
import { newGame, exec, getRoom, type MudState } from '../src/index.js';

function strongHero(): MudState {
  const s = newGame('大侠');
  s.player.attrs = { strength: 60, agility: 60, constitution: 60, wisdom: 60, luck: 30, reputation: 20 };
  s.player.hp = s.player.maxHp = 300;
  return s;
}

describe('主线:剿灭黑风寨', () => {
  it('非断魂崖不能挑战', () => {
    const s = strongHero();
    exec(s, { type: 'challenge' }, 1);
    expect(s.combat).toBeNull();
    expect(s.log[s.log.length - 1]!.text).toContain('断魂崖');
  });

  it('断魂崖可挑战寨主,触发 BOSS 战', () => {
    const s = strongHero();
    s.player.roomId = 'duan-hun-ya';
    exec(s, { type: 'challenge' }, 1);
    expect(s.combat).toBeTruthy();
    expect(s.combat!.isBoss).toBe(true);
    expect(s.combat!.monster.id).toBe('hei-feng-zhai-zhu');
  });

  it('击败寨主即通关(bossDefeated)', () => {
    const s = strongHero();
    s.player.roomId = 'duan-hun-ya';
    exec(s, { type: 'challenge' }, 1);
    s.combat!.monsterHp = 1; // 一刀就死
    exec(s, { type: 'attack' }, 5);
    expect(s.bossDefeated).toBe(true);
    expect(s.combat).toBeNull();
    const logText = s.log.map((l) => l.text).join('\n');
    expect(logText).toContain('通关');
    expect(logText).toContain('剿灭黑风寨');
  });

  it('通关后不可重复挑战', () => {
    const s = strongHero();
    s.player.roomId = 'duan-hun-ya';
    s.bossDefeated = true;
    exec(s, { type: 'challenge' }, 1);
    expect(s.combat).toBeNull();
  });

  it('断魂崖小怪池不再含寨主', () => {
    const room = getRoom('duan-hun-ya');
    expect(room.monsters).not.toContain('hei-feng-zhai-zhu');
  });
});

