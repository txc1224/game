import { ENEMIES, RELICS, rollCardReward, starterDeck, type Card, type Enemy, type Relic } from './data.js';
import { defaultRng, type Rng } from './battle.js';

/** 节点类型 */
export type NodeKind = 'battle' | 'elite' | 'rest' | 'boss';
export interface MapNode {
  index: number;
  kind: NodeKind;
  label: string;
  enemyId?: string;
}

export type RunPhase = 'map' | 'combat' | 'reward' | 'rest' | 'won' | 'lost';

export interface RunState {
  deck: string[];
  hp: number;
  maxHp: number;
  gold: number;
  relics: string[];
  nodes: MapNode[];
  nodeIndex: number; // 当前所在节点(下一个要打的是 nodeIndex+1)
  phase: RunPhase;
  /** 战斗奖励候选牌(待选) */
  rewardCards: Card[];
  /** 本节点奖励的遗物(精英) */
  rewardRelic?: Relic;
  log: { text: string; kind: string }[];
}

const ACT_NORMAL = ['shan-zei', 'ye-zhu', 'fei-zei'];
const ACT_ELITE = ['du-she-wang', 'tie-bu-shan'];
const ACT_BOSS = ['hei-feng-zhai-zhu'];

function buildNodes(rng: Rng): MapNode[] {
  const nodes: MapNode[] = [];
  let i = 0;
  // 3 幕结构:战斗x2, 精英, 战斗, 篝火, 战斗, 精英, 战斗, 篝火, BOSS
  const layout: NodeKind[] = ['battle', 'battle', 'elite', 'battle', 'rest', 'battle', 'elite', 'battle', 'rest', 'boss'];
  for (const kind of layout) {
    let enemyId: string | undefined;
    let label = '';
    if (kind === 'battle') { enemyId = ACT_NORMAL[Math.floor(rng.next() * ACT_NORMAL.length)]; label = '小喽啰'; }
    else if (kind === 'elite') { enemyId = ACT_ELITE[Math.floor(rng.next() * ACT_ELITE.length)]; label = '精英'; }
    else if (kind === 'rest') { label = '篝火'; }
    else if (kind === 'boss') { enemyId = ACT_BOSS[0]; label = '幕主'; }
    nodes.push({ index: i++, kind, label, enemyId });
  }
  return nodes;
}

export function newRun(rng: Rng = defaultRng): RunState {
  const nodes = buildNodes(rng);
  return {
    deck: starterDeck(),
    hp: 70,
    maxHp: 70,
    gold: 50,
    relics: [],
    nodes,
    nodeIndex: -1,
    phase: 'map',
    rewardCards: [],
    log: [{ text: '你踏入黑风塔,塔高十层,顶层便是黑风寨主。一路杀上去吧。', kind: 'system' }],
  };
}

export function currentNode(s: RunState): MapNode | null {
  const next = s.nodeIndex + 1;
  return next < s.nodes.length ? s.nodes[next]! : null;
}

export function getEnemy(enemyId: string): Enemy {
  const e = ENEMIES[enemyId];
  if (!e) throw new Error(`未知敌人: ${enemyId}`);
  return e;
}

/** 进入下一节点,返回节点(战斗节点由调用方开战) */
export function advanceNode(s: RunState, rng: Rng = defaultRng): MapNode | null {
  const node = currentNode(s);
  if (!node) { s.phase = 'won'; return null; }
  s.nodeIndex += 1;
  if (node.kind === 'rest') {
    s.phase = 'rest';
    s.log.push({ text: '你在篝火旁歇息,可疗伤(恢复 30% 气血)。', kind: 'system' });
  } else {
    s.phase = 'combat';
    const e = getEnemy(node.enemyId!);
    s.log.push({ text: `第 ${node.index + 1} 层:遭遇【${e.name}】!`, kind: 'system' });
  }
  return node;
}

/** 篝火休息 */
export function restHeal(s: RunState): void {
  const heal = Math.round(s.maxHp * 0.3);
  s.hp = Math.min(s.maxHp, s.hp + heal);
  s.log.push({ text: `你烤了烤火,恢复 ${heal} 点气血。(气血 ${s.hp}/${s.maxHp})`, kind: 'good' });
  s.phase = 'map';
}

/** 战斗胜利后生成奖励(3 选 1 牌;精英掉遗物) */
export function makeReward(s: RunState, rng: Rng = defaultRng): void {
  s.rewardCards = rollCardReward(rng, 3);
  const node = s.nodes[s.nodeIndex];
  if (node?.kind === 'elite') {
    const relicIds = Object.keys(RELICS).filter((id) => !s.relics.includes(id));
    if (relicIds.length > 0) {
      const id = relicIds[Math.floor(rng.next() * relicIds.length)]!;
      s.rewardRelic = RELICS[id];
    }
  }
  s.phase = 'reward';
}

/** 选择一张奖励牌加入牌组(或跳过) */
export function pickReward(s: RunState, cardId: string | null): void {
  if (cardId) {
    s.deck.push(cardId);
    s.log.push({ text: `你将【${s.rewardCards.find((c) => c.id === cardId)?.name ?? cardId}】收入牌组。`, kind: 'good' });
  }
  if (s.rewardRelic) {
    s.relics.push(s.rewardRelic.id);
    if (s.rewardRelic.id === 'bai-yu') { s.maxHp += 15; s.hp += 15; }
    s.log.push({ text: `获得遗物【${s.rewardRelic.name}】——${s.rewardRelic.desc}`, kind: 'good' });
    s.rewardRelic = undefined;
  }
  s.rewardCards = [];
  // 是否已到 BOSS 后(通关)
  const node = s.nodes[s.nodeIndex];
  if (node?.kind === 'boss') {
    s.phase = 'won';
    s.log.push({ text: '🎉 你击败了黑风寨主,黑风塔重归太平!江湖又添一段传说。', kind: 'good' });
  } else {
    s.phase = 'map';
  }
}

/** 战斗失败 */
export function runLost(s: RunState): void {
  s.phase = 'lost';
  s.log.push({ text: '你倒在了黑风塔中。重整旗鼓,再来一世吧。', kind: 'bad' });
}
