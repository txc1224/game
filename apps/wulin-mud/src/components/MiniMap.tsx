import { getRoom } from '@game/mud-core';
import type { Direction, MudState } from '@game/mud-core';

interface MiniMapProps {
  state: MudState;
  onGo: (dir: Direction) => void;
}

/** 区域在地图上的固定布局(grid 行列) */
const LAYOUT: Record<string, { row: number; col: number; emoji: string }> = {
  'wang-you-gu': { row: 0, col: 1, emoji: '🌿' },
  'qingxi-cun': { row: 1, col: 1, emoji: '🏡' },
  'qing-shan': { row: 1, col: 2, emoji: '⛰️' },
  'hei-feng-zhai': { row: 1, col: 3, emoji: '🏴' },
  'duan-hun-ya': { row: 0, col: 3, emoji: '⚡' },
};

/** 简易区域地图:节点拓扑,当前位置高亮,点相邻连通区快速移动。 */
export default function MiniMap({ state, onGo }: MiniMapProps) {
  const cur = state.player.roomId;
  const curRoom = getRoom(cur);
  const reachable = new Set(Object.values(curRoom.exits));

  return (
    <div className="card minimap-card">
      <h3 className="section-title serif">江湖舆图</h3>
      <div className="minimap">
        {Object.entries(LAYOUT).map(([id, pos]) => {
          const room = getRoom(id);
          const isCurrent = id === cur;
          const canGo = reachable.has(id) && !state.dead && state.combat === null;
          return (
            <button
              key={id}
              type="button"
              className={`minimap-node ${isCurrent ? 'current' : ''} ${canGo ? 'reachable' : ''}`}
              style={{ gridRow: pos.row + 1, gridColumn: pos.col + 1 }}
              disabled={!canGo}
              title={isCurrent ? `当前位置:${room.name}` : canGo ? `前往 ${room.name}` : room.name}
              onClick={() => {
                if (!canGo) return;
                // 找到通往该房间的方向
                const dir = (Object.entries(curRoom.exits) as [Direction, string][]).find(([, dest]) => dest === id)?.[0];
                if (dir) onGo(dir);
              }}
            >
              <span className="minimap-emoji">{pos.emoji}</span>
              <span className="minimap-name">{room.name}</span>
              {isCurrent && <span className="minimap-you">你在此</span>}
            </button>
          );
        })}
      </div>
      <div className="minimap-hint muted">发光的相邻区域可直接点击前往</div>
    </div>
  );
}
