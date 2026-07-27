import { useState } from 'react';
import type { FormEvent } from 'react';

interface CommandBarProps {
  dead: boolean;
  inCombat: boolean;
  onCommand: (type: 'explore' | 'look' | 'rest' | 'status' | 'attack' | 'flee') => void;
  onText: (text: string) => void;
}

/** 命令区:常用命令按钮(战斗中动态出现攻击/逃跑)+ 底部中文文本输入框。 */
export default function CommandBar({ dead, inCombat, onCommand, onText }: CommandBarProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onText(value);
    setText('');
  };

  return (
    <div className="command-bar">
      <div className="command-buttons">
        {inCombat ? (
          <>
            <button type="button" className="btn btn-attack" disabled={dead} onClick={() => onCommand('attack')}>
              攻击
            </button>
            <button type="button" className="btn btn-flee" disabled={dead} onClick={() => onCommand('flee')}>
              逃跑
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn" disabled={dead} onClick={() => onCommand('explore')}>
              探索
            </button>
            <button type="button" className="btn" disabled={dead} onClick={() => onCommand('look')}>
              查看
            </button>
            <button type="button" className="btn" disabled={dead} onClick={() => onCommand('rest')}>
              休息
            </button>
            <button type="button" className="btn" disabled={dead} onClick={() => onCommand('status')}>
              状态
            </button>
          </>
        )}
      </div>

      <form className="command-input-row" onSubmit={handleSubmit}>
        <input
          className="command-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入命令:北/南/东/西/探索/攻击/逃跑/休息/查看/状态/使用 金疮药/装备 狂刀/对话 老郎中"
          disabled={dead}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={dead || !text.trim()}>
          执行
        </button>
      </form>
    </div>
  );
}
