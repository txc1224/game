/** 卡牌定义 —— 武侠风杀戮尖塔。纯数据,纯函数。 */

export type CardKind = 'attack' | 'skill' | 'power';
export type CardRarity = 'basic' | 'common' | 'uncommon' | 'rare';

export interface Card {
  id: string;
  name: string;
  kind: CardKind;
  rarity: CardRarity;
  /** 能量费 */
  cost: number;
  /** 效果描述 */
  desc: string;
  /** 数值(按 kind 解释: attack=伤害, skill 的 block=格挡) */
  damage?: number;
  block?: number;
  /** 多段攻击次数(每段 damage 伤害) */
  hits?: number;
  /** 毒(回合末结算,层数递减) */
  poison?: number;
  /** 按当前格挡造成伤害(金钟反震流) */
  blockToDamage?: boolean;
  /** X费:耗尽全部能量,效果按消耗能量数结算(如乾坤一掷) */
  xCost?: boolean;
  /** 抽牌数 */
  draw?: number;
  /** 获得能量 */
  energy?: number;
  /** 易伤(对方受伤加深,回合) */
  vulnerable?: number;
  /** 虚弱(对方攻击降低,回合) */
  weak?: number;
  /** 力量(永久+攻) */
  strength?: number;
  /** 升级后覆盖的字段 */
  upgraded?: boolean;
}

export const CARD_POOL: readonly Card[] = [
  // —— 基础牌(起始牌组) ——
  { id: 'strike', name: '刺击', kind: 'attack', rarity: 'basic', cost: 1, damage: 6, desc: '造成 6 点伤害。' },
  { id: 'defend', name: '格挡', kind: 'skill', rarity: 'basic', cost: 1, block: 5, desc: '获得 5 点格挡。' },
  // —— 普通 ——
  { id: 'qingfeng', name: '青锋快剑', kind: 'attack', rarity: 'common', cost: 1, damage: 8, desc: '造成 8 点伤害。' },
  { id: 'lianhuan', name: '连环腿', kind: 'attack', rarity: 'common', cost: 1, damage: 4, draw: 1, desc: '造成 4 点伤害,抽 1 张牌。' },
  { id: 'tiebushan', name: '铁布衫', kind: 'skill', rarity: 'common', cost: 1, block: 8, desc: '获得 8 点格挡。' },
  { id: 'xudu', name: '蓄力一击', kind: 'attack', rarity: 'common', cost: 2, damage: 12, desc: '造成 12 点伤害。' },
  { id: 'fanji', name: '反击', kind: 'skill', rarity: 'common', cost: 1, block: 4, damage: 4, desc: '获得 4 点格挡,造成 4 点伤害。' },
  // —— 罕见 ——
  { id: 'pofeng', name: '破风刀', kind: 'attack', rarity: 'uncommon', cost: 2, damage: 10, vulnerable: 2, desc: '造成 10 点伤害,施加 2 回合易伤。' },
  { id: 'xinqing', name: '清心诀', kind: 'skill', rarity: 'uncommon', cost: 0, draw: 2, desc: '抽 2 张牌。' },
  { id: 'neigong', name: '内功心法', kind: 'power', rarity: 'uncommon', cost: 1, strength: 2, desc: '本场战斗力量 +2。' },
  { id: 'huati', name: '滑步', kind: 'skill', rarity: 'uncommon', cost: 0, block: 3, energy: 1, desc: '获得 3 点格挡,获得 1 点能量。' },
  { id: 'zhangli', name: '降龙掌', kind: 'attack', rarity: 'uncommon', cost: 2, damage: 16, desc: '造成 16 点伤害。' },
  // —— 稀有 ——
  { id: 'dugujian', name: '独孤一剑', kind: 'attack', rarity: 'rare', cost: 3, damage: 28, desc: '造成 28 点伤害。' },
  { id: 'jingang', name: '金刚不坏', kind: 'power', rarity: 'rare', cost: 2, strength: 3, block: 10, desc: '获得 10 点格挡,本场战斗力量 +3。' },
  { id: 'miejue', name: '灭绝剑气', kind: 'attack', rarity: 'rare', cost: 2, damage: 8, weak: 3, vulnerable: 3, desc: '造成 8 点伤害,施加 3 回合虚弱与易伤。' },
  // —— 连击流(多段) ——
  { id: 'jianyu', name: '剑雨纷飞', kind: 'attack', rarity: 'uncommon', cost: 2, damage: 4, hits: 4, desc: '连续刺出 4 剑,每剑 4 点伤害。' },
  { id: 'luanshi', name: '乱石穿空', kind: 'attack', rarity: 'common', cost: 1, damage: 3, hits: 3, desc: '连续攻出 3 招,每招 3 点伤害。' },
  { id: 'qijue', name: '七伤拳', kind: 'attack', rarity: 'rare', cost: 3, damage: 5, hits: 7, desc: '七拳连发,每拳 5 点伤害。' },
  // —— 叠甲爆发流 ——
  { id: 'jinzhong', name: '金钟反震', kind: 'attack', rarity: 'uncommon', cost: 2, blockToDamage: true, desc: '将当前格挡全部转化为伤害反击。' },
  { id: 'tiejia', name: '铁甲护身', kind: 'skill', rarity: 'common', cost: 2, block: 14, desc: '获得 14 点格挡。' },
  { id: 'houji', name: '厚积薄发', kind: 'skill', rarity: 'rare', cost: 1, block: 6, draw: 1, desc: '获得 6 点格挡,抽 1 张牌。' },
  // —— 力量流 ——
  { id: 'kuangquan', name: '狂拳', kind: 'attack', rarity: 'common', cost: 1, damage: 5, strength: 1, desc: '造成 5 点伤害,本场战斗力量 +1。' },
  { id: 'poshan', name: '破山击', kind: 'attack', rarity: 'uncommon', cost: 2, damage: 9, strength: 2, desc: '造成 9 点伤害,本场战斗力量 +2。' },
  { id: 'longxiang', name: '龙象般若', kind: 'power', rarity: 'rare', cost: 3, strength: 5, desc: '本场战斗力量 +5。' },
  // —— 毒/持续流 ——
  { id: 'shexin', name: '蛇心毒掌', kind: 'attack', rarity: 'uncommon', cost: 1, damage: 4, poison: 4, desc: '造成 4 点伤害,施加 4 层毒。' },
  { id: 'wudu', name: '五毒神掌', kind: 'attack', rarity: 'rare', cost: 2, damage: 6, poison: 8, desc: '造成 6 点伤害,施加 8 层毒。' },
  { id: 'chuanxin', name: '穿心钉', kind: 'attack', rarity: 'common', cost: 1, damage: 3, poison: 3, desc: '造成 3 点伤害,施加 3 层毒。' },
  // —— 大能/能量流 ——
  { id: 'qankun', name: '乾坤一掷', kind: 'attack', rarity: 'rare', cost: 0, xCost: true, damage: 8, desc: '耗尽全部能量,每点能量造成 8 点伤害。' },
  { id: 'juhui', name: '聚气回元', kind: 'skill', rarity: 'uncommon', cost: 0, energy: 2, draw: 1, desc: '获得 2 点能量,抽 1 张牌。' },
  { id: 'beiming', name: '北冥神功', kind: 'power', rarity: 'rare', cost: 2, energy: 1, draw: 1, strength: 1, desc: '获得 1 点能量,抽 1 张牌,本场战斗力量 +1。' },
  { id: 'tianmo', name: '天魔解体', kind: 'attack', rarity: 'rare', cost: 4, damage: 40, desc: '造成 40 点伤害。' },
];

export const CARD_MAP: ReadonlyMap<string, Card> = new Map(CARD_POOL.map((c) => [c.id, c]));

export function getCard(id: string): Card {
  const c = CARD_MAP.get(id);
  if (!c) throw new Error(`未知卡牌: ${id}`);
  return c;
}

/** 起始牌组:5 刺击 + 4 格挡 + 1 青锋快剑 */
export function starterDeck(): string[] {
  return ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'qingfeng'];
}

/** 按稀有度权重随机抽牌(战斗奖励) */
export function rollCardReward(rng: { next(): number }, count = 3): Card[] {
  const weights = { common: 55, uncommon: 33, rare: 12 } as const;
  const pool = CARD_POOL.filter((c) => c.rarity !== 'basic');
  const out: Card[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard < 60) {
    guard++;
    const totalW = weights.common + weights.uncommon + weights.rare;
    let roll = rng.next() * totalW;
    let rarity: 'common' | 'uncommon' | 'rare' = 'common';
    if ((roll -= weights.common) < 0) rarity = 'common';
    else if ((roll -= weights.uncommon) < 0) rarity = 'uncommon';
    else rarity = 'rare';
    const tier = pool.filter((c) => c.rarity === rarity && !seen.has(c.id));
    if (tier.length === 0) continue;
    const pick = tier[Math.floor(rng.next() * tier.length)]!;
    seen.add(pick.id);
    out.push(pick);
  }
  return out;
}

/** 敌人定义 */
export interface Enemy {
  id: string;
  name: string;
  maxHp: number;
  /** 意图序列(循环) */
  moves: { kind: 'attack' | 'defend' | 'buff'; value: number; label: string }[];
  isBoss?: boolean;
  isElite?: boolean;
}

export const ENEMIES: Record<string, Enemy> = {
  'shan-zei': { id: 'shan-zei', name: '山贼', maxHp: 30, moves: [{ kind: 'attack', value: 6, label: '劈砍' }, { kind: 'attack', value: 5, label: '横扫' }] },
  'ye-zhu': { id: 'ye-zhu', name: '野猪王', maxHp: 24, moves: [{ kind: 'attack', value: 5, label: '冲撞' }, { kind: 'defend', value: 5, label: '硬皮' }] },
  'fei-zei': { id: 'fei-zei', name: '飞贼', maxHp: 26, moves: [{ kind: 'attack', value: 7, label: '袖箭' }, { kind: 'attack', value: 4, label: '连刺' }] },
  // 精英
  'du-she-wang': { id: 'du-she-wang', name: '毒蛇王', maxHp: 44, isElite: true, moves: [{ kind: 'attack', value: 9, label: '毒牙' }, { kind: 'attack', value: 5, label: '缠绕' }, { kind: 'defend', value: 8, label: '盘绕' }] },
  'tie-bu-shan': { id: 'tie-bu-shan', name: '铁布衫武师', maxHp: 50, isElite: true, moves: [{ kind: 'attack', value: 10, label: '铁拳' }, { kind: 'defend', value: 10, label: '运功' }] },
  // BOSS
  'hei-feng-zhai-zhu': { id: 'hei-feng-zhai-zhu', name: '黑风寨主', maxHp: 70, isBoss: true, moves: [{ kind: 'attack', value: 12, label: '黑风刀' }, { kind: 'attack', value: 8, label: '横扫千军' }, { kind: 'buff', value: 3, label: '嗜血' }] },
};

/** 遗物定义 */
export interface Relic {
  id: string;
  name: string;
  desc: string;
}

export const RELICS: Record<string, Relic> = {
  'xuan-tie': { id: 'xuan-tie', name: '玄铁护符', desc: '每场战斗开始时获得 6 点格挡。' },
  'jiu-hu': { id: 'jiu-hu', name: '酒葫芦', desc: '每回合第一次出牌额外 +1 能量。' },
  'bai-yu': { id: 'bai-yu', name: '白玉佩', desc: '最大气血 +15。' },
  'zhan-yi': { id: 'zhan-yi', name: '战意令', desc: '力量 +1(每场战斗生效)。' },
};
