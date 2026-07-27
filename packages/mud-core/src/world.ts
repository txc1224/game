import type { Attributes, Rng } from '@game/game-core';

/** 方向 */
export type Direction = 'north' | 'south' | 'east' | 'west';
export const DIR_LABELS: Record<Direction, string> = {
  north: '北',
  south: '南',
  east: '东',
  west: '西',
};
const OPPOSITE: Record<Direction, Direction> = { north: 'south', south: 'north', east: 'west', west: 'east' };

/** 怪物模板 */
export interface Monster {
  id: string;
  name: string;
  /** 强度等级(影响 HP/攻击) */
  tier: number;
  hp: number;
  attack: number;
  defense: number;
  /** 击败获得阅历/修为 */
  exp: number;
  /** 可能的掉落 */
  drops?: { itemId: string; chance: number }[];
  desc: string;
}

/** 房间(地图节点) */
export interface Room {
  id: string;
  name: string;
  desc: string;
  exits: Partial<Record<Direction, string>>;
  /** 该区域的怪物(探索时随机遭遇) */
  monsters?: string[];
  /** 遭遇概率 */
  encounterRate?: number;
  /** 功能性 NPC */
  npcs?: { id: string; name: string; kind: 'healer' | 'merchant' | 'master' | 'quest'; line: string }[];
  /** 安全区(不遭遇怪物) */
  safe?: boolean;
}

/** 物品 */
export interface Item {
  id: string;
  name: string;
  kind: 'weapon' | 'pill' | 'misc';
  /** 装备属性加成 */
  attrBonus?: Partial<Attributes>;
  heal?: number;
  price: number;
  desc: string;
}

export const MONSTERS: Record<string, Monster> = {
  'ye-zhu': { id: 'ye-zhu', name: '野猪', tier: 1, hp: 20, attack: 4, defense: 0, exp: 5, desc: '一头獠牙锋利的野猪。' },
  'e-lang': { id: 'e-lang', name: '恶狼', tier: 1, hp: 24, attack: 6, defense: 1, exp: 7, drops: [{ itemId: 'lang-ya', chance: 0.5 }], desc: '绿眼睛在暗处闪着光。' },
  'shan-zei': { id: 'shan-zei', name: '山贼', tier: 2, hp: 35, attack: 8, defense: 2, exp: 12, drops: [{ itemId: 'sui-yin', chance: 0.8 }], desc: '拦路剪径的强人。' },
  'du-she': { id: 'du-she', name: '五步毒蛇', tier: 2, hp: 28, attack: 10, defense: 0, exp: 12, drops: [{ itemId: 'she-dan', chance: 0.6 }], desc: '剧毒无比,见血封喉。' },
  'tie-bu-shan': { id: 'tie-bu-shan', name: '铁布衫武师', tier: 3, hp: 55, attack: 12, defense: 5, exp: 22, drops: [{ itemId: 'jin-chuang-yao', chance: 0.7 }], desc: '一身横练功夫,刀枪不入。' },
  'hei-feng-zhai-zhu': { id: 'hei-feng-zhai-zhu', name: '黑风寨主', tier: 4, hp: 80, attack: 16, defense: 6, exp: 40, drops: [{ itemId: 'hei-feng-dao', chance: 1 }], desc: '黑风寨大当家,恶名远播。' },
  'jiang-hu-ke': { id: 'jiang-hu-ke', name: '落魄刀客', tier: 3, hp: 48, attack: 14, defense: 3, exp: 18, drops: [{ itemId: 'kuang-dao', chance: 0.4 }], desc: '醉眼惺忪,刀却很快。' },
};

export const ITEMS: Record<string, Item> = {
  'qing-feng-jian': { id: 'qing-feng-jian', name: '青锋剑', kind: 'weapon', attrBonus: { strength: 3 }, price: 50, desc: '一柄寻常铁剑。' },
  'kuang-dao': { id: 'kuang-dao', name: '狂刀', kind: 'weapon', attrBonus: { strength: 6, agility: 1 }, price: 120, desc: '刀身沉重,挥舞生风。' },
  'hei-feng-dao': { id: 'hei-feng-dao', name: '黑风刀', kind: 'weapon', attrBonus: { strength: 10, agility: 2 }, price: 300, desc: '黑风寨主的佩刀,煞气逼人。' },
  'jin-chuang-yao': { id: 'jin-chuang-yao', name: '金疮药', kind: 'pill', heal: 30, price: 20, desc: '止血生肌的良药。' },
  'da-huan-dan': { id: 'da-huan-dan', name: '大还丹', kind: 'pill', heal: 80, price: 80, desc: '少林圣药,生死人肉白骨。' },
  'lang-ya': { id: 'lang-ya', name: '狼牙', kind: 'misc', price: 5, desc: '可卖钱。' },
  'she-dan': { id: 'she-dan', name: '蛇胆', kind: 'misc', price: 15, desc: '珍贵的药材。' },
  'sui-yin': { id: 'sui-yin', name: '碎银子', kind: 'misc', price: 10, desc: '几两散碎银子。' },
};

export const ROOMS: Record<string, Room> = {
  'qingxi-cun': {
    id: 'qingxi-cun', name: '青溪村',
    desc: '依山傍水的小村,炊烟袅袅。村中老郎中可以为你疗伤,杂货铺能买卖些东西。',
    exits: { north: 'wang-you-gu', east: 'qing-shan' },
    npcs: [
      { id: 'lang-zhong', name: '老郎中', kind: 'healer', line: '年轻人,受了伤就来我这儿。' },
      { id: 'huo-ji', name: '杂货铺伙计', kind: 'merchant', line: '客官,看看要点什么?' },
    ],
    safe: true,
  },
  'qing-shan': {
    id: 'qing-shan', name: '青山',
    desc: '苍翠山林,鸟鸣婉转。偶有野兽出没,是练手的好去处。',
    exits: { west: 'qingxi-cun', east: 'hei-feng-zhai', north: 'wang-you-gu' },
    monsters: ['ye-zhu', 'e-lang'],
    encounterRate: 0.55,
  },
  'wang-you-gu': {
    id: 'wang-you-gu', name: '忘忧谷',
    desc: '谷中毒雾弥漫,蛇虫横行,却也生长着珍稀药材。深处似有高人隐居。',
    exits: { south: 'qingxi-cun', west: 'qing-shan' },
    monsters: ['du-she', 'e-lang'],
    encounterRate: 0.6,
    npcs: [{ id: 'yin-shi', name: '谷中隐士', kind: 'master', line: '有缘人,可愿听我讲讲武学?' }],
  },
  'hei-feng-zhai': {
    id: 'hei-feng-zhai', name: '黑风寨',
    desc: '山势险恶,寨墙高耸,是方圆百里闻名的贼窝。寨主武艺高强,等闲不敢靠近。',
    exits: { west: 'qing-shan', north: 'duan-hun-ya' },
    monsters: ['shan-zei', 'jiang-hu-ke'],
    encounterRate: 0.65,
  },
  'duan-hun-ya': {
    id: 'duan-hun-ya', name: '断魂崖',
    desc: '万丈深渊,罡风凛冽。传说多位高手在此决斗陨落,崖顶石碑刻满剑痕。',
    exits: { south: 'hei-feng-zhai' },
    monsters: ['tie-bu-shan', 'jiang-hu-ke', 'hei-feng-zhai-zhu'],
    encounterRate: 0.7,
  },
};

export function getRoom(id: string): Room {
  const r = ROOMS[id];
  if (!r) throw new Error(`未知区域: ${id}`);
  return r;
}

/** 从某区域随机挑一只怪物 */
export function rollEncounter(room: Room, rng: Rng): Monster | null {
  if (room.safe || !room.monsters || room.monsters.length === 0) return null;
  const rate = room.encounterRate ?? 0.5;
  if (rng.next() >= rate) return null;
  const id = room.monsters[Math.floor(rng.next() * room.monsters.length)]!;
  return MONSTERS[id] ?? null;
}

export { OPPOSITE };
