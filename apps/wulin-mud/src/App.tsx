import { useCallback, useEffect, useMemo, useState } from 'react';
import { exec, getRoom, newGame, readPastLife } from '@game/mud-core';
import type { Command, Direction, MudState } from '@game/mud-core';
import Terminal from './components/Terminal';
import PlayerPanel from './components/PlayerPanel';
import RoomPanel from './components/RoomPanel';
import CommandBar from './components/CommandBar';
import GuidePanel from './components/GuidePanel';
import { parseCommand } from './mud';

const SAVE_KEY = 'wulin-mud:save';
const PLAYER_NAME = '无名侠客';

/** 尝试从 localStorage 恢复存档;失败(损坏/结构不符)则返回 null。 */
function loadSave(): MudState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MudState;
    if (!parsed || typeof parsed !== 'object' || !parsed.player || !Array.isArray(parsed.log)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 开局:读取前世彩蛋,若有则把称号与属性加成带入新一世。 */
function startNewGame(): MudState {
  const past = readPastLife();
  return newGame(PLAYER_NAME, past ? { pastLifeTitle: past.title, bonusAttrs: past.bonusAttrs } : undefined);
}

export default function App() {
  // 优先恢复存档;无存档则以彩蛋开局。
  const [state, setState] = useState<MudState>(() => loadSave() ?? startNewGame());

  // 每次状态变化后落盘(JSON 即可,inventory 是普通对象,combat 一并保留)。
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      // 存储失败(如隐私模式)不影响游戏进行
    }
  }, [state]);

  // exec 是就地修改 state.log,这里展开成新对象以触发重渲染。
  const run = useCallback((cmd: Command) => {
    setState((prev) => ({ ...exec(prev, cmd) }));
  }, []);

  const handleGo = useCallback((dir: Direction) => run({ type: 'go', dir }), [run]);
  const handleTalk = useCallback((npcId: string) => run({ type: 'talk', npcId }), [run]);
  const handleUse = useCallback((itemId: string) => run({ type: 'use', itemId }), [run]);
  const handleEquip = useCallback((itemId: string) => run({ type: 'equip', itemId }), [run]);

  const handleSimple = useCallback(
    (type: 'explore' | 'look' | 'rest' | 'status' | 'attack' | 'flee') => {
      run({ type } as Command);
    },
    [run],
  );

  // 文本命令:先本地解析;「对话 xx」需在当前区域里按名字定位 NPC。
  const handleText = useCallback(
    (input: string) => {
      const { cmd, raw } = parseCommand(input);
      if (!cmd) {
        setState((prev) => ({
          ...prev,
          log: [...prev.log, { text: `「${raw}」?你挠了挠头,没听懂自己要做什么。`, kind: 'system' as const }],
        }));
        return;
      }

      if (cmd.type === 'talk' && cmd.npcId.startsWith('name:')) {
        const name = cmd.npcId.slice('name:'.length);
        const npc = getRoom(state.player.roomId).npcs?.find((n) => n.name === name);
        if (!npc) {
          setState((prev) => ({
            ...prev,
            log: [...prev.log, { text: `这里没有叫「${name}」的人。`, kind: 'bad' as const }],
          }));
          return;
        }
        run({ type: 'talk', npcId: npc.id });
        return;
      }

      run(cmd);
    },
    [run, state.player.roomId],
  );

  // 重新来过:清掉旧档,以彩蛋重开一世。
  const handleRebirth = useCallback(() => {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    setState(startNewGame());
  }, []);

  const past = useMemo(() => readPastLife(), []);
  const inCombat = state.combat !== null;

  return (
    <div className="app-shell">
      <h1 className="app-title serif">武林群侠传 · 文字江湖</h1>
      <p className="app-subtitle">一柄青锋,一卷江湖 —— 用命令闯荡属于你的武林</p>

      {past && (
        <div className="pastlife-banner">
          <span className="pastlife-tag serif">前世 · {past.title}</span>
          <span className="pastlife-intro">{past.intro}</span>
        </div>
      )}

      <div className="main-grid">
        <div className="side-col">
          <PlayerPanel player={state.player} dead={state.dead} onUse={handleUse} onEquip={handleEquip} />
          <RoomPanel
            roomId={state.player.roomId}
            dead={state.dead}
            inCombat={inCombat}
            onGo={handleGo}
            onTalk={handleTalk}
          />
          <GuidePanel state={state} onGo={handleGo} onSimple={handleSimple} onTalk={handleTalk} />
        </div>

        <div>
          <Terminal log={state.log} />
          <CommandBar dead={state.dead} inCombat={inCombat} onCommand={handleSimple} onText={handleText} />

          {state.dead && (
            <div className="death-overlay">
              <h2 className="death-title serif">侠客陨落</h2>
              <p className="death-text">
                {state.player.name} 的江湖路走到了尽头。江湖依旧,只是少了一个传说。
              </p>
              <button type="button" className="btn btn-primary btn-lg" onClick={handleRebirth}>
                重新来过
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
