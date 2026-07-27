import type { Attributes } from '@game/game-core';

/**
 * 彩蛋桥接:读取《人生重开模拟器》在 localStorage 里存的历代人生,
 * 把「前世结局」映射为 MUD 开局彩蛋(称号 + 属性加成)。
 * 该函数需在浏览器环境(localStorage 可用)调用;非浏览器返回 null。
 */

const LIVES_KEY = 'life-restart:lives';

interface StoredLife {
  id: string;
  name: string;
  final_age: number;
  ending_id: string;
  ending_title: string;
}

export interface PastLife {
  name: string;
  title: string;
  endingId: string;
  /** 依据前世结局给的开局属性加成 */
  bonusAttrs: Partial<Attributes>;
  intro: string;
}

/** 各结局对应的加成与彩蛋文案 */
const LEGACY_MAP: Record<string, { bonus: Partial<Attributes>; intro: string }> = {
  legend: { bonus: { reputation: 8, luck: 4, wisdom: 2 }, intro: '前世你是武林神话,这一世众生仍念你的威名。' },
  grandmaster: { bonus: { wisdom: 5, reputation: 5 }, intro: '前世你是一代宗师,武学底蕴刻进了骨子里。' },
  'martial-scholar': { bonus: { wisdom: 6, agility: 2 }, intro: '前世你武学渊博,招式信手拈来。' },
  'sword-god': { bonus: { agility: 6, strength: 2 }, intro: '前世你是剑神,握剑的手依旧滚烫。' },
  'sword-sage': { bonus: { agility: 5, wisdom: 2 }, intro: '前世你是剑圣,剑意未泯。' },
  hero: { bonus: { reputation: 6, strength: 2 }, intro: '前世你是侠客,侠名仍在江湖流传。' },
  avenger: { bonus: { strength: 5, constitution: 2 }, intro: '前世你快意恩仇,血性未冷。' },
  'poison-king': { bonus: { wisdom: 4, luck: 2, strength: 2 }, intro: '前世你是毒王,人人对你又敬又畏。' },
  recluse: { bonus: { constitution: 4, wisdom: 2 }, intro: '前世你抱憾归隐,这一世想换种活法。' },
  'tragic-death': { bonus: { luck: 3, constitution: 2 }, intro: '前世你英年早逝,这一世老天补偿你。' },
  'died-young': { bonus: { luck: 2 }, intro: '前世你早早夭折,这一世你要活得长久。' },
  'common-folk': { bonus: { constitution: 2 }, intro: '前世你平凡一生,这一世要不凡。' },
};

export function readPastLife(): PastLife | null {
  try {
    const store = (globalThis as { localStorage?: { getItem(k: string): string | null } }).localStorage;
    if (!store) return null;
    const raw = store.getItem(LIVES_KEY);
    if (!raw) return null;
    const lives = JSON.parse(raw) as StoredLife[];
    if (!Array.isArray(lives) || lives.length === 0) return null;
    // 取最近一世的结局作彩蛋
    const last = lives[0]!;
    const map = LEGACY_MAP[last.ending_id] ?? LEGACY_MAP['common-folk']!;
    return {
      name: last.name,
      title: last.ending_title,
      endingId: last.ending_id,
      bonusAttrs: map.bonus,
      intro: map.intro,
    };
  } catch {
    return null;
  }
}
