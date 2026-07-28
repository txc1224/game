import type { Trait } from './types.js';

/**
 * 剧本系统:不同的人生线。
 * 每个剧本 = 专属词条池(在共享词条基础上,加剧本专属词条) + 开局基调 flag + 专属结局。
 * 事件与结局通过剧本 flag 分支(如 sword-soul / assassin 路线)。
 */

export type ScenarioId = 'jianghu' | 'swordsman' | 'assassin';

export interface Scenario {
  id: ScenarioId;
  name: string;
  /** 一句话定位 */
  tagline: string;
  /** 剧本描述 */
  desc: string;
  /** 开局基调 flag(驱动专属事件/结局) */
  baseFlag: string;
  /** 剧本专属词条(并入抽取池,与共享词条一起按稀有度权重抽) */
  traits: Trait[];
  /** 开局属性倾向(在基础值上叠加) */
  attrBias?: Partial<Record<'strength' | 'agility' | 'constitution' | 'wisdom' | 'luck' | 'reputation', number>>;
}

export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'jianghu',
    name: '仗剑江湖',
    tagline: '少年仗剑,快意恩仇',
    desc: '经典武侠成长线。从乡野少年到一代宗师,拜师、闯荡、恩怨、开宗立派。',
    baseFlag: 'scenario-jianghu',
    traits: [],
  },
  {
    id: 'swordsman',
    name: '独行剑客',
    tagline: '一剑一人,浪迹天涯',
    desc: '你是天生的剑客。无门无派,一人一剑走江湖,以剑会友,以剑证道。剑法进境极快,但人情冷暖需自担。',
    baseFlag: 'scenario-swordsman',
    traits: [
      { id: 'sword-orphan', name: '剑冢遗孤', rarity: 'rare', weight: 8, desc: '生于剑冢,自幼与剑为伴,剑即吾命。', attrMod: { agility: 8, wisdom: 5 }, flags: ['sword-soul'] },
      { id: 'lone-wolf', name: '孤狼之性', rarity: 'uncommon', weight: 9, desc: '独来独往,不喜结伴,剑法自悟。', attrMod: { agility: 5, wisdom: 4, reputation: -2 }, flags: ['lone'] },
      { id: 'sword-heart', name: '剑心通明', rarity: 'epic', weight: 6, desc: '心中唯有剑,万邪不侵,剑意天成。', attrMod: { agility: 10, wisdom: 8 }, flags: ['sword-heart'] },
      { id: 'wanderer-fate', name: '浪客命格', rarity: 'common', weight: 10, desc: '命中注定要浪迹天涯,行走江湖如鱼得水。', attrMod: { agility: 4, luck: 3 }, flags: ['wanderer-born'] },
    ],
    attrBias: { agility: 4, wisdom: 2 },
  },
  {
    id: 'assassin',
    name: '快意刺客',
    tagline: '十步一杀,千里独行',
    desc: '你是暗影中的刺客。隐于市井,一击必杀,以血还血,以牙还牙。身法与狠辣并存,但杀戮太重,难得善终。',
    baseFlag: 'scenario-assassin',
    traits: [
      { id: 'shadow-born', name: '暗影之子', rarity: 'rare', weight: 8, desc: '生于刺客世家,自幼习武于暗影之中。', attrMod: { agility: 9, strength: 4 }, flags: ['shadow'] },
      { id: 'blood-feud', name: '血仇在身', rarity: 'uncommon', weight: 9, desc: '身负血海深仇,出手狠辣,不留活口。', attrMod: { strength: 6, agility: 4, luck: -2 }, flags: ['bloodthirst'] },
      { id: 'kill-heart', name: '杀心成仁', rarity: 'epic', weight: 6, desc: '杀手之心坚如铁石,一击必杀,绝不失手。', attrMod: { agility: 11, strength: 6 }, flags: ['kill-heart'] },
      { id: 'night-walker', name: '夜行者', rarity: 'common', weight: 10, desc: '昼伏夜出,隐匿追踪样样精通。', attrMod: { agility: 5, luck: 2 }, flags: ['night'] },
    ],
    attrBias: { agility: 4, strength: 2 },
  },
];

export const SCENARIO_MAP: ReadonlyMap<ScenarioId, Scenario> = new Map(SCENARIOS.map((s) => [s.id, s]));

export function getScenario(id: ScenarioId): Scenario {
  const s = SCENARIO_MAP.get(id);
  if (!s) throw new Error(`未知剧本: ${id}`);
  return s;
}
