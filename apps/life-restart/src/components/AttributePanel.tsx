import { ATTR_KEYS, ATTR_LABELS, ATTR_MAX } from '@game/game-core';
import type { Allocation, Attributes, AttrKey } from '@game/game-core';

/**
 * 六维属性面板。
 * - 始终展示当前属性值与条形图。
 * - 当传入 budget / alloc / onAllocChange 时,启用加减按钮做加点分配。
 */
interface AttributePanelProps {
  /** 已生效的属性(加点前的基准,展示值 = attrs + 预览分配) */
  attrs: Attributes;
  /** 可用点数余额;不传则为纯展示模式 */
  budget?: number;
  /** 当前待确认的分配(每项 >= 0) */
  alloc?: Allocation;
  /** 调整某项分配(delta 为 +1 或 -1) */
  onAllocChange?: (key: AttrKey, delta: number) => void;
  /** 标题副文案,例如「剩余点数」由父组件渲染 */
  footer?: React.ReactNode;
}

export function AttributePanel({ attrs, budget, alloc, onAllocChange, footer }: AttributePanelProps) {
  const editable = budget !== undefined && alloc !== undefined && onAllocChange !== undefined;

  return (
    <div className="card">
      {ATTR_KEYS.map((key) => {
        const pending = alloc?.[key] ?? 0;
        const value = attrs[key] + (editable ? pending : 0);
        const canAdd = editable && budget > 0;
        const canSub = editable && pending > 0;
        return (
          <div className="attr-row" key={key}>
            <span className="attr-name">{ATTR_LABELS[key]}</span>
            <div className="attr-bar">
              <div className="attr-bar-fill" style={{ width: `${Math.min(100, (value / ATTR_MAX) * 100)}%` }} />
            </div>
            <span className="attr-value">
              {value}
              {editable && pending > 0 ? <span style={{ color: '#7dd38a', fontSize: 12 }}> (+{pending})</span> : null}
            </span>
            {editable ? (
              <span className="stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label={`减少${ATTR_LABELS[key]}`}
                  disabled={!canSub}
                  onClick={() => onAllocChange(key, -1)}
                >
                  −
                </button>
                <button
                  type="button"
                  className="stepper-btn"
                  aria-label={`增加${ATTR_LABELS[key]}`}
                  disabled={!canAdd}
                  onClick={() => onAllocChange(key, 1)}
                >
                  +
                </button>
              </span>
            ) : null}
          </div>
        );
      })}
      {footer ? <div style={{ marginTop: 12 }}>{footer}</div> : null}
    </div>
  );
}
