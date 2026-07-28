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

export interface Profile {
  life: LifeArchive;
  mud: MudArchive;
  card: CardArchive;
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

export function readProfile(): Profile {
  const life = readLife();
  const mud = readMud();
  const card = readCard();
  // 综合江湖声望:各项成就的加权和
  let renown = 0;
  if (life.played) renown += (ENDING_RANK[latestEndingId()] ?? 0) * 10 + Math.min(life.lives, 10) * 2;
  if (mud.played) renown += (mud.level ?? 0) * 3 + (mud.skills ?? 0) * 5;
  if (card.played) renown += (card.cleared ? 50 : 0) + (card.floor ?? 0) * 2;
  return { life, mud, card, renown };
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
