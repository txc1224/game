import { describe, it, expect } from 'vitest';
import { newBattle, playCard, endTurn, seededRng, getCard, getEnemy, type BattleState } from '../src/index.js';

function battle(deck: string[], enemyId = 'shan-zei'): BattleState {
  return newBattle({ deck, enemy: getEnemy(enemyId), playerHp: 60, playerMaxHp: 60, rng: seededRng(42) });
}

function forceHand(s: BattleState, cards: string[]): void {
  s.hand = [...cards];
  s.player.energy = 99; // 免除能量限制测机制
}

describe('新机制:多段/毒/格挡转伤害/X费', () => {
  it('多段攻击(hits)按次数结算', () => {
    const s = battle(['jianyu', 'jianyu', 'jianyu']);
    forceHand(s, ['jianyu']); // 剑雨 4x4
    const before = s.enemy.hp;
    playCard(s, 0, [], seededRng(1));
    // 4 段 × 4 伤,无格挡应打 16
    expect(before - s.enemy.hp).toBe(16);
  });

  it('多段攻击会被敌人格挡逐段扣减', () => {
    const s = battle(['jianyu'], 'tie-bu-shan');
    forceHand(s, ['jianyu']);
    s.enemy.block = 6; // 格挡 6,第一段先扣
    const before = s.enemy.hp;
    playCard(s, 0, [], seededRng(1));
    // 第1段 4 伤全被格挡(剩2),第2段 4 伤格挡2+打2,后两段各4
    expect(before - s.enemy.hp).toBe(2 + 4 + 4);
  });

  it('毒(poison)回合末结算并递减', () => {
    const s = battle(['wudu', 'wudu']);
    forceHand(s, ['wudu']); // 8 层毒
    playCard(s, 0, [], seededRng(1));
    expect(s.enemy.poison).toBe(8);
    const hpBefore = s.enemy.hp;
    endTurn(s, seededRng(2));
    expect(s.enemy.hp).toBe(hpBefore - 8); // 毒发 8 伤
    expect(s.enemy.poison).toBe(7); // 递减
  });

  it('格挡转伤害(blockToDamage)按当前格挡结算', () => {
    const s = battle(['tiejia', 'jinzhong']);
    forceHand(s, ['tiejia', 'jinzhong']);
    playCard(s, s.hand.indexOf('tiejia'), [], seededRng(1)); // +14 格挡
    expect(s.player.block).toBe(14);
    const before = s.enemy.hp;
    playCard(s, s.hand.indexOf('jinzhong'), [], seededRng(1)); // 反震 14
    expect(before - s.enemy.hp).toBe(14);
  });

  it('格挡转伤害无格挡时无效', () => {
    const s = battle(['jinzhong']);
    forceHand(s, ['jinzhong']);
    const before = s.enemy.hp;
    playCard(s, 0, [], seededRng(1));
    expect(s.enemy.hp).toBe(before);
  });

  it('X费牌(乾坤一掷)耗尽全部能量按能量数结算', () => {
    const s = battle(['qankun'], 'tie-bu-shan'); // 铁布衫 50 血,40 伤打不死,便于看 hp 差
    forceHand(s, ['qankun']);
    s.player.energy = 5;
    const before = s.enemy.hp;
    playCard(s, 0, [], seededRng(1)); // 5 能量 × 8 伤 = 40
    expect(s.player.energy).toBe(0);
    expect(before - s.enemy.hp).toBe(40);
  });

  it('X费牌无能量时不能出', () => {
    const s = battle(['qankun']);
    forceHand(s, ['qankun']);
    s.player.energy = 0;
    expect(playCard(s, 0, [], seededRng(1))).toBe(false);
  });

  it('新卡牌池数据合法(30 张左右)', () => {
    const pool = ['jianyu','qijue','jinzhong','kuangquan','poshan','shexin','wudu','qankun','tianmo','longxiang','beiming','juhui','houji','tiejia','chuanxin','luanshi'];
    for (const id of pool) {
      const c = getCard(id);
      expect(c).toBeTruthy();
      expect(c.name.length).toBeGreaterThan(0);
    }
  });
});
