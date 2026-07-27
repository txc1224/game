/**
 * 全局共享类型定义 —— 前后端单一事实源。
 * 注意:属性键使用英文枚举,中文名仅用于展示层,避免 JSON 序列化的键不一致问题。
 */

/** 六维属性的英文键(存储/传输用) */
export type AttrKey =
  | 'strength' // 臂力
  | 'agility' // 身法
  | 'constitution' // 根骨
  | 'wisdom' // 悟性
  | 'luck' // 福缘
  | 'reputation'; // 声望

/** 六维属性表(数值通常 0~100,寿元由 constitution 推导) */
export type Attributes = Record<AttrKey, number>;

/** 词条稀有度 */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** 词条(开局天赋) */
export interface Trait {
  id: string;
  /** 展示名,如「天生神力」 */
  name: string;
  rarity: Rarity;
  /** 抽取权重(越大越易出),同稀有度内再按权重二次随机 */
  weight: number;
  /** 一句话描述 */
  desc: string;
  /** 对初始属性的修正(可正可负) */
  attrMod: Partial<Attributes>;
  /** 专属剧情/机制标记,事件与结局据此触发分支 */
  flags?: string[];
}

/** 人生阶段(剧本分幕) */
export type StageId = 'childhood' | 'apprentice' | 'jianghu' | 'feud' | 'sect' | 'master';

/** 玩家每年可分配的属性点去向 */
export type Allocation = Partial<Record<AttrKey, number>>;

/** 事件执行上下文(事件 effect 读改它) */
export interface EventContext {
  age: number;
  stage: StageId;
  attrs: Attributes;
  flags: Set<string>;
  /** 累计寿命偏移(可被奇遇/重伤修改) */
  lifespanDelta: number;
  /** 经历过的重大事件(供结局评价引用) */
  history: string[];
}

/** 推进一年的产出 */
export interface YearResult {
  age: number;
  stage: StageId;
  /** 当年的人生叙述文本 */
  text: string;
  /** 当年结算后的属性快照 */
  attrs: Attributes;
  /** 当年新增的剧情 flag */
  gainedFlags: string[];
  /** 是否已死亡(本年为终年) */
  dead: boolean;
  /** 死因(若 dead) */
  causeOfDeath?: string;
  /** 是否寿终正寝之外、已可结算 */
  finished: boolean;
  /** 结局结算(若 finished) */
  ending?: Ending;
}

/** 结局结算 */
export interface Ending {
  /** 结局 id */
  id: string;
  /** 称号,如「一代宗师」 */
  title: string;
  /** 评价正文 */
  evaluation: string;
  /** 终年 */
  finalAge: number;
  /** 死因或善终说明 */
  cause: string;
}

/** 开局接口返回的一手词条 */
export interface RolledTraits {
  traits: Trait[];
  rerollLeft: number;
}
