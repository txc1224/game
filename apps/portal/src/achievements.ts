/**
 * 侠影档案:聚合三款游戏在 localStorage 的存档,提炼为统一的成就/档案。
 * 全部读取自有 key,不做任何写入;数据缺失(没玩过)则该游戏档案为空。
 */

export interface LifeArchive {
  played: boolean;
  lives: number; // 历代人生数
  bestTitle?: string; // 最高成就称号
  bestAge?: number; // 最长寿
  recentEnding?: string; // 最近一世结局
}

export interface MudArchive {
  played: boolean;
  level?: number;
  skills?: number; // 已学武功数
  alive?: boolean;
  room?: string;
}

export interface CardArchive {
  played: boolean;
  cleared?: boolean; // 是否通关
  floor?: number; // 当前层数(1-based)
  deckSize?: number;
  relics?: number;
}

export interface InnArchive {
  played: boolean;
  silver?: number;
  renown?: number;
  level?: number;
  ordersDone?: number;
}

export interface Profile {
  life: LifeArchive;
  mud: MudArchive;
  card: CardArchive;
  inn: InnArchive;
  /** 综合江湖声望(粗略) */
  renown: number;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** 结局称号的成就分档(越高越难得) */
const ENDING_RANK: Record<string, number> = {
  legend: 6,
  'sword-god': 5,
  'poison-king': 5,
  'martial-scholar': 4,
  grandmaster: 4,
  'sword-sage': 3,
  hero: 2,
  avenger: 2,
  recluse: 1,
  'common-folk': 0,
  'tragic-death': 0,
  'died-young': 0,
};

const ENDING_TITLE: Record<string, string> = {
  legend: '武林神话',
  'sword-god': '剑神',
  'poison-king': '毒王',
  'martial-scholar': '武学宗师',
  grandmaster: '一代宗师',
  'sword-sage': '剑圣',
  hero: '侠客',
  avenger: '快意恩仇',
  recluse: '抱憾归隐',
  'common-folk': '平凡一生',
  'tragic-death': '英年早逝',
  'died-young': '夭折',
};

function readLife(): LifeArchive {
  const lives = readJson<{ final_age: number; ending_id: string; ending_title: string }[]>('life-restart:lives');
  if (!Array.isArray(lives) || lives.length === 0) return { played: false, lives: 0 };
  let best: { rank: number; title: string } | null = null;
  let bestAge = 0;
  for (const l of lives) {
    const rank = ENDING_RANK[l.ending_id] ?? 0;
    if (!best || rank > best.rank) best = { rank, title: l.ending_title ?? ENDING_TITLE[l.ending_id] ?? l.ending_id };
    if (l.final_age > bestAge) bestAge = l.final_age;
  }
  return {
    played: true,
    lives: lives.length,
    bestTitle: best?.title,
    bestAge,
    recentEnding: lives[0]?.ending_title,
  };
}

function readMud(): MudArchive {
  const save = readJson<{ player: { level: number; skills: string[]; roomId: string }; dead: boolean }>('wulin-mud:save');
  if (!save?.player) return { played: false };
  return {
    played: true,
    level: save.player.level,
    skills: save.player.skills?.length ?? 0,
    alive: !save.dead,
    room: save.player.roomId,
  };
}

function readCard(): CardArchive {
  const save = readJson<{ run: { phase: string; nodeIndex: number; nodes: unknown[]; deck: string[]; relics: string[] } }>('card-rogue:save');
  if (!save?.run) return { played: false };
  return {
    played: true,
    cleared: save.run.phase === 'won',
    floor: (save.run.nodeIndex ?? -1) + 1,
    deckSize: save.run.deck?.length ?? 0,
    relics: save.run.relics?.length ?? 0,
  };
}

function readInn(): InnArchive {
  const save = readJson<{ silver: number; renown: number; level: number; ordersDone: string[] }>('wuxia-inn:save');
  if (!save || typeof save.silver !== 'number') return { played: false };
  return {
    played: true,
    silver: Math.floor(save.silver),
    renown: save.renown,
    level: save.level,
    ordersDone: save.ordersDone?.length ?? 0,
  };
}

export function readProfile(): Profile {
  const life = readLife();
  const mud = readMud();
  const card = readCard();
  const inn = readInn();
  // 综合江湖声望:各项成就的加权和
  let renown = 0;
  if (life.played) renown += (ENDING_RANK[latestEndingId()] ?? 0) * 10 + Math.min(life.lives, 10) * 2;
  if (mud.played) renown += (mud.level ?? 0) * 3 + (mud.skills ?? 0) * 5;
  if (card.played) renown += (card.cleared ? 50 : 0) + (card.floor ?? 0) * 2;
  if (inn.played) renown += (inn.level ?? 0) * 6 + (inn.ordersDone ?? 0) * 4;
  return { life, mud, card, inn, renown };
}

function latestEndingId(): string {
  const lives = readJson<{ ending_id: string }[]>('life-restart:lives');
  return lives?.[0]?.ending_id ?? '';
}

/** 声望对应的江湖称号 */
export function renownTitle(renown: number): string {
  if (renown >= 120) return '武林泰斗';
  if (renown >= 80) return '一代大侠';
  if (renown >= 50) return '江湖好手';
  if (renown >= 25) return '初露锋芒';
  if (renown > 0) return '初出茅庐';
  return '无名之辈';
}

// ==================== 成就勋章 ====================

export type MedalTier = 'bronze' | 'silver' | 'gold';

export interface Medal {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  tier: MedalTier;
  /** 是否已解锁 */
  unlocked: (p: Profile) => boolean;
  /** 解锁进度的可读描述(未解锁时显示) */
  progress?: (p: Profile) => string;
}

const lifeBest = (p: Profile, ids: string[]): boolean => {
  // 需要结局 id,Profile 里只有 title,这里重新读
  const lives = readJson<{ ending_id: string }[]>('life-restart:lives') ?? [];
  return lives.some((l) => ids.includes(l.ending_id));
};

export const MEDALS: Medal[] = [
  // —— 人生重开 ——
  { id: 'first-life', name: '初尝轮回', desc: '完成一世人生', emoji: '🌱', tier: 'bronze',
    unlocked: (p) => p.life.lives >= 1, progress: (p) => `${p.life.lives}/1 世` },
  { id: 'long-life', name: '松鹤延年', desc: '有一世活到 70 岁以上', emoji: '🎋', tier: 'silver',
    unlocked: (p) => (p.life.bestAge ?? 0) >= 70, progress: (p) => `最长 ${p.life.bestAge ?? 0}/70 岁` },
  { id: 'legend', name: '武林神话', desc: '有一世达成「武林神话」结局', emoji: '👑', tier: 'gold',
    unlocked: (p) => lifeBest(p, ['legend']) },
  { id: 'grandmaster', name: '开宗立派', desc: '有一世达成「一代宗师」或「武学宗师」结局', emoji: '🏯', tier: 'silver',
    unlocked: (p) => lifeBest(p, ['grandmaster', 'martial-scholar']) },
  { id: 'ten-lives', name: '十世历练', desc: '累计经历十世', emoji: '🔄', tier: 'silver',
    unlocked: (p) => p.life.lives >= 10, progress: (p) => `${p.life.lives}/10 世` },

  // —— 武林 MUD ——
  { id: 'mud-start', name: '初入江湖', desc: '在《武林群侠传》开始历练', emoji: '🗺️', tier: 'bronze',
    unlocked: (p) => p.mud.played },
  { id: 'mud-lv10', name: '小有所成', desc: '《武林群侠传》修为达 Lv.10', emoji: '💪', tier: 'silver',
    unlocked: (p) => (p.mud.level ?? 0) >= 10, progress: (p) => `Lv.${p.mud.level ?? 0}/10` },
  { id: 'mud-skills3', name: '博采众长', desc: '《武林群侠传》习得 3 门武功', emoji: '📜', tier: 'silver',
    unlocked: (p) => (p.mud.skills ?? 0) >= 3, progress: (p) => `${p.mud.skills ?? 0}/3 门` },
  { id: 'mud-skills5', name: '武学渊博', desc: '《武林群侠传》习得 5 门武功', emoji: '📚', tier: 'gold',
    unlocked: (p) => (p.mud.skills ?? 0) >= 5, progress: (p) => `${p.mud.skills ?? 0}/5 门` },

  // —— 黑风塔 ——
  { id: 'card-climb', name: '登塔之旅', desc: '在《黑风塔》爬到第 5 层', emoji: '🧗', tier: 'bronze',
    unlocked: (p) => (p.card.floor ?? 0) >= 5 || Boolean(p.card.cleared), progress: (p) => `第 ${p.card.floor ?? 0}/5 层` },
  { id: 'card-clear', name: '塔顶封侠', desc: '通关《黑风塔》,击败黑风寨主', emoji: '🏆', tier: 'gold',
    unlocked: (p) => Boolean(p.card.cleared) },
  { id: 'card-relics3', name: '收藏家', desc: '《黑风塔》持有 3 件遗物', emoji: '💎', tier: 'silver',
    unlocked: (p) => (p.card.relics ?? 0) >= 3, progress: (p) => `${p.card.relics ?? 0}/3 件` },

  // —— 悦来客栈 ——
  { id: 'inn-open', name: '开张大吉', desc: '《悦来客栈》开张经营', emoji: '🏮', tier: 'bronze',
    unlocked: (p) => p.inn.played },
  { id: 'inn-lv3', name: '闻名一方', desc: '《悦来客栈》升到 3 级', emoji: '🌆', tier: 'silver',
    unlocked: (p) => (p.inn.level ?? 0) >= 3, progress: (p) => `${p.inn.level ?? 0}/3 级` },
  { id: 'inn-lv5', name: '天下第一楼', desc: '《悦来客栈》升到 5 级', emoji: '🏯', tier: 'gold',
    unlocked: (p) => (p.inn.level ?? 0) >= 5, progress: (p) => `${p.inn.level ?? 0}/5 级` },
  { id: 'inn-orders3', name: '高朋满座', desc: '《悦来客栈》承办 3 个门派订单', emoji: '🍻', tier: 'silver',
    unlocked: (p) => (p.inn.ordersDone ?? 0) >= 3, progress: (p) => `${p.inn.ordersDone ?? 0}/3 单` },

  // —— 跨游戏 ——
  { id: 'all-played', name: '三修侠客', desc: '三款游戏都玩过', emoji: '⚡', tier: 'silver',
    unlocked: (p) => p.life.played && p.mud.played && p.card.played },
  { id: 'renown-80', name: '一代大侠', desc: '江湖声望达 80', emoji: '🌟', tier: 'gold',
    unlocked: (p) => p.renown >= 80, progress: (p) => `${p.renown}/80` },
];

export interface MedalStatus extends Medal {
  isUnlocked: boolean;
  progressText?: string;
}

/** 评估所有勋章的解锁状态 */
export function evalMedals(p: Profile): MedalStatus[] {
  return MEDALS.map((m) => {
    const isUnlocked = m.unlocked(p);
    return {
      ...m,
      isUnlocked,
      progressText: !isUnlocked && m.progress ? m.progress(p) : undefined,
    };
  });
}

// ==================== 勋章解锁追踪(用于解锁动效) ====================

const SEEN_MEDALS_KEY = 'portal:seen-medals';

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_MEDALS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * 计算本次相比上次「新解锁」的勋章,并把当前已解锁集合记录下来。
 * 返回新解锁的勋章 id 列表(用于弹「恭喜解锁」与「新!」角标)。
 */
export function consumeNewUnlocks(p: Profile): string[] {
  const seen = readSeen();
  const current = MEDALS.filter((m) => m.unlocked(p)).map((m) => m.id);
  const isFirstVisit = seen.size === 0 && !localStorage.getItem(SEEN_MEDALS_KEY);
  const fresh = current.filter((id) => !seen.has(id));
  try {
    localStorage.setItem(SEEN_MEDALS_KEY, JSON.stringify(current));
  } catch {
    /* ignore */
  }
  // 首次访问不把所有已解锁当「新」(那是历史积累,不是这次解锁的)
  return isFirstVisit ? [] : fresh;
}

/** 当前已解锁集合(不消费,仅展示角标用) */
export function currentUnlockIds(p: Profile): Set<string> {
  return new Set(MEDALS.filter((m) => m.unlocked(p)).map((m) => m.id));
}

