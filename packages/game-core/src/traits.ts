import type { Rarity, Trait } from './types.js';

export const RARITY_ORDER: readonly Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
];

export const RARITY_LABELS: Record<Rarity, string> = {
  common: '凡品',
  uncommon: '良品',
  rare: '珍品',
  epic: '绝品',
  legendary: '传说',
};

/** 稀有度配色(前端展示) */
export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9aa0a6',
  uncommon: '#34a853',
  rare: '#1a73e8',
  epic: '#a142f4',
  legendary: '#f29900',
};

/** 各稀有度被抽中的基础权重(一手 3 条,按稀有度先定档再定条) */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 42,
  uncommon: 28,
  rare: 17,
  epic: 9,
  legendary: 4,
};

/**
 * 词条表 —— 「少年仗剑江湖路」剧本开局天赋。
 * attrMod 为对初始属性的修正;flags 供事件/结局触发专属分支。
 * 权重在同稀有度内做二次随机。
 */
export const TRAITS: readonly Trait[] = [
  // —— 凡品 common ——
  {
    id: 'shen-qiang-li-zhuang',
    name: '身强力壮',
    rarity: 'common',
    weight: 10,
    desc: '自幼干农活练就一把蛮力,寻常三五人近不得身。',
    attrMod: { strength: 6, constitution: 2 },
  },
  {
    id: 'shou-ji-yan-kuai',
    name: '手疾眼快',
    rarity: 'common',
    weight: 10,
    desc: '抓鸡摸鱼练就的好身手,出招总比人快半分。',
    attrMod: { agility: 6 },
  },
  {
    id: 'pi-cao-rou-hou',
    name: '皮糙肉厚',
    rarity: 'common',
    weight: 9,
    desc: '挨打长大,皮肉结实,寻常拳脚伤不得筋骨。',
    attrMod: { constitution: 7 },
  },
  {
    id: 'cong-ming-ling-li',
    name: '聪明伶俐',
    rarity: 'common',
    weight: 9,
    desc: '过目成诵,村里私塾先生都说你是块读书的料。',
    attrMod: { wisdom: 7 },
  },
  {
    id: 'mian-xiang-he-shan',
    name: '面善',
    rarity: 'common',
    weight: 8,
    desc: '天生一副和善面孔,走哪儿都有人愿意搭把手。',
    attrMod: { reputation: 4, luck: 2 },
  },
  {
    id: 'jia-tu-si-bi',
    name: '家徒四壁',
    rarity: 'common',
    weight: 8,
    desc: '穷得叮当响,却也磨出你能吃苦的韧劲。',
    attrMod: { constitution: 3, wisdom: 3, luck: -2 },
    flags: ['poor'],
  },
  {
    id: 'gu-er',
    name: '孤儿',
    rarity: 'common',
    weight: 6,
    desc: '襁褓中父母双亡,吃百家饭长大,心里憋着一股劲。',
    attrMod: { wisdom: 4, constitution: 3 },
    flags: ['orphan'],
  },

  // —— 良品 uncommon ——
  {
    id: 'wu-lin-shi-jia',
    name: '武林世家',
    rarity: 'uncommon',
    weight: 10,
    desc: '家中祖辈便行走江湖,自幼耳濡目染习得家传武艺。',
    attrMod: { strength: 4, agility: 4, wisdom: 2, reputation: 3 },
    flags: ['martial-family'],
  },
  {
    id: 'lang-zhong-di-zi',
    name: '郎中弟子',
    rarity: 'uncommon',
    weight: 8,
    desc: '随赤脚大夫学过几年岐黄之术,识得百草、接得断骨。',
    attrMod: { wisdom: 5, constitution: 3 },
    flags: ['healer'],
  },
  {
    id: 'lie-hu-zhi-zi',
    name: '猎户之子',
    rarity: 'uncommon',
    weight: 8,
    desc: '山中打猎为生,箭不虚发,深谙追踪与隐匿之道。',
    attrMod: { agility: 5, strength: 3 },
    flags: ['hunter'],
  },
  {
    id: 'tie-jiang-tu-di',
    name: '铁匠徒弟',
    rarity: 'uncommon',
    weight: 7,
    desc: '抡了三年大锤,臂力惊人,也识得好兵刃的火候。',
    attrMod: { strength: 7, constitution: 2 },
    flags: ['smith'],
  },
  {
    id: 'shu-sheng',
    name: '书生',
    rarity: 'uncommon',
    weight: 7,
    desc: '十年寒窗,腹有诗书,于武理心法自有一番见解。',
    attrMod: { wisdom: 8, strength: -2 },
    flags: ['scholar'],
  },
  {
    id: 'fu-jia-zi-di',
    name: '富家子弟',
    rarity: 'uncommon',
    weight: 6,
    desc: '家中薄有资财,行走江湖盘缠无忧。',
    attrMod: { luck: 4, reputation: 2 },
    flags: ['rich'],
  },

  // —— 珍品 rare ——
  {
    id: 'tian-sheng-shen-li',
    name: '天生神力',
    rarity: 'rare',
    weight: 8,
    desc: '生有神力,千斤重担等闲视之,是为练武奇才。',
    attrMod: { strength: 12, constitution: 4 },
    flags: ['mighty'],
  },
  {
    id: 'jing-mai-qi-te',
    name: '经脉奇特',
    rarity: 'rare',
    weight: 7,
    desc: '任督二脉天生宽阔,内力进境一日千里。',
    attrMod: { constitution: 9, wisdom: 5 },
    flags: ['inner-force'],
  },
  {
    id: 'guo-mu-bu-wang',
    name: '过目不忘',
    rarity: 'rare',
    weight: 7,
    desc: '任何武功招式看一遍便能记下,悟性冠绝同侪。',
    attrMod: { wisdom: 12 },
    flags: ['photographic-memory'],
  },
  {
    id: 'fu-da-ming-da',
    name: '福大命大',
    rarity: 'rare',
    weight: 6,
    desc: '命格极硬,多少次险死还生,总能化险为夷。',
    attrMod: { luck: 12, constitution: 3 },
    flags: ['lucky'],
  },
  {
    id: 'xue-hai-shen-chou',
    name: '血海深仇',
    rarity: 'rare',
    weight: 5,
    desc: '满门被奸人所害,你活着只为手刃仇人的那一天。',
    attrMod: { strength: 5, wisdom: 5 },
    flags: ['revenge'],
  },

  // —— 绝品 epic ——
  {
    id: 'jue-dai-jian-gu',
    name: '绝代剑骨',
    rarity: 'epic',
    weight: 8,
    desc: '天生剑骨,与剑有莫名亲和,万剑朝宗之资。',
    attrMod: { agility: 8, wisdom: 8, strength: 3 },
    flags: ['sword-bone'],
  },
  {
    id: 'bai-du-bu-qin',
    name: '百毒不侵',
    rarity: 'epic',
    weight: 7,
    desc: '幼食异草,从此百毒不侵,蛇虫避而远之。',
    attrMod: { constitution: 12, luck: 4 },
    flags: ['poison-immune'],
  },
  {
    id: 'shen-tou-luo-han',
    name: '神偷罗汉',
    rarity: 'epic',
    weight: 6,
    desc: '身法轻灵如燕,踏雪无痕,来去无影。',
    attrMod: { agility: 14, luck: 3 },
    flags: ['nimble'],
  },
  {
    id: 'long-xiang-hu-bu',
    name: '龙象虎步',
    rarity: 'epic',
    weight: 6,
    desc: '骨骼精奇,行路带风,天生横练的坯子。',
    attrMod: { strength: 10, constitution: 10 },
    flags: ['iron-body'],
  },

  // —— 传说 legendary ——
  {
    id: 'wu-xue-qi-cai',
    name: '武学奇才',
    rarity: 'legendary',
    weight: 7,
    desc: '百年难遇的练武奇才,任何武功一学就会、一会就精。',
    attrMod: { strength: 6, agility: 6, constitution: 6, wisdom: 6 },
    flags: ['prodigy'],
  },
  {
    id: 'jin-shu-chuan-cheng',
    name: '锦书传承',
    rarity: 'legendary',
    weight: 6,
    desc: '怀中揣着半卷绝世秘籍,得之可纵横天下。',
    attrMod: { wisdom: 10, luck: 6 },
    flags: ['secret-manual'],
  },
  {
    id: 'tian-ming-zhi-zi',
    name: '天命之子',
    rarity: 'legendary',
    weight: 5,
    desc: '天命所归,这一生注定不凡,逢凶化吉,遇难成祥。',
    attrMod: { luck: 16, constitution: 5, reputation: 4 },
    flags: ['chosen-one'],
  },
];

export const TRAIT_MAP: ReadonlyMap<string, Trait> = new Map(TRAITS.map((t) => [t.id, t]));

export function getTrait(id: string): Trait {
  const t = TRAIT_MAP.get(id);
  if (!t) throw new Error(`未知词条: ${id}`);
  return t;
}
