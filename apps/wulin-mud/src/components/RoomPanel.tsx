import { DIR_LABELS, getRoom } from '@game/mud-core';
import type { Direction } from '@game/mud-core';

interface RoomPanelProps {
  roomId: string;
  dead: boolean;
  inCombat: boolean;
  onGo: (dir: Direction) => void;
  onTalk: (npcId: string) => void;
}

/** 当前区域卡:区域名/描述 + 出口方向按钮 + 可点击对话的 NPC。 */
export default function RoomPanel({ roomId, dead, inCombat, onGo, onTalk }: RoomPanelProps) {
  const room = getRoom(roomId);
  const exits = Object.entries(room.exits) as [Direction, string][];
  const npcs = room.npcs ?? [];

  return (
    <div className="card">
      <h3 className="section-title serif">
        {room.name}
        {room.safe ? <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>(安全区)</span> : null}
      </h3>
      <p className="room-desc">{room.desc}</p>

      <div className="exit-group">
        <div className="group-label">出口</div>
        {exits.length === 0 ? (
          <div className="inv-empty">四面无路。</div>
        ) : (
          <div className="btn-flow">
            {exits.map(([dir]) => (
              <button
                key={dir}
                type="button"
                className="btn btn-dir"
                disabled={dead || inCombat}
                title={inCombat ? '战斗中无法移动' : undefined}
                onClick={() => onGo(dir)}
              >
                {DIR_LABELS[dir]}
              </button>
            ))}
          </div>
        )}
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
