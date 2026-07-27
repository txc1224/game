import { DIR_LABELS, ITEMS } from '@game/mud-core';
import type { Command, Direction } from '@game/mud-core';

/** 六维属性的中文展示名(键与 game-core 的 AttrKey 对齐) */
export const ATTR_LABELS: Record<string, string> = {
  strength: '臂力',
  agility: '身法',
  constitution: '根骨',
  wisdom: '悟性',
  luck: '福缘',
  reputation: '声望',
};

const DIRECTION_SET = new Set<string>(['north', 'south', 'east', 'west']);

/** 由方向中文标签反查方向键(北/南/东/西) */
const DIR_BY_LABEL: Record<string, Direction> = Object.fromEntries(
  (Object.entries(DIR_LABELS) as [Direction, string][]).map(([dir, label]) => [label, dir]),
) as Record<string, Direction>;

/** 由物品中文名反查物品 id(如 金疮药 -> jin-chuang-yao) */
const ITEM_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.values(ITEMS).map((item) => [item.name, item.id]),
);

export interface ParseResult {
  cmd: Command | null;
  /** 解析失败时回显给玩家的原文 */
  raw: string;
}

/**
 * 把玩家输入的中文文本命令解析为引擎 Command。
 * 支持:北/南/东/西、探索、查看、休息、状态、攻击、逃跑,
 * 以及带宾语的「使用 金疮药」「装备 狂刀」「对话 老郎中」。
 * 不认识的命令返回 cmd=null,由调用方提示「听不懂」。
 */
export function parseCommand(input: string): ParseResult {
  const raw = input.trim();
  if (!raw) return { cmd: null, raw };

  // 方向:单字 北/南/东/西
  if (raw in DIR_BY_LABEL) {
    return { cmd: { type: 'go', dir: DIR_BY_LABEL[raw]! }, raw };
  }

  // 无宾语的简单命令
  switch (raw) {
    case '探索':
      return { cmd: { type: 'explore' }, raw };
    case '查看':
      return { cmd: { type: 'look' }, raw };
    case '休息':
      return { cmd: { type: 'rest' }, raw };
    case '状态':
      return { cmd: { type: 'status' }, raw };
    case '攻击':
      return { cmd: { type: 'attack' }, raw };
    case '逃跑':
      return { cmd: { type: 'flee' }, raw };
  }

  // 带宾语的命令:动词 + 空格(可省略)+ 物品/NPC 名
  const verbMatch = raw.match(/^(使用|装备|对话)\s*(.+)$/);
  if (verbMatch) {
    const verb = verbMatch[1]!;
    const target = verbMatch[2]!.trim();

    if (verb === '对话') {
      // 对话按 NPC 名匹配,交由调用方在当前区域里解析(需上下文),
      // 这里返回一个特殊占位,由 App 补全 npcId。
      return { cmd: { type: 'talk', npcId: `name:${target}` }, raw };
    }

    const itemId = ITEM_BY_NAME[target];
    if (!itemId) return { cmd: null, raw };
    return verb === '使用'
      ? { cmd: { type: 'use', itemId }, raw }
      : { cmd: { type: 'equip', itemId }, raw };
  }

  return { cmd: null, raw };
}

export { DIRECTION_SET };
