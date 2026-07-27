import { useState } from 'react';
import type { BattleState, RunState } from '@game/card-core';
import {
  advanceNode,
  endTurn,
  getEnemy,
  makeReward,
  newBattle,
  newRun,
  pickReward,
  playCard,
  restHeal,
  runLost,
} from '@game/card-core';
import StatusBar from './components/StatusBar';
import TowerMap from './components/TowerMap';
import BattleView from './components/BattleView';
import RewardView from './components/RewardView';
import LogView from './components/LogView';

const SAVE_KEY = 'card-rogue:save';

interface GameState {
  run: RunState;
  battle: BattleState | null;
}

function freshState(): GameState {
  return { run: newRun(), battle: null };
}

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw) as GameState;
  } catch {
    // 存档损坏则重开
  }
  return freshState();
}

export default function App() {
  const [state, setState] = useState<GameState>(loadState);

  const commit = (next: GameState) => {
    setState({ ...next });
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
    } catch {
      // 忽略存档失败
    }
  };

  const { run, battle } = state;
  const relicIds = run.relics;

  /** 前进:进入下一节点,战斗节点则开战。 */
  const handleAdvance = () => {
    const node = advanceNode(run);
    if (node && (node.kind === 'battle' || node.kind === 'elite' || node.kind === 'boss')) {
      const b = newBattle({
        deck: run.deck,
        enemy: getEnemy(node.enemyId!),
        playerHp: run.hp,
        playerMaxHp: run.maxHp,
        relicIds,
      });
      commit({ run, battle: b });
    } else {
      // rest / 直接通关(advanceNode 已把 phase 置好)
      commit({ run, battle: null });
    }
  };

  /** 出牌。 */
  const handlePlay = (handIndex: number) => {
    if (!battle) return;
    playCard(battle, handIndex, relicIds);
    afterBattle();
  };

  /** 结束回合。 */
  const handleEndTurn = () => {
    if (!battle) return;
    endTurn(battle, undefined, relicIds);
    afterBattle();
  };

  /** 战斗后结算:胜→写回气血并发奖励;败→runLost;未完→仅刷新。 */
  const afterBattle = () => {
    if (!battle) return;
    if (battle.over) {
      if (battle.victory) {
        run.hp = battle.player.hp;
        makeReward(run);
        commit({ run, battle });
      } else {
        runLost(run);
        commit({ run, battle: null });
      }
    } else {
      commit({ run, battle });
    }
  };

  /** 选择奖励牌(或跳过),回地图或通关。 */
  const handlePickReward = (cardId: string | null) => {
    pickReward(run, cardId);
    commit({ run, battle: null });
  };

  /** 篝火休息,回地图。 */
  const handleRest = () => {
    restHeal(run);
    commit({ run, battle: null });
  };

  /** 再来一局。 */
  const handleRestart = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    setState(freshState());
  };

  const renderPhase = () => {
    switch (run.phase) {
      case 'combat':
        return battle ? (
          <BattleView battle={battle} relicIds={relicIds} onPlay={handlePlay} onEndTurn={handleEndTurn} />
        ) : null;

      case 'reward':
        return <RewardView run={run} onPick={handlePickReward} />;

      case 'rest':
        return (
          <div className="rest-view card">
            <h2 className="section-title">篝火</h2>
            <p className="rest-text">跳动的火光驱散了几分寒意。烤烤火,疗疗伤吧。</p>
            <button className="btn btn-primary" onClick={handleRest}>
              休息(恢复 30% 气血)
            </button>
          </div>
        );

      case 'won':
        return (
          <div className="end-view card end-won">
            <h2 className="end-title">🎉 通关!</h2>
            <p className="end-text">你击败黑风寨主,黑风塔重归太平。江湖又添一段传说。</p>
            <div className="end-stats">
              <div className="stat-row">
                <span className="stat-label">剩余气血</span>
                <span className="stat-value">
                  {run.hp} / {run.maxHp}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">牌组张数</span>
                <span className="stat-value">{run.deck.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">遗物数量</span>
                <span className="stat-value">{run.relics.length}</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleRestart}>
              再来一局
            </button>
          </div>
        );

      case 'lost':
        return (
          <div className="end-view card end-lost">
            <h2 className="end-title">☠️ 落败</h2>
            <p className="end-text">你倒在了黑风塔中。重整旗鼓,再来一世吧。</p>
            <div className="end-stats">
              <div className="stat-row">
                <span className="stat-label">止步层数</span>
                <span className="stat-value">
                  {run.nodeIndex + 1} / {run.nodes.length}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">牌组张数</span>
                <span className="stat-value">{run.deck.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">遗物数量</span>
                <span className="stat-value">{run.relics.length}</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleRestart}>
              再来一局
            </button>
          </div>
        );

      case 'map':
      default:
        return (
          <div className="map-hint card">
            <p className="rest-text">黑风塔高耸入云,杀机四伏。点击上方「前进」,踏上登塔之路。</p>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      <h1 className="app-title serif">黑风塔 · 卡牌江湖</h1>
      <p className="app-subtitle serif">武侠卡牌 · 一塔十层 · 登顶封侠</p>

      <StatusBar run={run} />

      <TowerMap nodes={run.nodes} nodeIndex={run.nodeIndex} phase={run.phase} onAdvance={handleAdvance} />

      <div className="phase-area">{renderPhase()}</div>

      {/* 非战斗阶段也展示全程日志 */}
      {run.phase !== 'combat' && <LogView log={run.log} />}
    </div>
  );
}
