/**
 * 本地单机引擎 —— 在浏览器内直接驱动 game-core,并用 localStorage 持久化。
 * 与 apps/api 的 HTTP 版功能等价,但零后端依赖。后端代码保留,可随时切回(见 api.ts)。
 */
import {
  ATTR_LABELS,
  RARITY_COLORS,
  RARITY_LABELS,
  INITIAL_POINTS,
  REROLL_MAX,
  rollTraits as coreRollTraits,
  startLife as coreStartLife,
  advanceYear as coreAdvanceYear,
  getSkill,
  type Allocation,
  type Attributes,
  type AttrKey,
  type Rarity,
  type StageId,
  type Trait,
  type YearResult,
  type LifeState,
} from '@game/game-core';

export interface Meta {
  attrLabels: Record<AttrKey, string>;
  rarityLabels: Record<Rarity, string>;
  rarityColors: Record<Rarity, string>;
  initialPoints: number;
  rerollMax: number;
}

export interface RolledTraitsData {
  traits: Trait[];
  rerollLeft: number;
}

export interface StartLifeData {
  lifeId: string;
  age: number;
  attrs: Attributes;
  traits: string[];
  pendingPoints: number;
}

export interface HeirInfo {
  name: string;
  bornAtAge: number;
  bonusAttrs: Partial<Attributes>;
  inheritedFlag?: string;
}

export type AdvanceData = YearResult & {
  lifeId: string;
  pendingPoints: number;
  skills: string[];
  spouse?: string;
  pet?: string;
  heirs: HeirInfo[];
  enemyCount: number;
  allyCount: number;
};

export interface LifeRow {
  id: string;
  name: string;
  final_age: number;
  ending_id: string;
  ending_title: string;
  evaluation: string;
  cause: string;
  traits: string;
  attrs: string;
  created_at: string;
}

export interface LifeYear {
  id: number;
  life_id: string;
  age: number;
  stage: StageId | string;
  event_text: string;
  attr_snapshot: Attributes;
}

export interface LifeDetail extends Omit<LifeRow, 'traits' | 'attrs'> {
  traits: string[];
  attrs: Attributes;
  years: LifeYear[];
}

// ==================== localStorage 持久化 ====================
const SESSIONS_KEY = 'life-restart:sessions';
const LIVES_KEY = 'life-restart:lives';
const YEARS_KEY = 'life-restart:years';

/** 进行中对局(lifeId -> 序列化状态) */
type SessionMap = Record<string, { name: string; state: string }>;
/** 已完结人生列表 */
type LiveList = LifeRow[];
/** 逐年流水(lifeId -> 年数组) */
type YearMap = Record<string, LifeYear[]>;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 存储满则忽略 */
  }
}

// LifeState 的 flags/skills 是 Set,序列化需转数组
interface SerializedState extends Omit<LifeState, 'flags' | 'skills' | 'ending'> {
  flags: string[];
  skills: string[];
  ending?: LifeState['ending'];
}
function serializeState(s: LifeState): string {
  const { flags, skills, ...rest } = s;
  const out: SerializedState = { ...rest, flags: [...flags], skills: [...skills] };
  return JSON.stringify(out);
}
function deserializeState(json: string): LifeState {
  const parsed = JSON.parse(json) as SerializedState;
  return {
    ...parsed,
    flags: new Set(parsed.flags),
    skills: new Set(parsed.skills ?? []),
    enemies: parsed.enemies ?? [],
    allies: parsed.allies ?? [],
    heirs: parsed.heirs ?? [],
  };
}

const uuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `life-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const nowIso = (): string => new Date().toISOString().replace('T', ' ').slice(0, 19);

// ==================== 与 HTTP 版等价的本地实现 ====================

export async function fetchMeta(): Promise<Meta> {
  return {
    attrLabels: ATTR_LABELS,
    rarityLabels: RARITY_LABELS,
    rarityColors: RARITY_COLORS,
    initialPoints: INITIAL_POINTS,
    rerollMax: REROLL_MAX,
  };
}

export async function rollTraits(): Promise<RolledTraitsData> {
  const { traits, rerollLeft } = coreRollTraits(3);
  return { traits, rerollLeft };
}

export async function startLife(input: {
  traitIds: string[];
  name?: string;
  initialAlloc?: Allocation;
}): Promise<StartLifeData> {
  if (!Array.isArray(input.traitIds) || input.traitIds.length === 0) {
    throw new Error('请至少选择一个词条,方能踏入江湖。');
  }
  const state = coreStartLife(input.traitIds, input.initialAlloc ?? {});
  const lifeId = uuid();
  const sessions = read<SessionMap>(SESSIONS_KEY, {});
  sessions[lifeId] = { name: input.name ?? '无名侠客', state: serializeState(state) };
  write(SESSIONS_KEY, sessions);
  return {
    lifeId,
    age: state.age,
    attrs: state.attrs,
    traits: state.traits,
    pendingPoints: state.pendingPoints,
  };
}

export async function advanceLife(lifeId: string, alloc?: Allocation): Promise<AdvanceData> {
  const sessions = read<SessionMap>(SESSIONS_KEY, {});
  const sess = sessions[lifeId];
  if (!sess) throw new Error('对局不存在');
  const state = deserializeState(sess.state);
  if (state.finished) throw new Error('此生已落幕');

  const result = coreAdvanceYear(state, alloc ?? {});

  // 逐年流水
  const years = read<YearMap>(YEARS_KEY, {});
  const list = years[lifeId] ?? [];
  list.push({
    id: list.length + 1,
    life_id: lifeId,
    age: result.age,
    stage: result.stage,
    event_text: result.text,
    attr_snapshot: result.attrs,
  });
  years[lifeId] = list;
  write(YEARS_KEY, years);

  // 终局落库
  if (result.finished && result.ending) {
    const e = result.ending;
    const lives = read<LiveList>(LIVES_KEY, []);
    lives.unshift({
      id: lifeId,
      name: sess.name || '无名侠客',
      final_age: e.finalAge,
      ending_id: e.id,
      ending_title: e.title,
      evaluation: e.evaluation,
      cause: e.cause,
      traits: JSON.stringify(state.traits),
      attrs: JSON.stringify(result.attrs),
      created_at: nowIso(),
    });
    write(LIVES_KEY, lives);
  }

  // 保存对局(即使完结也保留,便于回看)
  sessions[lifeId] = { name: sess.name, state: serializeState(state) };
  write(SESSIONS_KEY, sessions);

  const skillNames = [...state.skills].map((id) => {
    try {
      return getSkill(id).name;
    } catch {
      return id;
    }
  });
  return {
    ...result,
    lifeId,
    pendingPoints: state.pendingPoints,
    skills: skillNames,
    spouse: state.spouse,
    pet: state.pet,
    heirs: state.heirs,
    enemyCount: state.enemies.length,
    allyCount: state.allies.length,
  };
}

export async function fetchLives(): Promise<LifeRow[]> {
  return read<LiveList>(LIVES_KEY, []);
}

export async function fetchLifeDetail(id: string): Promise<LifeDetail> {
  const lives = read<LiveList>(LIVES_KEY, []);
  const life = lives.find((l) => l.id === id);
  if (!life) throw new Error('未找到该人生');
  const years = read<YearMap>(YEARS_KEY, {});
  return {
    ...life,
    traits: JSON.parse(life.traits) as string[],
    attrs: JSON.parse(life.attrs) as Attributes,
    years: years[id] ?? [],
  };
}
