import { useEffect, useRef, useState } from 'react';
import type { BattleState } from '@game/card-core';
import { enemyIntent, effectiveCard } from '@game/card-core';
import CardView from './CardView';
import LogView from './LogView';
import DamageFloat from './DamageFloat';

interface Props {
  battle: BattleState;
  relicIds: string[];
  upgraded: ReadonlySet<string>;
  onPlay: (handIndex: number) => void;
  onEndTurn: () => void;
}

const INTENT_LABEL: Record<string, string> = {
  attack: '攻击',
  defend: '防御',
  buff: '蓄力',
};

interface FloatItem {
  id: number;
  value: string;
  kind: 'enemy-dmg' | 'player-dmg' | 'block' | 'heal';
}

let floatSeq = 0;

/** 战斗主区:敌人卡 + 战斗日志 + 手牌区 + 能量球与结束回合。 */
export default function BattleView({ battle, relicIds, upgraded, onPlay, onEndTurn }: Props) {
  const { player, enemy } = battle;
  const intent = enemyIntent(battle);
  const enemyHpPct = Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100));
  const playerHpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));

  // —— 动效:追踪 hp 变化,产生飘字与受击抖动 ——
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [enemyShake, setEnemyShake] = useState(false);
  const [playerShake, setPlayerShake] = useState(false);
  const prevEnemyHp = useRef(enemy.hp);
  const prevPlayerHp = useRef(player.hp);
  const prevEnemyBlock = useRef(enemy.block);

  useEffect(() => {
    const eDmg = prevEnemyHp.current - enemy.hp;
    const pDmg = prevPlayerHp.current - player.hp;
    const newFloats: FloatItem[] = [];

    if (eDmg > 0) {
      newFloats.push({ id: ++floatSeq, value: `-${eDmg}`, kind: 'enemy-dmg' });
      setEnemyShake(true);
      setTimeout(() => setEnemyShake(false), 400);
    }
    if (pDmg > 0) {
      newFloats.push({ id: ++floatSeq, value: `-${pDmg}`, kind: 'player-dmg' });
      setPlayerShake(true);
      setTimeout(() => setPlayerShake(false), 400);
    } else if (pDmg < 0) {
      newFloats.push({ id: ++floatSeq, value: `+${-pDmg}`, kind: 'heal' });
    }

    if (newFloats.length > 0) {
      setFloats((f) => [...f, ...newFloats]);
      // 1s 后移除飘字
      const ids = newFloats.map((x) => x.id);
      setTimeout(() => setFloats((f) => f.filter((x) => !ids.includes(x.id))), 1000);
    }

    prevEnemyHp.current = enemy.hp;
    prevPlayerHp.current = player.hp;
    prevEnemyBlock.current = enemy.block;
  }, [enemy.hp, player.hp, enemy.block]);

  const removeFloat = (id: number) => setFloats((f) => f.filter((x) => x.id !== id));

  return (
    <div className="battle-view">
      {/* 敌人卡 */}
      <div className={`enemy-card card ${enemy.def.isBoss ? 'boss' : enemy.def.isElite ? 'elite' : ''} ${enemyShake ? 'shake' : ''}`}>
        <DamageFloat floats={floats.filter((f) => f.kind === 'enemy-dmg')} onDone={removeFloat} />
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
          {enemy.poison > 0 && <span className="badge badge-poison">☠ 毒 {enemy.poison}</span>}
          {enemy.vulnerable > 0 && <span className="badge badge-vuln">易伤 {enemy.vulnerable}</span>}
          {enemy.weak > 0 && <span className="badge badge-weak">虚弱 {enemy.weak}</span>}
          {enemy.strength > 0 && <span className="badge badge-str">力量 +{enemy.strength}</span>}
        </div>
      </div>

      {/* 战斗日志 */}
      <LogView log={battle.log} />

      {/* 玩家战斗状态 */}
      <div className={`player-combat card ${playerShake ? 'shake' : ''}`}>
        <DamageFloat floats={floats.filter((f) => f.kind === 'player-dmg' || f.kind === 'heal')} onDone={removeFloat} />
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
            {player.poison > 0 && <span className="badge badge-poison">☠ 毒 {player.poison}</span>}
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
            upgraded={upgraded.has(cardId)}
            disabled={battle.over || player.energy < effectiveCost(cardId, battle, relicIds, upgraded)}
            onClick={() => onPlay(i)}
          />
        ))}
      </div>
    </div>
  );
}

/** 与引擎一致的费用修正:酒葫芦首张 -1。 */
function effectiveCost(cardId: string, battle: BattleState, relicIds: string[], upgraded: ReadonlySet<string>): number {
  const card = effectiveCard(cardId, upgraded);
  let cost = card.cost;
  if (relicIds.includes('jiu-hu') && battle.cardsPlayedThisTurn === 0 && cost >= 1) cost -= 1;
  return cost;
}
