import { describe, it, expect } from 'vitest';
import {
  newBattle,
  playCard,
  endTurn,
  enemyIntent,
  seededRng,
  getCard,
  starterDeck,
  newRun,
  enterNode,
  nextOptions,
  makeReward,
  pickReward,
  restHeal,
  getEnemy,
  type BattleState,
} from '../src/index.js';

function battleWith(deck: string[], enemyId = 'shan-zei'): BattleState {
  return newBattle({ deck, enemy: getEnemy(enemyId), playerHp: 50, playerMaxHp: 50, rng: seededRng(42) });
}

describe('卡牌数据', () => {
  it('起始牌组 10 张', () => {
    expect(starterDeck()).toHaveLength(10);
  });
  it('卡牌效果字段合法', () => {
    for (const id of ['strike', 'defend', 'qingfeng']) {
      const c = getCard(id);
      expect(c.cost).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('战斗基础', () => {
  it('开局抽 5 张,能量满', () => {
    const s = battleWith(starterDeck());
    expect(s.hand.length).toBe(5);
    expect(s.player.energy).toBe(3);
    expect(s.turn).toBe(1);
  });

  it('出攻击牌扣能量并造成伤害', () => {
    const s = battleWith(['strike', 'strike', 'strike', 'strike', 'strike']);
    const enemyHpBefore = s.enemy.hp;
    const idx = s.hand.findIndex((c) => c === 'strike');
    const ok = playCard(s, idx);
    expect(ok).toBe(true);
    expect(s.player.energy).toBe(2);
    expect(s.enemy.hp).toBeLessThan(enemyHpBefore);
  });

  it('能量不足不能出牌', () => {
    const s = battleWith(['xudu', 'xudu']); // 2 费牌
    s.hand = ['xudu'];
    s.player.energy = 1;
    expect(playCard(s, 0)).toBe(false);
  });

  it('格挡减少受到的伤害', () => {
    const s = battleWith(['defend', 'defend', 'defend', 'defend', 'defend']);
    playCard(s, s.hand.findIndex((c) => c === 'defend')); // +5 格挡
    const hpBefore = s.player.hp;
    endTurn(s, seededRng(1));
    // 山贼攻 6,格挡 5,应受 1 点(易伤无)
    expect(s.player.hp).toBe(hpBefore - 1);
  });

  it('敌人意图可被读取', () => {
    const s = battleWith(starterDeck());
    const intent = enemyIntent(s);
    expect(['attack', 'defend', 'buff']).toContain(intent.kind);
    expect(intent.label.length).toBeGreaterThan(0);
  });

  it('击败敌人即胜利', () => {
    const s = battleWith(['dugujian', 'dugujian', 'dugujian']);
    s.player.energy = 99;
    s.hand = ['dugujian'];
    playCard(s, 0); // 28 伤,山贼 30 血 -> 不死,再补
    if (!s.over) { s.hand = ['dugujian']; playCard(s, 0); }
    expect(s.over).toBe(true);
    expect(s.victory).toBe(true);
  });

  it('玩家死亡即失败', () => {
    const s = battleWith(starterDeck());
    s.player.hp = 1;
    endTurn(s, seededRng(1));
    expect(s.over).toBe(true);
    expect(s.victory).toBe(false);
  });
});

describe('爬塔 run', () => {
  it('开局在 map 阶段,有节点', () => {
    const r = newRun(seededRng(1));
    expect(r.phase).toBe('map');
    expect(r.nodes.length).toBeGreaterThan(5);
  });

  it('战斗节点进入 combat,篝火进入 rest', () => {
    const r = newRun(seededRng(2));
    let sawCombat = false, sawRest = false;
    // 逐层选路推进(总能碰到 battle 与 rest/shop)
    for (let t = 0; t < 10 && (sawCombat === false || sawRest === false); t++) {
      const opts = nextOptions(r);
      if (opts.length === 0) break;
      // 优先选还没见过的类型
      const pick = opts.find((n) => (n.kind === 'rest' && !sawRest) || (n.kind === 'battle' && !sawCombat)) ?? opts[0]!;
      enterNode(r, pick.index, seededRng(t));
      if (pick.kind === 'rest') { sawRest = true; expect(r.phase).toBe('rest'); restHeal(r); }
      else if (pick.kind === 'battle') { sawCombat = true; expect(r.phase).toBe('combat'); r.phase = 'map'; }
      else r.phase = 'map';
    }
    expect(sawCombat).toBe(true);
    expect(sawRest).toBe(true);
  });

  it('胜利后给 3 张奖励牌,选牌入牌组', () => {
    const r = newRun(seededRng(3));
    const battleNode = nextOptions(r).find((n) => n.kind === 'battle')!;
    enterNode(r, battleNode.index, seededRng(3));
    expect(r.phase).toBe('combat');
    const deckBefore = r.deck.length;
    makeReward(r, seededRng(3));
    expect(r.phase).toBe('reward');
    expect(r.rewardCards.length).toBe(3);
    pickReward(r, r.rewardCards[0]!.id);
    expect(r.deck.length).toBe(deckBefore + 1);
    expect(r.phase).toBe('map');
  });

  it('精英掉遗物', () => {
    const r = newRun(seededRng(5));
    // 直接推进到一个精英节点
    let elite;
    for (let t = 0; t < 10 && !elite; t++) {
      const opts = nextOptions(r);
      elite = opts.find((n) => n.kind === 'elite');
      const pick = elite ?? opts[0]!;
      enterNode(r, pick.index, seededRng(t));
      if (pick.kind !== 'elite') r.phase = 'map';
    }
    expect(elite).toBeTruthy();
    r.phase = 'combat';
    makeReward(r, seededRng(5));
    expect(r.rewardRelic).toBeTruthy();
    pickReward(r, null);
    expect(r.relics.length).toBe(1);
  });

  it('通关 BOSS 后 phase=won', () => {
    const r = newRun(seededRng(7));
    // 把 nodeIndex 推进到 BOSS 节点(最后一个),模拟已到幕主
    r.nodeIndex = r.nodes.length - 1;
    r.phase = 'combat';
    makeReward(r, seededRng(7));
    pickReward(r, null);
    expect(r.phase).toBe('won');
  });
});
