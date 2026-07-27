import type { StageId } from '@game/game-core';

/** 人生阶段中文名(剧本分幕展示) */
export const STAGE_LABELS: Record<StageId, string> = {
  childhood: '幼年',
  apprentice: '拜师学艺',
  jianghu: '初入江湖',
  feud: '恩怨沉浮',
  sect: '门派风云',
  master: '宗师归隐',
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage as StageId] ?? stage;
}
