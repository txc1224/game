import { useEffect, useRef } from 'react';
import type { StageId } from '@game/game-core';
import { stageLabel } from '../stageLabels';
import { useTypewriter } from '../hooks/useTypewriter';

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
  /** 最新一条是否用逐字机打出(推进中为 true,历史回顾为 false) */
  typewriterLatest?: boolean;
}

/** 重大事件 flag → 展示徽章(沿用武功/奇遇配色) */
const FLAG_BADGES: Record<string, string> = {
  'manual-mastered': '秘籍大成',
  'revenge-done': '大仇得报',
  'sword-master': '剑名远播',
  married: '喜结连理',
  'cliff-fortune': '崖底奇遇',
  'has-pet': '灵兽相伴',
  'sect-founder': '开宗立派',
  'hero-of-realm': '名震天下',
  'repelled-evil': '力退魔教',
};

export function YearTimeline({ entries, typewriterLatest = false }: YearTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新条目出现时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries.length]);

  if (entries.length === 0) {
    return <div className="card center muted">这一年尚未开始,点击下方按钮活过第一年。</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {entries.map((e, i) => {
        const isLatest = i === entries.length - 1;
        return (
          <TimelineCard
            key={`${e.age}-${i}`}
            entry={e}
            isLatest={isLatest}
            typewriter={typewriterLatest && isLatest}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function TimelineCard({ entry: e, isLatest, typewriter }: { entry: TimelineEntry; isLatest: boolean; typewriter: boolean }) {
  const tw = useTypewriter(e.text, { speed: 32, enabled: typewriter });
  const badges = (e.gainedFlags ?? []).map((f) => FLAG_BADGES[f]).filter(Boolean) as string[];

  return (
    <div
      className={`card ${isLatest ? 'timeline-new' : ''}`}
      onClick={typewriter && tw.typing ? tw.skip : undefined}
      style={
        e.dead
          ? { border: '1px solid rgba(217,48,37,0.55)', background: 'rgba(217,48,37,0.08)', cursor: tw.typing ? 'pointer' : undefined }
          : { cursor: tw.typing ? 'pointer' : undefined }
      }
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <span className={`serif ${isLatest ? 'age-pop' : ''}`} style={{ fontSize: 17, fontWeight: 600, color: '#e8d9a8', minWidth: 64 }}>
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
        {badges.map((b) => (
          <span key={b} className="timeline-flag">{b}</span>
        ))}
        {e.dead ? <span style={{ fontSize: 12, color: '#f2a9a0', letterSpacing: 1 }}>终年</span> : null}
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#d5dae1', minHeight: '1.7em' }}>
        {typewriter ? tw.display : e.text}
        {typewriter && tw.typing && <span className="type-cursor" />}
      </p>
      {typewriter && tw.typing && <div className="type-skip-hint">点击跳过 ▶</div>}
    </div>
  );
}
