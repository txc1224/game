import type {
  Allocation,
  Attributes,
  Ending,
  EventContext,
  HeirInfo,
  RolledTraits,
  StageId,
  Trait,
  YearResult,
} from './types.js';
import { cryptoRng, seededRng, weightedIndex, type Rng } from './rng.js';
import { RARITY_ORDER, RARITY_WEIGHTS, TRAITS, getTrait } from './traits.js';
import { getScenario, type Scenario, type ScenarioId } from './scenarios.js';
import {
  BASE_ATTRS,
  INITIAL_POINTS,
  POINTS_PER_YEAR,
  applyAllocation,
  applyMod,
  combatPower,
  deriveLifespan,
  renownScore,
} from './attributes.js';
import { checkSuddenDeath, pickEvent } from './events.js';
import { getSkill } from './skills.js';

export interface EngineOptions {
  rng?: Rng;
  /** 传 seed 则用可复现随机(测试用) */
  seed?: number;
}

function resolveRng(opts?: EngineOptions): Rng {
  if (opts?.rng) return opts.rng;
  if (opts?.seed !== undefined) return seededRng(opts.seed);
  return cryptoRng;
}

/**
 * 对局状态(引擎持有,后端按 lifeId 存档于内存/DB)。
 * 注意:这是权威状态,DB 仅做持久化快照。
 */
export interface LifeState {
  age: number;
  attrs: Attributes;
  flags: Set<string>;
  traits: string[]; // 词条 id
  /** 开局定下的寿元基数(基于初始根骨,之后根骨增减不影响寿命) */
  baseLifespan: number;
  lifespanDelta: number;
  pendingPoints: number;
  history: string[]; // 重大事件 flag
  dead: boolean;
  finished: boolean;
  ending?: Ending;
  /** 已修习的武功 id */
  skills: Set<string>;
  /** 仇敌 */
  enemies: string[];
  /** 盟友/结拜/门派 */
  allies: string[];
  /** 配偶名 */
  spouse?: string;
  /** 子嗣 */
  heirs: HeirInfo[];
  /** 灵兽/宠物 */
  pet?: string;
}

/** 按稀有度先定档、再在档内按权重二次随机,抽 count 条互不重复的词条。可带剧本(并入专属词条池) */
export function rollTraits(count = 3, opts?: EngineOptions & { scenario?: ScenarioId }): RolledTraits {
  const rng = resolveRng(opts);
  const chosen = new Set<string>();
  const result: Trait[] = [];

  // 剧本池:共享词条 + 剧本专属词条
  const scenario = opts?.scenario ? getScenario(opts.scenario) : null;
  const traitPool = scenario ? [...TRAITS, ...scenario.traits] : TRAITS;

  let guard = 0;
  while (result.length < count && guard < 200) {
    guard++;
    // 1) 先抽稀有度档
    const rarityIdx = weightedIndex(rng, RARITY_ORDER.map((r) => RARITY_WEIGHTS[r]));
    const rarity = RARITY_ORDER[rarityIdx]!;
    // 2) 在该档内抽取(排除已选)
    const pool = traitPool.filter((t) => t.rarity === rarity && !chosen.has(t.id));
    if (pool.length === 0) continue;
    const idx = weightedIndex(rng, pool.map((t) => t.weight));
    const t = pool[idx]!;
    chosen.add(t.id);
    result.push(t);
  }

  return { traits: result, rerollLeft: REROLL_MAX };
}

export const REROLL_MAX = 3;

/** 查词条:先共享池,再剧本专属池 */
function getTraitAny(id: string, scenario: Scenario | null): Trait {
  const shared = TRAITS.find((t) => t.id === id);
  if (shared) return shared;
  const inScenario = scenario?.traits.find((t) => t.id === id);
  if (inScenario) return inScenario;
  return getTrait(id); // 让标准 getTrait 抛出统一错误
}

/** 以选定词条 + 初始加点开局,返回初始对局状态。可带剧本(基调 flag + 属性倾向) */
export function startLife(
  traitIds: string[],
  initialAlloc: Allocation,
  opts?: EngineOptions & { scenario?: ScenarioId },
): LifeState {
  if (traitIds.length === 0) throw new Error('至少需要一个词条');
  const scenario = opts?.scenario ? getScenario(opts.scenario) : null;
  let attrs = { ...BASE_ATTRS };
  if (scenario?.attrBias) attrs = applyMod(attrs, scenario.attrBias);
  const flags = new Set<string>();
  if (scenario) flags.add(scenario.baseFlag);
  // 剧本词条也需能查到(并入 TRAIT_MAP)
  for (const id of traitIds) {
    const t = getTraitAny(id, scenario);
    attrs = applyMod(attrs, t.attrMod);
    for (const f of t.flags ?? []) flags.add(f);
  }
  const validated = applyAllocation(attrs, initialAlloc, INITIAL_POINTS);
  return {
    age: 0,
    attrs: validated,
    flags,
    traits: [...traitIds],
    baseLifespan: deriveLifespan(validated.constitution),
    lifespanDelta: 0,
    pendingPoints: 0,
    history: [],
    dead: false,
    finished: false,
    skills: new Set(),
    enemies: [],
    allies: [],
    heirs: [],
  };
}

export function stageOfAge(age: number): StageId {
  if (age <= 11) return 'childhood';
  if (age <= 17) return 'apprentice';
  if (age <= 24) return 'jianghu';
  if (age <= 39) return 'feud';
  if (age <= 54) return 'sect';
  return 'master';
}

/**
 * 推进一年。
 * alloc 为本年加点(可省略);返回当年的叙述与结算结果。
 * 若本年死亡或寿终,finished=true 且带 ending。
 */
export function advanceYear(state: LifeState, alloc: Allocation = {}, opts?: EngineOptions): YearResult {
  const rng = resolveRng(opts);
  if (state.finished) throw new Error('此生已落幕,无法继续推进');

  // 1) 发放并应用本年加点
  state.pendingPoints += POINTS_PER_YEAR;
  const hasAlloc = Object.values(alloc).some((v) => (v ?? 0) > 0);
  if (hasAlloc) {
    state.attrs = applyAllocation(state.attrs, alloc, state.pendingPoints);
    // 扣掉已用的点(近似:用掉多少扣多少)
    const spent = Object.values(alloc).reduce((s, v) => s + (v ?? 0), 0);
    state.pendingPoints = Math.max(0, state.pendingPoints - spent);
  }

  // 2) 长大一岁,构造事件上下文
  state.age += 1;
  const ctx: EventContext = {
    age: state.age,
    stage: stageOfAge(state.age),
    attrs: state.attrs,
    flags: state.flags,
    lifespanDelta: state.lifespanDelta,
    history: state.history,
    skills: state.skills,
    enemies: state.enemies,
    allies: state.allies,
    spouse: state.spouse,
    heirs: state.heirs,
    pet: state.pet,
  };

  // 3) 选事件并结算(run 一次性完成叙事与结算)
  const evt = pickEvent(ctx, rng);
  const { text, flags: gained } = evt.run(ctx, rng);
  for (const f of gained) {
    state.flags.add(f);
    state.history.push(f);
  }
  state.attrs = ctx.attrs; // effect 可能整体替换 attrs
  state.lifespanDelta = ctx.lifespanDelta;
  // 回写新维度(ctx 与 state 共享引用,数组/Set 原地可变;标量字段显式同步)
  state.spouse = ctx.spouse;
  state.pet = ctx.pet;

  // 4) 死亡判定:寿终 or 横祸。寿元以开局根骨定下的 baseLifespan 为准,后续根骨增减不影响寿命。
  //    但根骨亏空会逐年侵蚀寿元(身体垮了),表现为缓慢折寿而非暴毙。
  if (state.attrs.constitution <= 2) {
    state.lifespanDelta -= 1;
  }
  const lifespan = state.baseLifespan + state.lifespanDelta;
  let dead = false;
  let cause: string | undefined;

  const sudden = checkSuddenDeath(ctx, rng);
  if (sudden) {
    dead = true;
    cause = sudden;
  } else if (state.age >= lifespan) {
    dead = true;
    cause = '寿终正寝,无疾而终';
  }

  let ending: Ending | undefined;
  if (dead) {
    ending = resolveEnding(state, cause ?? '寿终正寝');
    state.dead = true;
    state.finished = true;
    state.ending = ending;
  }

  return {
    age: state.age,
    stage: stageOfAge(state.age),
    text,
    attrs: { ...state.attrs },
    gainedFlags: gained,
    dead,
    causeOfDeath: cause,
    finished: state.finished,
    ending,
  };
}

/** 依据最终属性与经历给出结局称号与评价 */
export function resolveEnding(state: LifeState, cause: string): Ending {
  const a = state.attrs;
  const renown = renownScore(a);
  const power = combatPower(a);
  const f = state.flags;
  const finalAge = state.age;

  // 习武成果与传承(附加到每个结局上)
  const skills = [...state.skills].map((id) => {
    try { return getSkill(id).name; } catch { return id; }
  });
  const legacy = buildLegacy(state);
  const extra: Pick<Ending, 'skills' | 'legacy'> = {
    ...(skills.length > 0 ? { skills } : {}),
    ...(legacy ? { legacy } : {}),
  };

  // 早夭
  if (finalAge < 18) {
    return {
      id: 'died-young',
      title: '夭折',
      finalAge,
      cause,
      evaluation: `你年仅${finalAge}岁便${cause},江湖梦碎,空留无限怅惘。若有来世,愿你走得长远些。`,
      ...extra,
    };
  }

  // 非善终(横死/被害/重伤而亡)优先判定 —— 不管生前多风光,死于非命总是遗憾
  const violentDeath = cause.includes('横死') || cause.includes('暗算') || cause.includes('葬身') || cause.includes('含恨') || cause.includes('油尽灯枯') || cause.includes('撒手人寰');
  if (violentDeath) {
    return {
      id: 'tragic-death',
      title: '英年早逝',
      finalAge,
      cause,
      evaluation: `你一生闯荡江湖,却在${finalAge}岁那年${cause}。快意恩仇一场空,只余一声叹息。`,
      ...extra,
    };
  }

  // 剧本专属结局(在通用结局之前判定)
  // 独行剑客:剑心通明 → 剑仙
  if (f.has('scenario-swordsman') && (f.has('sword-heart') || (f.has('sword-soul') && a.agility >= 40))) {
    return {
      id: 'sword-immortal',
      title: '剑仙',
      finalAge,
      cause,
      evaluation: `你一生与剑相伴,无门无派,一人一剑证道。${finalAge}岁那年${cause},你的剑意长存天地之间,后世剑客皆以一睹你的剑碑为荣。`,
      ...extra,
    };
  }
  // 快意刺客:杀心成仁 → 刺客之王
  if (f.has('scenario-assassin') && (f.has('kill-heart') || f.has('shadow'))) {
    return {
      id: 'assassin-king',
      title: '刺客之王',
      finalAge,
      cause,
      evaluation: `你一生隐于暗影,十步一杀,千里独行,手下从无活口。${finalAge}岁那年${cause},你的名字成了江湖上最致命的传说,夜行者至今奉你为祖。`,
      ...extra,
    };
  }

  // 毒王(化功大法 + 阴狠路线 + 多门毒/邪功)
  if (state.skills.has('huagong') && f.has('made-enemies') && state.skills.size >= 3 && a.reputation < 20) {
    return {
      id: 'poison-king',
      title: '毒王',
      finalAge,
      cause,
      evaluation: `你一身化功大法阴狠毒辣,杀人于无形,武林中人闻风丧胆。${finalAge}岁那年${cause},一代毒王就此陨落,江湖人称快亦唏嘘。`,
      ...extra,
    };
  }

  // 剑神(独孤九剑 + 剑道 flag)
  if (state.skills.has('dugu-sword') && (f.has('sword-master') || f.has('sword-affinity'))) {
    return {
      id: 'sword-god',
      title: '剑神',
      finalAge,
      cause,
      evaluation: `你尽得独孤九剑真传,无招胜有招,破尽天下武学。${finalAge}岁那年${cause},一代剑神归尘,剑道从此绝响。`,
      ...extra,
    };
  }

  // 传说级结局
  if (f.has('living-legend') || f.has('hero-of-realm') || (f.has('chosen-one') && renown >= 70)) {
    return {
      id: 'legend',
      title: '武林神话',
      finalAge,
      cause,
      evaluation: `你一生行侠仗义,力挽狂澜,救苍生于水火。${finalAge}岁那年${cause},你的事迹被写入戏文,代代传唱,你已是活着的传奇。`,
      ...extra,
    };
  }

  // 武学宗师(掌握多门上乘武功)
  if (state.skills.size >= 3) {
    return {
      id: 'martial-scholar',
      title: '武学宗师',
      finalAge,
      cause,
      evaluation: `你博采众长,兼修${skills.slice(0, 3).join('、')}等上乘武学,融会贯通自成一家。${finalAge}岁那年${cause},你的武学为后世所宗。`,
      ...extra,
    };
  }

  // 宗师
  if (f.has('sect-founder') || renown >= 60 || power >= 90 || f.has('manual-mastered')) {
    return {
      id: 'grandmaster',
      title: '一代宗师',
      finalAge,
      cause,
      evaluation: `你武学造诣登峰造极,桃李满门,名动天下。${finalAge}岁那年${cause},武林同道无不扼腕,你所开一脉自此香火绵延。`,
      ...extra,
    };
  }

  // 剑圣
  if (f.has('sword-master')) {
    return {
      id: 'sword-sage',
      title: '剑圣',
      finalAge,
      cause,
      evaluation: `你一生与剑为伴,剑道已臻化境,万剑俯首。${finalAge}岁那年${cause},江湖从此少了一位剑中圣手。`,
      ...extra,
    };
  }

  // 侠士
  if (f.has('righteous-deed') || f.has('folk-hero') || a.reputation >= 25) {
    return {
      id: 'hero',
      title: '侠客',
      finalAge,
      cause,
      evaluation: `你快意恩仇,扶危济困,一生光明磊落。${finalAge}岁那年${cause},受过你恩惠的百姓自发为你送行,侠名远播。`,
      ...extra,
    };
  }

  // 复仇者
  if (f.has('revenge-done')) {
    return {
      id: 'avenger',
      title: '快意恩仇',
      finalAge,
      cause,
      evaluation: `你隐忍半生,手刃血仇,恩怨两清。${finalAge}岁那年${cause},大仇已报,你走得无牵无挂。`,
      ...extra,
    };
  }

  // 归隐
  if (f.has('recluse')) {
    return {
      id: 'recluse',
      title: '抱憾归隐',
      finalAge,
      cause,
      evaluation: `你看破红尘,归隐山林,粗茶淡饭度余生。${finalAge}岁那年${cause},一生波澜不惊,倒也自在。`,
      ...extra,
    };
  }

  // 平凡
  return {
    id: 'common-folk',
    title: '平凡一生',
    finalAge,
    cause,
    evaluation: `你在江湖边缘浮沉一生,虽未闯出偌大的名头,却也平安喜乐。${finalAge}岁那年${cause},这一生,值了。`,
    ...extra,
  };
}

/** 由子嗣/配偶/盟友生成传承评价(附加到结局) */
function buildLegacy(state: LifeState): string | undefined {
  const parts: string[] = [];
  if (state.spouse) parts.push(`与${state.spouse}白头偕老`);
  if (state.heirs.length > 0) {
    const grown = state.heirs.filter((h) => state.age - h.bornAtAge >= 16);
    const names = state.heirs.map((h) => h.name).join('、');
    if (grown.length > 0) {
      parts.push(`膝下${names}已长大成人,继承你的衣钵`);
    } else {
      parts.push(`留下幼子${names},尚在襁褓`);
    }
  }
  if (state.allies.length > 0) parts.push(`与${state.allies.join('、')}结为生死之交`);
  if (parts.length === 0) return undefined;
  return parts.join(';') + '。';
}
