import { getCard, type Card, type Enemy } from './data.js';

export interface Rng {
  next(): number;
}
export const defaultRng: Rng = { next: () => Math.random() };
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** 战斗中的玩家 */
export interface Fighter {
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  maxEnergy: number;
  strength: number;
  vulnerable: number; // 易伤回合数
  weak: number; // 虚弱回合数
}

export interface BattleLog {
  text: string;
  kind: 'info' | 'player' | 'enemy' | 'good' | 'bad' | 'system';
}

export interface BattleState {
  player: Fighter;
  enemy: Fighter & { def: Enemy; moveIndex: number };
  /** 牌堆(抽牌) */
  drawPile: string[];
  /** 手牌 */
  hand: string[];
  /** 弃牌堆 */
  discardPile: string[];
  /** 本场已耗能出牌数(供酒葫芦) */
  cardsPlayedThisTurn: number;
  turn: number;
  over: boolean;
  victory: boolean;
  log: BattleLog[];
}

function log(s: BattleState, text: string, kind: BattleLog['kind']): void {
  s.log.push({ text, kind });
}

function shuffle(arr: string[], rng: Rng): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function newBattle(opts: {
  deck: string[];
  enemy: Enemy;
  playerHp: number;
  playerMaxHp: number;
  relicIds?: string[];
  rng?: Rng;
}): BattleState {
  const rng = opts.rng ?? defaultRng;
  const relics = new Set(opts.relicIds ?? []);
  const startBlock = relics.has('xuan-tie') ? 6 : 0;
  const startStr = relics.has('zhan-yi') ? 1 : 0;
  const s: BattleState = {
    player: { hp: opts.playerHp, maxHp: opts.playerMaxHp, block: startBlock, energy: 0, maxEnergy: 3, strength: startStr, vulnerable: 0, weak: 0 },
    enemy: { hp: opts.enemy.maxHp, maxHp: opts.enemy.maxHp, block: 0, energy: 0, maxEnergy: 0, strength: 0, vulnerable: 0, weak: 0, def: opts.enemy, moveIndex: 0 },
    drawPile: shuffle(opts.deck, rng),
    hand: [],
    discardPile: [],
    cardsPlayedThisTurn: 0,
    turn: 0,
    over: false,
    victory: false,
    log: [],
  };
  log(s, `⚔️ 遭遇【${opts.enemy.name}】(气血 ${opts.enemy.maxHp})!${opts.enemy.isBoss ? '这是幕主!' : opts.enemy.isElite ? '强敌!' : ''}`, 'system');
  startTurn(s, rng, relics);
  return s;
}

function drawCards(s: BattleState, n: number, rng: Rng): void {
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length === 0) {
      if (s.discardPile.length === 0) break;
      s.drawPile = shuffle(s.discardPile, rng);
      s.discardPile = [];
    }
    const c = s.drawPile.pop();
    if (c) s.hand.push(c);
  }
}

function startTurn(s: BattleState, rng: Rng, relics: Set<string>): void {
  s.turn += 1;
  s.cardsPlayedThisTurn = 0;
  s.player.block = relics.has('xuan-tie') ? 6 : 0; // 每回合格挡重置(玄铁护符保底)
  s.player.energy = s.player.maxEnergy;
  drawCards(s, 5, rng);
  log(s, `— 第 ${s.turn} 回合 — 抽 5 张牌,能量 ${s.player.energy}/${s.player.maxEnergy}`, 'system');
}

/** 敌人当前意图(给玩家看) */
export function enemyIntent(s: BattleState): { kind: string; value: number; label: string } {
  const move = s.enemy.def.moves[s.enemy.moveIndex % s.enemy.def.moves.length]!;
  let value = move.value;
  if (move.kind === 'attack') {
    value += s.enemy.strength;
    if (s.enemy.weak > 0) value = Math.max(0, Math.round(value * 0.75));
  }
  return { kind: move.kind, value, label: move.label };
}

/** 打出一张手牌(按手牌索引)。返回是否成功。 */
export function playCard(s: BattleState, handIndex: number, relicIds: string[] = [], rng: Rng = defaultRng): boolean {
  if (s.over) return false;
  const cardId = s.hand[handIndex];
  if (!cardId) return false;
  const card = getCard(cardId);
  const relics = new Set(relicIds);

  let cost = card.cost;
  // 酒葫芦:每回合第一次出牌 +1 能量(等效本次免费一档,简化:本回合首张牌若费>=1则-1)
  if (relics.has('jiu-hu') && s.cardsPlayedThisTurn === 0 && cost >= 1) cost -= 1;
  if (s.player.energy < cost) return false;

  s.player.energy -= cost;
  s.cardsPlayedThisTurn += 1;
  s.hand.splice(handIndex, 1);
  s.discardPile.push(cardId);

  const parts: string[] = [];
  if (card.damage) {
    let raw = card.damage + s.player.strength;
    if (s.enemy.vulnerable > 0) raw = Math.round(raw * 1.5);
    // 先扣敌人格挡,剩余伤害打血;格挡单层扣减
    const absorbed = Math.min(s.enemy.block, raw);
    s.enemy.block -= absorbed;
    const dmg = raw - absorbed;
    s.enemy.hp -= dmg;
    parts.push(absorbed > 0 ? `破开 ${absorbed} 点格挡,造成 ${dmg} 点伤害` : `造成 ${dmg} 点伤害`);
  }
  if (card.block) {
    s.player.block += card.block;
    parts.push(`获得 ${card.block} 点格挡`);
  }
  if (card.strength) { s.player.strength += card.strength; parts.push(`力量 +${card.strength}`); }
  if (card.vulnerable) { s.enemy.vulnerable += card.vulnerable; parts.push(`易伤 ${card.vulnerable} 回合`); }
  if (card.weak) { s.enemy.weak += card.weak; parts.push(`虚弱 ${card.weak} 回合`); }
  if (card.energy) { s.player.energy += card.energy; parts.push(`能量 +${card.energy}`); }
  if (card.draw) { drawCards(s, card.draw, rng); parts.push(`抽 ${card.draw} 张`); }

  log(s, `你打出【${card.name}】${parts.length ? ':' + parts.join(',') : ''}`, 'player');

  if (s.enemy.hp <= 0) {
    s.enemy.hp = 0;
    s.over = true;
    s.victory = true;
    log(s, `✅ 你击败了【${s.enemy.def.name}】!`, 'good');
  }
  return true;
}

/** 结束回合:敌人行动,然后开始新回合。 */
export function endTurn(s: BattleState, rng: Rng = defaultRng, relicIds: string[] = []): void {
  if (s.over) return;
  // 弃掉手牌
  s.discardPile.push(...s.hand);
  s.hand = [];

  // 敌人行动
  const intent = enemyIntent(s);
  const move = s.enemy.def.moves[s.enemy.moveIndex % s.enemy.def.moves.length]!;
  if (move.kind === 'attack') {
    let dmg = intent.value; // 已含 strength/weak
    if (s.player.vulnerable > 0) dmg = Math.round(dmg * 1.5);
    const absorbed = Math.min(s.player.block, dmg);
    s.player.block -= absorbed;
    const through = dmg - absorbed;
    s.player.hp -= through;
    log(s, `${s.enemy.def.name}使出【${move.label}】,${absorbed > 0 ? `格挡 ${absorbed} 点,` : ''}你受 ${through} 点伤害`, 'enemy');
  } else if (move.kind === 'defend') {
    s.enemy.block += move.value;
    log(s, `${s.enemy.def.name}【${move.label}】,获得 ${move.value} 点格挡`, 'enemy');
  } else if (move.kind === 'buff') {
    s.enemy.strength += move.value;
    log(s, `${s.enemy.def.name}【${move.label}】,力量 +${move.value}`, 'enemy');
  }
  s.enemy.moveIndex += 1;

  // 减益回合递减
  if (s.player.vulnerable > 0) s.player.vulnerable -= 1;
  if (s.player.weak > 0) s.player.weak -= 1;
  if (s.enemy.vulnerable > 0) s.enemy.vulnerable -= 1;
  if (s.enemy.weak > 0) s.enemy.weak -= 1;

  // 双方格挡在回合末清零(杀戮尖塔规则:格挡不跨回合累积,防止永远打不动)
  s.enemy.block = 0;

  if (s.player.hp <= 0) {
    s.player.hp = 0;
    s.over = true;
    s.victory = false;
    log(s, `你不敌【${s.enemy.def.name}】,倒在了血泊中……`, 'bad');
    return;
  }
  startTurn(s, rng, new Set(relicIds));
}
