import type { RunState } from '@game/card-core';

interface EventViewProps {
  run: RunState;
  onChoose: (optionIndex: number) => void;
}

/** 随机奇遇:展示事件与选项。 */
export default function EventView({ run, onChoose }: EventViewProps) {
  const ev = run.activeEvent;
  if (!ev) return null;
  return (
    <div className="event-view card">
      <h2 className="section-title serif">奇遇</h2>
      <p className="event-text">{ev.text}</p>
      <div className="event-options">
        {ev.options.map((opt, i) => (
          <button key={i} type="button" className="btn event-option" onClick={() => onChoose(i)}>
            <span className="event-option-label">{opt.label}</span>
            <span className="event-option-desc">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
