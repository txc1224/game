import type { RunState } from '@game/card-core';
import { RELICS } from '@game/card-core';

interface Props {
  run: RunState;
}

/** 顶部玩家状态条:气血、牌组、金币、遗物。 */
export default function StatusBar({ run }: Props) {
  const hpPct = Math.max(0, Math.min(100, (run.hp / run.maxHp) * 100));
  return (
    <div className="status-bar card">
      <div className="status-hp">
        <div className="hp-bar-label">
          <span>气血</span>
          <span className="stat-value">
            {run.hp} / {run.maxHp}
          </span>
        </div>
        <div className="hp-bar">
          <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      <div className="status-meta">
        <div className="status-cell">
          <span className="status-k">牌组</span>
          <span className="status-v">{run.deck.length} 张</span>
        </div>
        <div className="status-cell">
          <span className="status-k">金币</span>
          <span className="status-v">💰 {run.gold}</span>
        </div>
        <div className="status-cell status-relics">
          <span className="status-k">遗物</span>
          <span className="status-v">
            {run.relics.length === 0 ? (
              <span className="muted">无</span>
            ) : (
              run.relics.map((id) => (
                <span key={id} className="relic-badge" title={RELICS[id]?.desc ?? ''}>
                  {RELICS[id]?.name ?? id}
                </span>
              ))
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
