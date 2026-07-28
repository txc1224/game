import { useMemo, useState } from 'react';
import type { MudState } from '@game/mud-core';

interface GuidePanelProps {
  state: MudState;
  onGo: (dir: 'east' | 'west' | 'north' | 'south') => void;
  onSimple: (type: 'explore' | 'attack' | 'rest' | 'status') => void;
  onTalk: (npcId: string) => void;
}

interface Step {
  key: string;
  title: string;
  hint: string;
  done: (s: MudState) => boolean;
  action?: { label: string; run: () => void; disabled?: boolean };
}

/** 日志中是否出现过某关键串(判定「该动作曾发生」,不随当前位置回退) */
const saw = (s: MudState, ...keys: string[]): boolean =>
  s.log.some((l) => keys.some((k) => l.text.includes(k)));

/**
 * 新手引导任务:移动→探索→战斗→拾取→回村→安顿 闭环。
 * 每步用「日志中该步专属动作是否发生」判定,而非全局 exp/level,避免跨场景提前勾掉或卡死。
 */
export default function GuidePanel({ state, onGo, onSimple, onTalk }: GuidePanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const inCombat = state.combat !== null;
  const inVillage = state.player.roomId === 'qingxi-cun';

  const steps: Step[] = useMemo(
    () => [
      {
        key: 'leave',
        title: '走出村子,去外面闯荡',
        hint: '点方位盘的「东」去青山,或「北」去忘忧谷。',
        // 离开青溪村到任意相邻区(东或北都行),日志里有「来到【xx】」
        done: (s) => saw(s, '来到【青山】', '来到【忘忧谷】'),
        action: { label: '往东走', run: () => onGo('east'), disabled: inCombat || state.dead },
      },
      {
        key: 'explore',
        title: '在野外探索,寻一只野兽练手',
        hint: '点「探索」,或在命令区点「探索」。',
        // 探索后遭遇怪物(日志有「遭遇【」)或已胜利
        done: (s) => saw(s, '遭遇【') || saw(s, '你击败了'),
        action: { label: '探索', run: () => onSimple('explore'), disabled: inCombat || state.dead || inVillage },
      },
      {
        key: 'fight',
        title: '迎战!点「攻击」击败对手',
        hint: '遭遇野兽后点「攻击」过招;不敌可「逃跑」。',
        // 击败过怪物(日志有「你击败了【」)
        done: (s) => saw(s, '你击败了【'),
        action: { label: '攻击', run: () => onSimple('attack'), disabled: !inCombat || state.dead },
      },
      {
        key: 'loot',
        title: '查看战利品与自身状态',
        hint: '左侧背包能看到拾取的东西;点「状态」查看气血与阅历。',
        // 拾取过(日志有「拾取:【」)或查看过状态(日志有「【名字】 Lv」)
        done: (s) => saw(s, '拾取:【') || saw(s, `【${state.player.name}】 Lv`),
        action: { label: '查看状态', run: () => onSimple('status'), disabled: state.dead },
      },
      {
        key: 'return',
        title: '带着收获,回青溪村',
        hint: '点方位盘「西」回村。村里是安全区,可以疗伤、卖货、休息。',
        // 击败过怪 且 回到过青溪村
        done: (s) => saw(s, '你击败了【') && saw(s, '来到【青溪村】'),
        action: { label: '往西回村', run: () => onGo('west'), disabled: inCombat || state.dead },
      },
      {
        key: 'settle',
        title: '回村安顿:疗伤/卖货/休息',
        hint: '受了伤点「老郎中」;有杂物点「杂货铺」卖钱;也能「休息」恢复。',
        // 回村后做过安顿操作(疗伤/卖货/休息)
        done: (s) =>
          saw(s, '你击败了【') && saw(s, '来到【青溪村】') && saw(s, '气血尽复', '得银', '好好休息'),
        action: { label: '对话老郎中', run: () => onTalk('lang-zhong'), disabled: inCombat || state.dead || !inVillage },
      },
    ],
    [state, onGo, onSimple, onTalk, inCombat, inVillage],
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
