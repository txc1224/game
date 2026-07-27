import { useEffect, useRef } from 'react';
import type { LogLine } from '@game/mud-core';

const KIND_CLASS: Record<LogLine['kind'], string> = {
  info: 'log-info',
  combat: 'log-combat',
  good: 'log-good',
  bad: 'log-bad',
  system: 'log-system',
};

interface TerminalProps {
  log: LogLine[];
}

/** 终端日志流:黑底,按 LogLine.kind 着色,自动滚动到底部。 */
export default function Terminal({ log }: TerminalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  return (
    <div className="card terminal-card">
      <div className="terminal-head">
        <span>江湖传闻</span>
        <span className="muted">{log.length} 行</span>
      </div>
      <div className="terminal-body" ref={bodyRef}>
        {log.map((line, i) => (
          <p key={i} className={`log-line ${KIND_CLASS[line.kind]}`}>
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}
