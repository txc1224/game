import type { Ending } from '@game/game-core';
import { YearTimeline } from './YearTimeline';
import type { TimelineEntry } from './YearTimeline';

interface EndingSummaryProps {
  ending: Ending;
  /** 这一生推进过程中积累的时间线 */
  timeline: TimelineEntry[];
  /** 再活一世,回到 draft */
  onRestart: () => void;
  /** 查看历代人生 */
  onShowHistory: () => void;
}

export function EndingSummary({ ending, timeline, onRestart, onShowHistory }: EndingSummaryProps) {
  return (
    <div>
      <div className="card center" style={{ padding: '36px 24px', marginBottom: 22 }}>
        <div className="muted" style={{ letterSpacing: 4, marginBottom: 8 }}>
          一生落幕
        </div>
        <h1 className="serif" style={{ fontSize: 40, margin: '4px 0 10px', color: '#e8d9a8', letterSpacing: 4 }}>
          {ending.title}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 26, margin: '14px 0 18px', flexWrap: 'wrap' }}>
          <span className="muted">
            终年 <strong style={{ color: '#f0e6c8', fontSize: 18 }}>{ending.finalAge}</strong> 岁
          </span>
          <span className="muted">
            死因 <strong style={{ color: '#f0e6c8' }}>{ending.cause}</strong>
          </span>
        </div>
        <p
          className="serif"
          style={{
            margin: '0 auto',
            maxWidth: 620,
            fontSize: 16,
            lineHeight: 2,
            color: '#d5dae1',
            textAlign: 'center',
          }}
        >
          {ending.evaluation}
        </p>
      </div>

      <h2 className="section-title serif">生平回顾</h2>
      <YearTimeline entries={timeline} />

      <div className="center" style={{ marginTop: 30, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary btn-lg serif" onClick={onRestart}>
          再活一世
        </button>
        <button type="button" className="btn btn-lg serif" onClick={onShowHistory}>
          历代人生
        </button>
      </div>
    </div>
  );
}
