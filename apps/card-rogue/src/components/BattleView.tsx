import type { BattleState } from '@game/card-core';
import { enemyIntent, getCard } from '@game/card-core';
import CardView from './CardView';
import LogView from './LogView';

interface Props {
  battle: BattleState;
  relicIds: string[];
  onPlay: (handIndex: number) => void;
  onEndTurn: () => void;
}

const INTENT_LABEL: Record<string, string> = {
  attack: '攻击',
  defend: '防御',
  buff: '蓄力',
};

/** 战斗主区:敌人卡 + 战斗日志 + 手牌区 + 能量球与结束回合。 */
export default function BattleView({ battle, relicIds, onPlay, onEndTurn }: Props) {
  const { player, enemy } = battle;
  const intent = enemyIntent(battle);
  const enemyHpPct = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
  const playerHpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));

  return (
    <div className="battle-view">
      {/* 敌人卡 */}
      <div className={`enemy-card card ${enemy.def.isBoss ? 'boss' : enemy.def.isElite ? 'elite' : ''}`}>
        <div className="enemy-head">
          <span className="enemy-name">
            {enemy.def.isBoss ? '👑 ' : enemy.def.isElite ? '☠️ ' : ''}
            {enemy.def.name}
          </span>
          <span className="enemy-intent" title="下回合意图">
            {INTENT_LABEL[intent.kind] ?? intent.kind} {intent.kind !== 'buff' ? intent.value : `+${intent.value}`}
            <span className="enemy-intent-label">({intent.label})</span>
          </span>
        </div>
        <div className="hp-bar-label">
          <span>气血</span>
          <span className="stat-value">
            {enemy.hp} / {enemy.maxHp}
          </span>
        </div>
        <div className="hp-bar enemy-hp">
          <div className="hp-bar-fill" style={{ width: `${enemyHpPct}%` }} />
        </div>
        <div className="fighter-status">
          {enemy.block > 0 && <span className="badge badge-block">🛡 格挡 {enemy.block}</span>}
          {enemy.vulnerable > 0 && <span className="badge badge-vuln">易伤 {enemy.vulnerable}</span>}
          {enemy.weak > 0 && <span className="badge badge-weak">虚弱 {enemy.weak}</span>}
          {enemy.strength > 0 && <span className="badge badge-str">力量 +{enemy.strength}</span>}
        </div>
      </div>

      {/* 战斗日志 */}
      <LogView log={battle.log} />

      {/* 玩家战斗状态 */}
      <div className="player-combat card">
        <div className="player-combat-left">
          <div className="hp-bar-label">
            <span>你的气血</span>
            <span className="stat-value">
              {player.hp} / {player.maxHp}
            </span>
          </div>
          <div className="hp-bar">
            <div className="hp-bar-fill" style={{ width: `${playerHpPct}%` }} />
          </div>
          <div className="fighter-status">
            {player.block > 0 && <span className="badge badge-block">🛡 格挡 {player.block}</span>}
            {player.strength > 0 && <span className="badge badge-str">力量 +{player.strength}</span>}
            {player.vulnerable > 0 && <span className="badge badge-vuln">易伤 {player.vulnerable}</span>}
            {player.weak > 0 && <span className="badge badge-weak">虚弱 {player.weak}</span>}
          </div>
        </div>

        {/* 能量球 + 结束回合 */}
        <div className="player-combat-right">
          <div className="energy-orb" title="能量">
            <span className="energy-cur">{player.energy}</span>
            <span className="energy-max">/ {player.maxEnergy}</span>
          </div>
          <button className="btn btn-attack end-turn-btn" onClick={onEndTurn} disabled={battle.over}>
            结束回合
          </button>
        </div>
      </div>

      {/* 手牌区 */}
      <div className="hand-row">
        {battle.hand.length === 0 && <div className="muted hand-empty">手牌已空,点击「结束回合」。</div>}
        {battle.hand.map((cardId, i) => (
          <CardView
            key={`${cardId}-${i}`}
            cardId={cardId}
            disabled={battle.over || player.energy < effectiveCost(cardId, battle, relicIds)}
            onClick={() => onPlay(i)}
          />
        ))}
      </div>
    </div>
  );
}

/** 与引擎一致的酒葫芦费用修正:本回合首张牌若费>=1 则 -1。 */
function effectiveCost(cardId: string, battle: BattleState, relicIds: string[]): number {
  const card = getCard(cardId);
  let cost = card.cost;
  if (relicIds.includes('jiu-hu') && battle.cardsPlayedThisTurn === 0 && cost >= 1) cost -= 1;
  return cost;
}
