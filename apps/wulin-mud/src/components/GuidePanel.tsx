import { useMemo, useState } from 'react';
import type { MudState } from '@game/mud-core';

interface GuidePanelProps {
  state: MudState;
  onGo: (dir: 'east' | 'west') => void;
  onSimple: (type: 'explore' | 'attack' | 'rest' | 'status') => void;
  onTalk: (npcId: string) => void;
}

interface Step {
  key: string;
  title: string;
  hint: string;
  /** 是否已完成 */
  done: (s: MudState) => boolean;
  /** 可点动作(未完成时显示) */
  action?: { label: string; run: () => void; disabled?: boolean };
}

/**
 * 新手引导任务:带领玩家走完「移动→探索→战斗→拾取→回村疗伤」的完整闭环。
 * 依据当前 game state 实时判断进度;全部完成后自动收起为一条提示。
 */
export default function GuidePanel({ state, onGo, onSimple, onTalk }: GuidePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const p = state.player;

  // 回村后是否做过「安顿」操作(疗伤/卖货/休息/查看状态)——从日志里检测。
  // 注意:exec 是就地修改 log 数组,引用不变,故依赖 state 本身(每次 setState 浅拷贝出新引用)。
  const settled = useMemo(
    () =>
      state.log.some(
        (l) =>
          l.text.includes('气血尽复') ||
          l.text.includes('得银') ||
          l.text.includes('好好休息') ||
          l.text.includes('【' + p.name + '】'), // status 输出以【名字】开头
      ),
    [state, p.name],
  );

  const steps: Step[] = useMemo(
    () => [
      {
        key: 'go-east',
        title: '走出村子,前往青山',
        hint: '点左侧「东」出口,或直接输入「东」。',
        // 判定「曾经到达过青山」(而非当前不在村),避免回村后该步回退
        done: (s) => s.log.some((l) => l.text.includes('来到【青山】')),
        action: { label: '往东走', run: () => onGo('east'), disabled: state.combat !== null || state.dead },
      },
      {
        key: 'explore',
        title: '在青山探索,寻一只野兽练手',
        hint: '点「探索」,或输入「探索」。',
        done: (s) => s.combat !== null || s.player.exp > 0 || s.player.level > 1,
        action: { label: '探索', run: () => onSimple('explore'), disabled: state.combat !== null || state.dead || p.roomId === 'qingxi-cun' },
      },
      {
        key: 'fight',
        title: '迎战!点「攻击」击败对手',
        hint: '遭遇野兽后,点「攻击」与它过招;不敌可「逃跑」。',
        done: (s) => s.player.exp > 0 || s.player.level > 1,
        action: { label: '攻击', run: () => onSimple('attack'), disabled: state.combat === null || state.dead },
      },
      {
        key: 'loot',
        title: '查看战利品与自身状态',
        hint: '左侧背包能看到拾取的东西;点「状态」查看气血与阅历。',
        done: (s) => s.player.exp > 0,
      },
      {
        key: 'return',
        title: '带着战利品,回青溪村',
        hint: '点「西」回村。村里是安全区,可以疗伤、卖货、休息。',
        done: (s) => s.player.exp > 0 && s.log.some((l) => l.text.includes('来到【青溪村】')),
        action: { label: '往西回村', run: () => onGo('west'), disabled: state.combat !== null || state.dead },
      },
      {
        key: 'heal',
        title: '回村安顿:疗伤/卖货/查看状态',
        hint: '受了伤点「老郎中」;有杂物点「杂货铺」卖钱;点「状态」看看这一战的成长。',
        // 回村后做过任意一项安顿操作(疗伤/卖货/休息/查看状态)才算完成
        done: (s) => s.player.exp > 0 && s.log.some((l) => l.text.includes('来到【青溪村】')) && settled,
        action: { label: '查看状态', run: () => onSimple('status'), disabled: state.dead },
      },
    ],
    [state, onGo, onSimple, p.roomId],
  );

  const doneCount = steps.filter((s) => s.done(state)).length;
  const allDone = doneCount === steps.length;

  if (allDone) {
    return (
      <div className="card guide-card guide-done">
        <span className="guide-done-text">🎉 出师了!你已掌握闯荡江湖的门道。往东去黑风寨、断魂崖,闯出更大的名堂吧。</span>
      </div>
    );
  }

  if (collapsed) {
    return (
      <button type="button" className="card guide-card guide-collapsed" onClick={() => setCollapsed(false)}>
        <span className="muted">新手引导({doneCount}/{steps.length})</span>
        <span className="guide-expand">展开</span>
      </button>
    );
  }

  return (
    <div className="card guide-card">
      <div className="guide-head">
        <h3 className="section-title serif">新手引导</h3>
        <div className="guide-progress muted">
          {doneCount}/{steps.length}
          <button type="button" className="guide-close" onClick={() => setCollapsed(true)} title="收起">
            ×
          </button>
        </div>
      </div>
      <ol className="guide-steps">
        {steps.map((s, i) => {
          const done = s.done(state);
          const isCurrent = !done && steps.slice(0, i).every((x) => x.done(state));
          return (
            <li key={s.key} className={`guide-step ${done ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
              <span className="guide-check">{done ? '✓' : i + 1}</span>
              <div className="guide-body">
                <div className="guide-title">{s.title}</div>
                {isCurrent && <div className="guide-hint">{s.hint}</div>}
                {isCurrent && s.action && (
                  <button
                    type="button"
                    className="btn btn-sm guide-action"
                    disabled={s.action.disabled}
                    onClick={s.action.run}
                  >
                    {s.action.label} →
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
