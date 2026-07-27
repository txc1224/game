import type { Attributes } from './types.js';

/** 武功类型 */
export type SkillKind = 'sword' | 'palm' | 'inner' | 'lightness' | 'poison' | 'blade';

export interface Skill {
  id: string;
  name: string;
  kind: SkillKind;
  /** 习得后对属性的加成(一次性) */
  attrBonus: Partial<Attributes>;
  /** 修习门槛(某项属性下限),达不到则事件里学不会 */
  requirement: Partial<Attributes>;
  /** 习得时给的剧情 flag */
  flag: string;
  desc: string;
}

export const SKILL_KIND_LABELS: Record<SkillKind, string> = {
  sword: '剑法',
  palm: '掌法',
  inner: '内功',
  lightness: '轻功',
  poison: '毒功',
  blade: '刀法',
};

/** 武功表 —— 武侠经典设定 */
export const SKILLS: readonly Skill[] = [
  { id: 'dugu-sword', name: '独孤九剑', kind: 'sword', attrBonus: { agility: 8, wisdom: 6 }, requirement: { wisdom: 25 }, flag: 'skill-dugu-sword', desc: '破尽天下武学,无招胜有招。' },
  { id: 'taichi-sword', name: '太极剑', kind: 'sword', attrBonus: { wisdom: 7, agility: 4 }, requirement: { wisdom: 22 }, flag: 'skill-taichi', desc: '以柔克刚,圆转如意。' },
  { id: 'xiahou-palm', name: '降龙十八掌', kind: 'palm', attrBonus: { strength: 9, constitution: 4 }, requirement: { strength: 25 }, flag: 'skill-dragon-palm', desc: '至刚至猛,天下第一刚猛掌法。' },
  { id: 'jiuyang', name: '九阳神功', kind: 'inner', attrBonus: { constitution: 10, wisdom: 4 }, requirement: { constitution: 28 }, flag: 'skill-jiuyang', desc: '内力生生不息,百毒不侵。' },
  { id: 'jiuyin', name: '九阴真经', kind: 'inner', attrBonus: { wisdom: 9, constitution: 5 }, requirement: { wisdom: 28 }, flag: 'skill-jiuyin', desc: '武学总纲,天下武学之源。' },
  { id: 'lingbo', name: '凌波微步', kind: 'lightness', attrBonus: { agility: 11, luck: 2 }, requirement: { agility: 26 }, flag: 'skill-lingbo', desc: '罗袜生尘,趋避如神。' },
  { id: 'shenxing', name: '神行百变', kind: 'lightness', attrBonus: { agility: 8, constitution: 2 }, requirement: { agility: 20 }, flag: 'skill-shenxing', desc: '日行千里,无影无踪。' },
  { id: 'huagong', name: '化功大法', kind: 'poison', attrBonus: { strength: 6, wisdom: 3 }, requirement: { wisdom: 18 }, flag: 'skill-huagong', desc: '化人内力,阴狠毒辣。' },
  { id: 'blade-kuang', name: '狂风刀法', kind: 'blade', attrBonus: { strength: 7, agility: 3 }, requirement: { strength: 20 }, flag: 'skill-kuang-blade', desc: '刀势如狂风骤雨,凌厉非常。' },
  { id: 'yijinjing', name: '易筋经', kind: 'inner', attrBonus: { constitution: 8, strength: 4 }, requirement: { constitution: 24 }, flag: 'skill-yijinjing', desc: '少林镇寺之宝,脱胎换骨。' },
];

export const SKILL_MAP: ReadonlyMap<string, Skill> = new Map(SKILLS.map((s) => [s.id, s]));

export function getSkill(id: string): Skill {
  const s = SKILL_MAP.get(id);
  if (!s) throw new Error(`未知武功: ${id}`);
  return s;
}

/** 是否满足修习门槛 */
export function canLearn(attrs: Attributes, skill: Skill): boolean {
  for (const [k, v] of Object.entries(skill.requirement)) {
    if ((attrs[k as keyof Attributes] ?? 0) < (v ?? 0)) return false;
  }
  return true;
}

/** 由武功集合得出可用的战力标签(结局用),取最高阶的一门作为代表 */
export function signatureSkill(skills: ReadonlySet<string>): Skill | null {
  let best: Skill | null = null;
  for (const id of skills) {
    const s = SKILL_MAP.get(id);
    if (!s) continue;
    if (!best) { best = s; continue; }
    const score = (x: Skill) => Object.values(x.attrBonus).reduce((a, b) => a + (b ?? 0), 0);
    if (score(s) > score(best)) best = s;
  }
  return best;
}
