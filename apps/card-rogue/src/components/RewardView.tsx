import type { RunState } from '@game/card-core';
import CardView from './CardView';

interface Props {
  run: RunState;
  onPick: (cardId: string | null) => void;
}

/** 战斗奖励:3 张奖励牌选 1,或跳过;若有遗物一并展示。 */
export default function RewardView({ run, onPick }: Props) {
  return (
    <div className="reward-view card">
      <h2 className="section-title">战利品</h2>
      {run.rewardRelic && (
        <div className="reward-relic">
          <span className="reward-relic-tag">获得遗物</span>
          <span className="reward-relic-name">🏺 {run.rewardRelic.name}</span>
          <span className="reward-relic-desc">{run.rewardRelic.desc}</span>
        </div>
      )}
      <p className="muted reward-tip">挑一张牌收入牌组,或就此别过。</p>
      <div className="reward-cards">
        {run.rewardCards.map((card) => (
          <CardView key={card.id} cardId={card.id} onClick={() => onPick(card.id)} />
        ))}
      </div>
      <button className="btn reward-skip" onClick={() => onPick(null)}>
        跳过
      </button>
    </div>
  );
}
