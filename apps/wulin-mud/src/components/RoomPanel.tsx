import { DIR_LABELS, getRoom } from '@game/mud-core';
import type { Direction } from '@game/mud-core';

interface RoomPanelProps {
  roomId: string;
  dead: boolean;
  inCombat: boolean;
  onGo: (dir: Direction) => void;
  onTalk: (npcId: string) => void;
}

/** 方位盘中各方向的位置(3x3 网格) */
const DIRS: { dir: Direction; area: string; arrow: string }[] = [
  { dir: 'north', area: 'n', arrow: '↑' },
  { dir: 'west', area: 'w', arrow: '←' },
  { dir: 'east', area: 'e', arrow: '→' },
  { dir: 'south', area: 's', arrow: '↓' },
];

/** 当前区域卡:区域名/描述 + 3x3 方位盘(带目的地)+ NPC。 */
export default function RoomPanel({ roomId, dead, inCombat, onGo, onTalk }: RoomPanelProps) {
  const room = getRoom(roomId);
  const npcs = room.npcs ?? [];

  // 各方向的目的地房间名
  const destName = (dir: Direction): string | null => {
    const destId = room.exits[dir];
    return destId ? getRoom(destId).name : null;
  };

  const dirBtn = (dir: Direction) => {
    const dest = destName(dir);
    const has = dest !== null;
    return (
      <button
        key={dir}
        type="button"
        className={`compass-btn compass-${dir} ${has ? 'has-exit' : 'no-exit'}`}
        disabled={dead || inCombat || !has}
        title={has ? `往${DIR_LABELS[dir]} → ${dest}` : '此向无路'}
        onClick={() => onGo(dir)}
      >
        <span className="compass-arrow">{has ? DIRS.find((d) => d.dir === dir)!.arrow : '·'}</span>
        <span className="compass-dir">{DIR_LABELS[dir]}</span>
        {has && <span className="compass-dest">{dest}</span>}
      </button>
    );
  };

  return (
    <div className="card">
      <h3 className="section-title serif">
        {room.name}
        {room.safe ? <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>(安全区)</span> : null}
      </h3>
      <p className="room-desc">{room.desc}</p>

      {/* 3x3 方位盘 */}
      <div className="compass">
        <div className="compass-cell compass-n">{dirBtn('north')}</div>
        <div className="compass-cell compass-w">{dirBtn('west')}</div>
        <div className="compass-cell compass-center">
          <span className="compass-center-dot">◈</span>
          <span className="compass-center-label">{room.name}</span>
        </div>
        <div className="compass-cell compass-e">{dirBtn('east')}</div>
        <div className="compass-cell compass-s">{dirBtn('south')}</div>
      </div>

      {npcs.length > 0 && (
        <div className="npc-group">
          <div className="group-label">人物</div>
          <div className="btn-flow">
            {npcs.map((npc) => (
              <button
                key={npc.id}
                type="button"
                className="btn btn-npc"
                disabled={dead || inCombat}
                title={npc.line}
                onClick={() => onTalk(npc.id)}
              >
                {npc.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
