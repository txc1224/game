import { useState, useRef } from 'react';
import type { BattleState, RunState } from '@game/card-core';
import {
  endTurn,
  enterNode,
  getEnemy,
  makeReward,
  newBattle,
  newRun,
  newDailyRun,
  todayKey,
  nextOptions,
  pickReward,
  playCard,
  restHeal,
  runLost,
  resolveEvent,
  buyShopItem,
  removeCard,
  leaveShopOrEvent,
} from '@game/card-core';
import StatusBar from './components/StatusBar';
import TowerMap from './components/TowerMap';
import BattleView from './components/BattleView';
import RewardView from './components/RewardView';
import LogView from './components/LogView';
import ShopView from './components/ShopView';
import EventView from './components/EventView';
import DailyBanner from './components/DailyBanner';

const SAVE_KEY = 'card-rogue:save';
const DAILY_RESULT_KEY = 'card-rogue:daily-result';

interface GameState {
  run: RunState;
  battle: BattleState | null;
}

function freshState(): GameState {
  return { run: newRun(), battle: null };
}

function dailyState(): GameState {
  return { run: newDailyRun(), battle: null };
}

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as GameState;
    // upgraded 是 Set,序列化后为数组/对象,需还原
    if (parsed?.run) {
      const up = (parsed.run as unknown as { upgraded?: unknown }).upgraded;
      parsed.run.upgraded = new Set(Array.isArray(up) ? (up as string[]) : []);
      // rng 是函数,序列化丢失,读档恢复为真随机(常规模式无所谓复现)
      if (typeof parsed.run.rng !== 'object' || typeof parsed.run.rng.next !== 'function') {
        parsed.run.rng = { next: () => Math.random() };
      }
    }
    return parsed;
  } catch {
    return freshState();
  }
}

export default function App() {
  const [state, setState] = useState<GameState>(loadState);
  const [mode, setMode] = useState<'normal' | 'daily'>('normal');

  const commit = (next: GameState) => {
    setState({ ...next });
    try {
      const serializable = {
        ...next,
        run: { ...next.run, upgraded: [...next.run.upgraded] },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(serializable));
    } catch {
      // 忽略存档失败
    }
  };

  const { run, battle } = state;
  const relicIds = run.relics;

  /** 选择下一层节点(分叉选路)。 */
  const handleEnterNode = (nodeIndex: number) => {
    const node = enterNode(run, nodeIndex);
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

  /** 每日一塔结算(通关/落败时记录最佳成绩) */
  const recordDailyResult = (cleared: boolean) => {
    try {
      const key = todayKey();
      const floor = run.nodeIndex + 1;
      const prev = JSON.parse(localStorage.getItem(DAILY_RESULT_KEY) ?? '{}') as Record<string, { floor: number; cleared: boolean }>;
      const cur = prev[key];
      // 通关优先,其次按层数
      if (!cur || (cleared && !cur.cleared) || floor > cur.floor) {
        prev[key] = { floor: cleared ? run.nodes.length : floor, cleared };
        localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(prev));
      }
    } catch {
      // ignore
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

  /** 事件选择。 */
  const handleEvent = (optionIndex: number) => {
    resolveEvent(run, optionIndex);
    commit({ run, battle: null });
  };

  /** 购买商品。 */
  const handleBuy = (index: number) => {
    buyShopItem(run, index);
    commit({ run, battle: null });
  };

  /** 删牌。 */
  const handleRemove = (cardId: string) => {
    removeCard(run, cardId);
    commit({ run, battle: null });
  };

  /** 离开商店/事件。 */
  const handleLeave = () => {
    leaveShopOrEvent(run);
    commit({ run, battle: null });
  };

  /** 再来一局(按当前模式)。 */
  const handleRestart = () => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    setState(mode === 'daily' ? dailyState() : freshState());
  };

  /** 切到常规模式。 */
  const toNormal = () => {
    setMode('normal');
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    setState(freshState());
  };

  /** 切到每日一塔。 */
  const toDaily = () => {
    setMode('daily');
    try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
    setState(dailyState());
  };

  // 每日一塔:结算时记录最佳成绩(用 ref 保证只记一次)
  const dailyRecorded = useRef(false);
  if (mode === 'daily' && (run.phase === 'won' || run.phase === 'lost') && !dailyRecorded.current) {
    dailyRecorded.current = true;
    recordDailyResult(run.phase === 'won');
  }
  if (run.phase !== 'won' && run.phase !== 'lost') dailyRecorded.current = false;

  const renderPhase = () => {
    switch (run.phase) {
      case 'combat':
        return battle ? (
          <BattleView battle={battle} relicIds={relicIds} upgraded={run.upgraded} onPlay={handlePlay} onEndTurn={handleEndTurn} />
        ) : null;

      case 'reward':
        return <RewardView run={run} onPick={handlePickReward} />;

      case 'shop':
        return <ShopView run={run} onBuy={handleBuy} onRemove={handleRemove} onLeave={handleLeave} />;

      case 'event':
        return run.activeEvent ? <EventView run={run} onChoose={handleEvent} /> : null;

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
              <div className="stat-row"><span className="stat-label">剩余气血</span><span className="stat-value">{run.hp} / {run.maxHp}</span></div>
              <div className="stat-row"><span className="stat-label">牌组张数</span><span className="stat-value">{run.deck.length}</span></div>
              <div className="stat-row"><span className="stat-label">遗物数量</span><span className="stat-value">{run.relics.length}</span></div>
            </div>
            <button className="btn btn-primary" onClick={handleRestart}>再来一局</button>
          </div>
        );

      case 'lost':
        return (
          <div className="end-view card end-lost">
            <h2 className="end-title">☠️ 落败</h2>
            <p className="end-text">你倒在了黑风塔中。重整旗鼓,再来一世吧。</p>
            <div className="end-stats">
              <div className="stat-row"><span className="stat-label">止步层数</span><span className="stat-value">{run.nodeIndex + 1} 层</span></div>
              <div className="stat-row"><span className="stat-label">牌组张数</span><span className="stat-value">{run.deck.length}</span></div>
              <div className="stat-row"><span className="stat-label">遗物数量</span><span className="stat-value">{run.relics.length}</span></div>
            </div>
            <button className="btn btn-primary" onClick={handleRestart}>再来一局</button>
          </div>
        );

      case 'map':
      default:
        return (
          <div className="map-hint card">
            <p className="rest-text">黑风塔高耸入云,杀机四伏。在上方地图选择一条上塔的路吧。</p>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      <h1 className="app-title serif">黑风塔 · 卡牌江湖</h1>
      <p className="app-subtitle serif">武侠卡牌 · 一塔十层 · 登顶封侠</p>

      <DailyBanner
        mode={mode}
        currentFloor={run.nodeIndex + 1}
        cleared={run.phase === 'won'}
        onToDaily={toDaily}
        onToNormal={toNormal}
      />

      <StatusBar run={run} />

      <TowerMap nodes={run.nodes} nodeIndex={run.nodeIndex} options={nextOptions(run)} phase={run.phase} onChoose={handleEnterNode} />

      <div className="phase-area">{renderPhase()}</div>

      {/* 非战斗阶段也展示全程日志 */}
      {run.phase !== 'combat' && <LogView log={run.log} />}
    </div>
  );
}
