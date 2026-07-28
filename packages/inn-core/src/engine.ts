import { ORDER_MAP, ORDERS, RECIPES, RECIPE_MAP, STAFF, STAFF_MAP } from './data.js';

/** 客栈经营状态 */
export interface InnState {
  /** 银两 */
  silver: number;
  /** 口碑(解锁菜谱与订单) */
  renown: number;
  /** 已雇伙计 id */
  staff: string[];
  /** 已解锁菜谱 id */
  recipes: string[];
  /** 已完成订单 id */
  ordersDone: string[];
  /** 客栈等级(随口碑升) */
  level: number;
  /** 最后一次结算时间戳(ms) */
  lastTick: number;
  /** 累计经营秒数 */
  playedSec: number;
  log: { text: string; kind: 'info' | 'good' | 'system' }[];
}

const START_SILVER = 100;

export function newInn(now = Date.now()): InnState {
  return {
    silver: START_SILVER,
    renown: 0,
    staff: [],
    recipes: ['yangchun'], // 开局会阳春面
    ordersDone: [],
    level: 1,
    lastTick: now,
    playedSec: 0,
    log: [{ text: '你盘下城南一间小客栈,挂出招牌「悦来客栈」。从一碗阳春面开始,把生意做起来吧。', kind: 'system' }],
  };
}

function log(s: InnState, text: string, kind: InnState['log'][0]['kind'] = 'info'): void {
  s.log.push({ text, kind });
  if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
}

/** 每秒银两产出(伙计 + 口碑加成 + 菜谱加成) */
export function incomePerSec(s: InnState): number {
  let base = 0;
  for (const id of s.staff) {
    base += STAFF_MAP.get(id)?.income ?? 0;
  }
  // 无伙计也有微薄堂食收入
  base += 0.2;
  // 口碑与菜谱加成:每点口碑 +2%,每道菜谱额外 +5%
  const mult = 1 + s.renown * 0.02 + s.recipes.length * 0.05;
  return base * mult;
}

/** 客栈等级(按口碑) */
export function levelOf(renown: number): number {
  if (renown >= 55) return 5;
  if (renown >= 35) return 4;
  if (renown >= 20) return 3;
  if (renown >= 5) return 2;
  return 1;
}

/** 结算离线/在线经过的时间,产出银两。返回本秒实际入账(供显示)。 */
export function tick(s: InnState, now = Date.now()): number {
  const elapsed = Math.max(0, Math.floor((now - s.lastTick) / 1000));
  if (elapsed === 0) return 0;
  // 离线收益封顶 8 小时
  const capped = Math.min(elapsed, 8 * 3600);
  const gain = incomePerSec(s) * capped;
  s.silver += gain;
  s.playedSec += capped;
  s.lastTick = now;
  if (elapsed >= 60) {
    log(s, `经营 ${formatDuration(capped)},进账 ${Math.floor(gain)} 两。`, 'info');
  }
  return gain;
}

/** 雇佣伙计 */
export function hireStaff(s: InnState, staffId: string): boolean {
  const staff = STAFF_MAP.get(staffId);
  if (!staff || s.staff.includes(staffId) || s.silver < staff.cost) return false;
  s.silver -= staff.cost;
  s.staff.push(staffId);
  log(s, `你雇下了${staff.name}(${staff.role}),客栈更有生气了。`, 'good');
  return true;
}

/** 研习菜谱 */
export function learnRecipe(s: InnState, recipeId: string): boolean {
  const recipe = RECIPE_MAP.get(recipeId);
  if (!recipe || s.recipes.includes(recipeId) || s.silver < recipe.cost) return false;
  s.silver -= recipe.cost;
  s.recipes.push(recipeId);
  s.renown += recipe.renown;
  const newLevel = levelOf(s.renown);
  if (newLevel > s.level) {
    s.level = newLevel;
    log(s, `你研出【${recipe.name}】,客栈声名远播,升为 ${newLevel} 级客栈!`, 'good');
  } else {
    log(s, `你研出【${recipe.name}】,口碑 +${recipe.renown}。`, 'good');
  }
  return true;
}

/** 可接的订单(口碑达标且未完成) */
export function availableOrders(s: InnState): typeof ORDERS[number][] {
  return ORDERS.filter((o) => s.renown >= o.renownGate && !s.ordersDone.includes(o.id));
}

/** 完成订单 */
export function completeOrder(s: InnState, orderId: string): boolean {
  const order = ORDER_MAP.get(orderId);
  if (!order || s.renown < order.renownGate || s.ordersDone.includes(orderId)) return false;
  s.ordersDone.push(orderId);
  s.silver += order.reward;
  log(s, `你办妥了【${order.sect}】的席面,赚得 ${order.reward} 两!${order.desc}`, 'good');
  return true;
}

/** 伙计列表(带雇佣状态与可负担) */
export function staffList(s: InnState): { staff: typeof STAFF[number]; hired: boolean; affordable: boolean }[] {
  return STAFF.map((staff) => ({
    staff,
    hired: s.staff.includes(staff.id),
    affordable: s.silver >= staff.cost,
  }));
}

/** 菜谱列表(带研习状态与可负担) */
export function recipeList(s: InnState): { recipe: typeof RECIPES[number]; learned: boolean; affordable: boolean }[] {
  return RECIPES.map((recipe) => ({
    recipe,
    learned: s.recipes.includes(recipe.id),
    affordable: s.silver >= recipe.cost,
  }));
}

function formatDuration(sec: number): string {
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟`;
  return `${Math.floor(sec / 3600)} 小时 ${Math.floor((sec % 3600) / 60)} 分`;
}

/** 序列化/反序列化(localStorage 持久化) */
export function serializeInn(s: InnState): string {
  return JSON.stringify(s);
}
export function deserializeInn(json: string): InnState | null {
  try {
    const p = JSON.parse(json) as InnState;
    if (typeof p?.silver !== 'number' || !Array.isArray(p?.staff)) return null;
    return p;
  } catch {
    return null;
  }
}
