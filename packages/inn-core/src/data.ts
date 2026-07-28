/** 武侠客栈数据 —— 伙计/菜谱/门派订单。纯数据。 */

/** 伙计(雇员):提供不同收益 */
export interface Staff {
  id: string;
  name: string;
  role: string;
  /** 每秒银两产出 */
  income: number;
  /** 雇佣成本 */
  cost: number;
  desc: string;
}

export const STAFF: readonly Staff[] = [
  { id: 'huoji', name: '跑堂伙计', role: '跑堂', income: 1, cost: 50, desc: '端茶送水,手脚麻利。' },
  { id: 'chuniang', name: '厨娘', role: '后厨', income: 2, cost: 150, desc: '一手家常菜,留住回头客。' },
  { id: 'zhanggui', name: '账房先生', role: '账房', income: 4, cost: 400, desc: '精打细算,一文不落。' },
  { id: 'biaoshi', name: '镖师护卫', role: '护卫', income: 8, cost: 1000, desc: '镇得住场子,客商安心。' },
  { id: 'mingchu', name: '名厨世家', role: '主厨', income: 15, cost: 2500, desc: '御厨之后,一菜难求。' },
];

/** 菜谱(解锁提升口碑与订单单价) */
export interface Recipe {
  id: string;
  name: string;
  /** 解锁成本 */
  cost: number;
  /** 口碑提升 */
  renown: number;
  desc: string;
}

export const RECIPES: readonly Recipe[] = [
  { id: 'yangchun', name: '阳春面', cost: 30, renown: 2, desc: '一碗热汤面,暖客肠胃。' },
  { id: 'hongshao', name: '红烧肉', cost: 100, renown: 5, desc: '肥而不腻,入口即化。' },
  { id: 'dengying', name: '灯影牛肉', cost: 300, renown: 12, desc: '薄如蝉翼,麻辣鲜香。' },
  { id: 'fo-tiao-qiang', name: '佛跳墙', cost: 800, renown: 25, desc: '坛启荤香飘四邻,佛闻弃禅跳墙来。' },
  { id: 'manhan', name: '满汉全席', cost: 2000, renown: 60, desc: '一百零八道,天下至味。' },
];

/** 门派订单(高价值,需口碑门槛) */
export interface Order {
  id: string;
  sect: string;
  /** 口碑门槛 */
  renownGate: number;
  /** 报酬 */
  reward: number;
  desc: string;
}

export const ORDERS: readonly Order[] = [
  { id: 'shaolin', sect: '少林武僧团', renownGate: 5, reward: 200, desc: '武僧下山化缘,要一百份素斋。' },
  { id: 'wudang', sect: '武当道长', renownGate: 12, reward: 500, desc: '道长云游至此,要置办斋宴。' },
  { id: 'emei', sect: '峨眉女侠', renownGate: 20, reward: 1200, desc: '女侠们要办及笄宴,须得上好席面。' },
  { id: 'gaibang', sect: '丐帮大会', renownGate: 35, reward: 3000, desc: '丐帮开大会,千人流水席。' },
  { id: 'wulin-meng', sect: '武林盟主', renownGate: 55, reward: 8000, desc: '盟主广发英雄帖,宴请天下豪杰。' },
];

export const STAFF_MAP = new Map(STAFF.map((s) => [s.id, s]));
export const RECIPE_MAP = new Map(RECIPES.map((r) => [r.id, r]));
export const ORDER_MAP = new Map(ORDERS.map((o) => [o.id, o]));
