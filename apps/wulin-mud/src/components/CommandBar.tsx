import { useState } from 'react';
import type { FormEvent } from 'react';

interface CommandBarProps {
  dead: boolean;
  inCombat: boolean;
  /** 是否可挑战 BOSS(在断魂崖且未通关) */
  canChallenge?: boolean;
  onCommand: (type: 'explore' | 'look' | 'rest' | 'status' | 'attack' | 'flee') => void;
  onChallenge?: () => void;
  onText: (text: string) => void;
}

/** 命令区:情境命令按钮组(点按即达),文本输入作为可折叠的高级入口。 */
export default function CommandBar({ dead, inCombat, canChallenge, onCommand, onChallenge, onText }: CommandBarProps) {
  const [text, setText] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onText(value);
    setText('');
  };

  return (
    <div className="command-bar">
      {/* 情境命令按钮组 */}
      <div className="command-buttons">
        {inCombat ? (
          <>
            <button type="button" className="btn btn-attack" disabled={dead} onClick={() => onCommand('attack')}>
              ⚔️ 攻击
            </button>
            <button type="button" className="btn btn-flee" disabled={dead} onClick={() => onCommand('flee')}>
              💨 逃跑
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn" disabled={dead} onClick={() => onCommand('explore')}>
              🔍 探索
            </button>
            <button type="button" className="btn" disabled={dead} onClick={() => onCommand('look')}>
              👀 查看
            </button>
            <button type="button" className="btn" disabled={dead} onClick={() => onCommand('rest')}>
              😴 休息
            </button>
            <button type="button" className="btn" disabled={dead} onClick={() => onCommand('status')}>
              📜 状态
            </button>
            {canChallenge && onChallenge && (
              <button type="button" className="btn btn-boss" disabled={dead} onClick={onChallenge}>
                👑 挑战寨主
              </button>
            )}
          </>
        )}
        <button
          type="button"
          className="btn btn-ghost cmd-toggle"
          onClick={() => setShowInput((v) => !v)}
          title="输入文字命令"
        >
          ⌨️ {showInput ? '收起' : '指令'}
        </button>
      </div>

      {/* 文本输入(可折叠高级入口) */}
      {showInput && (
        <form className="command-input-row" onSubmit={handleSubmit}>
          <input
            className="command-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="输入命令:北/南/东/西/探索/攻击/使用 金疮药/装备 狂刀/对话 老郎中"
            disabled={dead}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={dead || !text.trim()}>
            执行
          </button>
        </form>
      )}
    </div>
  );
}
