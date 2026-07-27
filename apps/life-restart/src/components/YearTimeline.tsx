import type { StageId } from '@game/game-core';
import { stageLabel } from '../stageLabels';

/** 时间线单条记录(推进中的当年 / 历史库的逐年) */
export interface TimelineEntry {
  age: number;
  stage: StageId | string;
  text: string;
  /** 死亡年高亮 */
  dead?: boolean;
  /** 当年新增 flag,用于点缀展示 */
  gainedFlags?: string[];
}

interface YearTimelineProps {
  entries: TimelineEntry[];
}

export function YearTimeline({ entries }: YearTimelineProps) {
  if (entries.length === 0) {
    return <div className="card center muted">这一年尚未开始,点击下方按钮活过第一年。</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map((e, i) => (
        <div
          key={`${e.age}-${i}`}
          className="card"
          style={
            e.dead
              ? { border: '1px solid rgba(217,48,37,0.55)', background: 'rgba(217,48,37,0.08)' }
              : undefined
          }
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <span className="serif" style={{ fontSize: 17, fontWeight: 600, color: '#e8d9a8', minWidth: 64 }}>
              {e.age} 岁
            </span>
            <span
              style={{
                fontSize: 12,
                letterSpacing: 1,
                color: '#b89b5e',
                border: '1px solid rgba(184,155,94,0.4)',
                borderRadius: 999,
                padding: '1px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              {stageLabel(String(e.stage))}
            </span>
            {e.dead ? (
              <span style={{ fontSize: 12, color: '#f2a9a0', letterSpacing: 1 }}>终年</span>
            ) : null}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#d5dae1' }}>{e.text}</p>
        </div>
      ))}
    </div>
  );
}
