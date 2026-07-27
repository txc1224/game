import { useEffect, useRef } from 'react';

interface LogEntry {
  text: string;
  kind: string;
}

interface Props {
  log: LogEntry[];
}

/** 战斗/冒险日志流,按 kind 着色,自动滚动到底部。 */
export default function LogView({ log }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  return (
    <div className="terminal-card card">
      <div className="terminal-head">
        <span>江湖行</span>
        <span className="muted">{log.length} 条</span>
      </div>
      <div className="terminal-body" ref={bodyRef}>
        {log.map((entry, i) => (
          <p key={i} className={`log-line log-${entry.kind}`}>
            {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
}
