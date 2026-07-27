import { describe, it, expect } from 'vitest';
import {
  newGame,
  exec,
  getRoom,
  MONSTERS,
  readPastLife,
  type MudState,
} from '../src/index.js';

function fresh(): MudState {
  return newGame('测试侠客');
}

describe('世界与移动', () => {
  it('开局在青溪村且有出口', () => {
    const s = fresh();
    expect(s.player.roomId).toBe('qingxi-cun');
    const room = getRoom(s.player.roomId);
    expect(Object.keys(room.exits).length).toBeGreaterThan(0);
  });

  it('向有路的方向移动成功', () => {
    const s = fresh();
    exec(s, { type: 'go', dir: 'east' }, 1);
    expect(s.player.roomId).toBe('qing-shan');
  });

  it('向没路的方向移动被拒绝', () => {
    const s = fresh();
    exec(s, { type: 'go', dir: 'west' }, 1);
    expect(s.player.roomId).toBe('qingxi-cun');
  });

  it('安全区不遭遇怪物', () => {
    const s = fresh();
    for (let i = 0; i < 20; i++) {
      const t = newGame('测试');
      exec(t, { type: 'explore' }, i);
      expect(t.combat).toBeNull();
    }
  });
});

describe('战斗', () => {
  function forceCombat(): MudState {
    const s = fresh();
    exec(s, { type: 'go', dir: 'east' }, 1); // 青山
    // 强制塞一场战斗
    s.combat = { monster: MONSTERS['ye-zhu']!, monsterHp: MONSTERS['ye-zhu']!.hp };
    return s;
  }

  it('攻击减少怪物气血', () => {
    const s = forceCombat();
    const before = s.combat!.monsterHp;
    exec(s, { type: 'attack' }, 5);
    expect(s.combat === null || s.combat.monsterHp < before).toBe(true);
  });

  it('击败怪物获得阅历', () => {
    const s = forceCombat();
    s.combat!.monsterHp = 1; // 一刀就死
    const expBefore = s.player.exp;
    exec(s, { type: 'attack' }, 5);
    expect(s.combat).toBeNull();
    expect(s.player.exp).toBeGreaterThan(expBefore);
  });

  it('战斗中不能移动', () => {
    const s = forceCombat();
    exec(s, { type: 'go', dir: 'west' }, 5);
    expect(s.player.roomId).toBe('qing-shan'); // 还在原地
  });

  it('玩家死亡后 dead=true 且无法继续', () => {
    const s = forceCombat();
    s.player.hp = 1;
    s.player.attrs.agility = 0; // 不闪避
    const boss = { ...MONSTERS['hei-feng-zhai-zhu']!, hp: 9999 }; // 锁血,玩家杀不死
    s.combat = { monster: boss, monsterHp: 9999 };
    // 反复挨打直到死亡
    for (let i = 0; i < 50 && !s.dead; i++) exec(s, { type: 'attack' }, i);
    expect(s.dead).toBe(true);
    exec(s, { type: 'attack' }, 99);
    expect(s.log[s.log.length - 1]!.text).toContain('重新来过');
  });
});

describe('物品与 NPC', () => {
  it('使用金疮药回血', () => {
    const s = fresh();
    s.player.hp = 10;
    exec(s, { type: 'use', itemId: 'jin-chuang-yao' }, 1);
    expect(s.player.hp).toBeGreaterThan(10);
  });

  it('装备武器', () => {
    const s = fresh();
    s.player.inventory['kuang-dao'] = 1;
    exec(s, { type: 'equip', itemId: 'kuang-dao' }, 1);
    expect(s.player.weaponId).toBe('kuang-dao');
  });

  it('安全区休息回满', () => {
    const s = fresh();
    s.player.hp = 5;
    exec(s, { type: 'rest' }, 1);
    expect(s.player.hp).toBe(s.player.maxHp);
  });

  it('郎中免费治疗', () => {
    const s = fresh();
    s.player.hp = 3;
    exec(s, { type: 'talk', npcId: 'lang-zhong' }, 1);
    expect(s.player.hp).toBe(s.player.maxHp);
  });
});

describe('彩蛋桥接', () => {
  it('无 localStorage 时返回 null(非浏览器环境)', () => {
    expect(readPastLife()).toBeNull();
  });
});
