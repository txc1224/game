import { CARD_POOL, ENEMIES, RELICS, getCard, rollCardReward, starterDeck, type Card, type Enemy, type Relic } from './data.js';
import { defaultRng, type Rng } from './battle.js';

/** 节点类型 */
export type NodeKind = 'battle' | 'elite' | 'rest' | 'boss' | 'shop' | 'event';
export interface MapNode {
  index: number;
  kind: NodeKind;
  label: string;
  enemyId?: string;
  /** 分叉:本节点可去的下一层节点 index 列表(空=终点) */
  next: number[];
  /** 所在层数(用于地图布局) */
  tier: number;
}

export type RunPhase = 'map' | 'combat' | 'reward' | 'rest' | 'shop' | 'event' | 'won' | 'lost';

export interface RunState {
  deck: string[];
  hp: number;
  maxHp: number;
  gold: number;
  relics: string[];
  nodes: MapNode[];
  nodeIndex: number; // 当前所在节点(-1=未出发)
  phase: RunPhase;
  /** 战斗奖励候选牌(待选) */
  rewardCards: Card[];
  /** 本节点奖励的遗物(精英/事件) */
  rewardRelic?: Relic;
  /** 商店货品 */
  shopStock?: ShopItem[];
  /** 当前事件 */
  activeEvent?: GameEvent;
  /** 已升级过的牌 id 集 */
  upgraded: Set<string>;
  log: { text: string; kind: string }[];
}

const ACT_NORMAL = ['shan-zei', 'ye-zhu', 'fei-zei'];
const ACT_ELITE = ['du-she-wang', 'tie-bu-shan'];
const ACT_BOSS = ['hei-feng-zhai-zhu'];

/** 构建分叉塔:逐层生成,每层 1-2 个节点,玩家选路 */
function buildNodes(rng: Rng): MapNode[] {
  const nodes: MapNode[] = [];
  // 层结构(每层的节点类型池):boss 收尾
  const tierPools: NodeKind[][] = [
    ['battle'],
    ['battle', 'event'],
    ['battle', 'elite'],
    ['rest', 'shop'],
    ['battle', 'event'],
    ['elite', 'battle'],
    ['rest', 'shop'],
    ['battle', 'event'],
    ['elite', 'rest'],
    ['boss'],
  ];
  // 生成节点
  const tiers: number[][] = []; // 每层节点的全局 index
  for (let t = 0; t < tierPools.length; t++) {
    const pool = tierPools[t]!;
    const idxs: number[] = [];
    for (const kind of pool) {
      let enemyId: string | undefined;
      let label = '';
      if (kind === 'battle') { enemyId = ACT_NORMAL[Math.floor(rng.next() * ACT_NORMAL.length)]; label = '小喽啰'; }
      else if (kind === 'elite') { enemyId = ACT_ELITE[Math.floor(rng.next() * ACT_ELITE.length)]; label = '精英'; }
      else if (kind === 'rest') { label = '篝火'; }
      else if (kind === 'shop') { label = '货郎'; }
      else if (kind === 'event') { label = '奇遇'; }
      else if (kind === 'boss') { enemyId = ACT_BOSS[0]; label = '幕主'; }
      idxs.push(nodes.length);
      nodes.push({ index: nodes.length, kind, label, enemyId, next: [], tier: t });
    }
    tiers.push(idxs);
  }
  // 连边:每层节点连到下一层全部节点(分叉)
  for (let t = 0; t < tiers.length - 1; t++) {
    for (const from of tiers[t]!) {
      nodes[from]!.next = [...tiers[t + 1]!];
    }
  }
  return nodes;
}

export function newRun(rng: Rng = defaultRng): RunState {
  const nodes = buildNodes(rng);
  return {
    deck: starterDeck(),
    hp: 70,
    maxHp: 70,
    gold: 60,
    relics: [],
    nodes,
    nodeIndex: -1,
    phase: 'map',
    rewardCards: [],
    upgraded: new Set(),
    log: [{ text: '你踏入黑风塔,塔高十层,顶层便是黑风寨主。每层可自行选路,一路杀上去吧。', kind: 'system' }],
  };
}

/** 当前可去的下一层节点(分叉选项) */
export function nextOptions(s: RunState): MapNode[] {
  if (s.nodeIndex === -1) {
    // 未出发:第 0 层全部节点
    return s.nodes.filter((n) => n.tier === 0);
  }
  const cur = s.nodes[s.nodeIndex];
  if (!cur) return [];
  return cur.next.map((i) => s.nodes[i]!);
}

export function currentNode(s: RunState): MapNode | null {
  return s.nodeIndex >= 0 ? s.nodes[s.nodeIndex]! : null;
}

export function getEnemy(enemyId: string): Enemy {
  const e = ENEMIES[enemyId];
  if (!e) throw new Error(`未知敌人: ${enemyId}`);
  return e;
}

/** 进入指定节点(从 nextOptions 里选) */
export function enterNode(s: RunState, nodeIndex: number, rng: Rng = defaultRng): MapNode | null {
  const options = nextOptions(s);
  const node = options.find((n) => n.index === nodeIndex);
  if (!node) return null;
  s.nodeIndex = nodeIndex;
  switch (node.kind) {
    case 'rest':
      s.phase = 'rest';
      s.log.push({ text: '你在篝火旁歇息,可疗伤(恢复 30% 气血)。', kind: 'system' });
      break;
    case 'shop':
      s.phase = 'shop';
      s.shopStock = buildShop(s, rng);
      s.log.push({ text: '你遇到一个游方货郎,货架上琳琅满目。', kind: 'system' });
      break;
    case 'event':
      s.phase = 'event';
      s.activeEvent = rollEvent(s, rng);
      s.log.push({ text: `【奇遇】${s.activeEvent.text}`, kind: 'system' });
      break;
    default: {
      s.phase = 'combat';
      const e = getEnemy(node.enemyId!);
      s.log.push({ text: `第 ${node.tier + 1} 层:遭遇【${e.name}】!`, kind: 'system' });
    }
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
  // 战斗得金币
  const goldGain = node?.kind === 'elite' ? 25 : node?.kind === 'boss' ? 50 : 12;
  s.gold += goldGain;
  s.log.push({ text: `缴获 ${goldGain} 两银子。`, kind: 'good' });
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

// ==================== 商店 ====================
export interface ShopItem {
  kind: 'card' | 'relic' | 'remove' | 'heal';
  cardId?: string;
  relicId?: string;
  price: number;
  label: string;
  sold: boolean;
}

function buildShop(s: RunState, rng: Rng): ShopItem[] {
  const stock: ShopItem[] = [];
  // 3 张牌(非 basic)
  const cards = rollCardReward(rng, 3);
  for (const c of cards) {
    const price = c.rarity === 'rare' ? 55 : c.rarity === 'uncommon' ? 38 : 22;
    stock.push({ kind: 'card', cardId: c.id, price, label: `${c.name}(${c.rarity === 'rare' ? '稀有' : c.rarity === 'uncommon' ? '罕见' : '普通'})`, sold: false });
  }
  // 1 遗物
  const relicIds = Object.keys(RELICS).filter((id) => !s.relics.includes(id));
  if (relicIds.length > 0) {
    const id = relicIds[Math.floor(rng.next() * relicIds.length)]!;
    stock.push({ kind: 'relic', relicId: id, price: 70, label: `${RELICS[id]!.name}(遗物)`, sold: false });
  }
  // 删牌服务
  stock.push({ kind: 'remove', price: 40, label: '剔除一张牌', sold: false });
  // 回血服务
  stock.push({ kind: 'heal', price: 25, label: '金疮药(恢复 25 气血)', sold: false });
  return stock;
}

/** 购买一件商品(删牌需另调 removeCard) */
export function buyShopItem(s: RunState, index: number): boolean {
  const item = s.shopStock?.[index];
  if (!item || item.sold || s.gold < item.price) return false;
  s.gold -= item.price;
  item.sold = true;
  if (item.kind === 'card' && item.cardId) {
    s.deck.push(item.cardId);
    s.log.push({ text: `你买下【${getCard(item.cardId).name}】。`, kind: 'good' });
  } else if (item.kind === 'relic' && item.relicId) {
    s.relics.push(item.relicId);
    const r = RELICS[item.relicId]!;
    if (r.id === 'bai-yu') { s.maxHp += 15; s.hp += 15; }
    s.log.push({ text: `你买下遗物【${r.name}】。`, kind: 'good' });
  } else if (item.kind === 'heal') {
    s.hp = Math.min(s.maxHp, s.hp + 25);
    s.log.push({ text: '你服下药散,恢复 25 点气血。', kind: 'good' });
  }
  // remove 由 removeCard 单独处理(需指定删哪张)
  return true;
}

/** 从牌组剔除一张牌(配合商店 remove 服务) */
export function removeCard(s: RunState, cardId: string): boolean {
  const i = s.deck.indexOf(cardId);
  if (i === -1) return false;
  s.deck.splice(i, 1);
  s.log.push({ text: `你将【${getCard(cardId).name}】从牌组剔除,牌组更精炼了。`, kind: 'good' });
  return true;
}

/** 离开商店/事件 */
export function leaveShopOrEvent(s: RunState): void {
  s.shopStock = undefined;
  s.activeEvent = undefined;
  s.phase = 'map';
}

// ==================== 随机事件 ====================
export interface GameEvent {
  id: string;
  text: string;
  options: { label: string; desc: string }[];
}

const EVENTS: { id: string; text: string; options: { label: string; desc: string }[] }[] = [
  {
    id: 'old-beggar',
    text: '一个老叫化拦路讨酒,看你骨骼清奇。',
    options: [
      { label: '请他喝酒', desc: '花 20 两,随机得一张牌' },
      { label: '不予理会', desc: '无事发生' },
    ],
  },
  {
    id: 'sword-stele',
    text: '崖边一块古剑碑,剑痕凌厉,似有剑意残留。',
    options: [
      { label: '静心体悟', desc: '受 8 点伤,升级一张牌' },
      { label: '绕道而行', desc: '无事发生' },
    ],
  },
  {
    id: 'treasure-box',
    text: '草丛里一只上锁的木箱,隐约透着宝光。',
    options: [
      { label: '撬开它', desc: '随机得一件遗物,但受 5 点伤' },
      { label: '不动它', desc: '无事发生' },
    ],
  },
  {
    id: 'hermit-gamble',
    text: '一位怪道人摇着骰子,邀你赌一把运气。',
    options: [
      { label: '赌一把', desc: '一半概率得 40 两,一半掉 15 气血' },
      { label: '不赌', desc: '无事发生' },
    ],
  },
];

function rollEvent(s: RunState, rng: Rng): GameEvent {
  const e = EVENTS[Math.floor(rng.next() * EVENTS.length)]!;
  return { id: e.id, text: e.text, options: e.options };
}

/** 处理事件选择,返回结果文案 */
export function resolveEvent(s: RunState, optionIndex: number, rng: Rng = defaultRng): { text: string; upgradedCardId?: string } {
  const ev = s.activeEvent;
  if (!ev) return { text: '无事发生。' };
  let text = '你选择静观其变,继续赶路。';
  let upgradedCardId: string | undefined;

  if (optionIndex === 0) {
    switch (ev.id) {
      case 'old-beggar': {
        if (s.gold >= 20) {
          s.gold -= 20;
          const c = rollCardReward(rng, 1)[0]!;
          s.deck.push(c.id);
          text = `老叫化喝得尽兴,传你一手【${c.name}】!`;
        } else text = '你囊中羞涩,老叫化摇摇头走了。';
        break;
      }
      case 'sword-stele': {
        s.hp = Math.max(1, s.hp - 8);
        const up = upgradeRandomCard(s, rng);
        upgradedCardId = up ?? undefined;
        text = up ? `剑意入体,你受 8 点伤,【${getCard(up).name}】得到淬炼升级!` : '你参详半晌,无所寸进,反受了 8 点伤。';
        break;
      }
      case 'treasure-box': {
        s.hp = Math.max(1, s.hp - 5);
        const relicIds = Object.keys(RELICS).filter((id) => !s.relics.includes(id));
        if (relicIds.length > 0) {
          const id = relicIds[Math.floor(rng.next() * relicIds.length)]!;
          s.relics.push(id);
          const r = RELICS[id]!;
          if (r.id === 'bai-yu') { s.maxHp += 15; s.hp += 15; }
          text = `箱中竟是遗物【${r.name}】!撬锁时划破了手,受 5 点伤。`;
        } else text = '箱中空空如也,你白受了 5 点伤。';
        break;
      }
      case 'hermit-gamble': {
        if (rng.next() < 0.5) { s.gold += 40; text = '骰子落定,你赢了 40 两!道人拂袖而去。'; }
        else { s.hp = Math.max(1, s.hp - 15); text = '骰子不如人意,你输掉 15 点气血。'; }
        break;
      }
    }
  }
  s.log.push({ text, kind: optionIndex === 0 ? 'good' : 'system' });
  s.activeEvent = undefined;
  s.phase = 'map';
  return { text, upgradedCardId };
}

/** 升级一张随机牌(标记 upgraded + 数值提升) */
export function upgradeRandomCard(s: RunState, rng: Rng): string | null {
  const candidates = s.deck.filter((id) => !s.upgraded.has(id));
  if (candidates.length === 0) return null;
  const id = candidates[Math.floor(rng.next() * candidates.length)]!;
  s.upgraded.add(id);
  return id;
}

/** 牌的有效数值(考虑升级):伤害/格挡 +50%,费用不变 */
export function effectiveCard(cardId: string, upgraded: ReadonlySet<string>): Card {
  const base = getCard(cardId);
  if (!upgraded.has(cardId)) return base;
  const mul = (v?: number) => (v === undefined ? undefined : Math.round(v * 1.5));
  return {
    ...base,
    name: base.name + '+',
    damage: mul(base.damage),
    block: mul(base.block),
    poison: base.poison !== undefined ? base.poison + 2 : undefined,
  };
}
