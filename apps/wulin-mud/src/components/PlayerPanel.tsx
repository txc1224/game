import { ITEMS, SKILL_MAP, SKILL_KIND_LABELS } from '@game/mud-core';
import type { Player } from '@game/mud-core';
import { ATTR_LABELS } from '../mud';

interface PlayerPanelProps {
  player: Player;
  dead: boolean;
  onUse: (itemId: string) => void;
  onEquip: (itemId: string) => void;
}

/** 玩家状态卡:基本数值 + 气血条 + 六维属性 + 背包(可点用/装备)。 */
export default function PlayerPanel({ player, dead, onUse, onEquip }: PlayerPanelProps) {
  const hpPct = player.maxHp > 0 ? Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100)) : 0;
  const weaponName = player.weaponId ? ITEMS[player.weaponId]?.name ?? '未知' : '无';
  const invEntries = Object.entries(player.inventory).filter(([, cnt]) => cnt > 0);

  return (
    <div className="card">
      <h3 className="section-title serif">侠客</h3>

      <div className="stat-row">
        <span className="stat-label">姓名</span>
        <span className="stat-value">{player.name}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">等级</span>
        <span className="stat-value">Lv.{player.level}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">阅历</span>
        <span className="stat-value">{player.exp}</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">银两</span>
        <span className="stat-value">{player.gold} 两</span>
      </div>
      <div className="stat-row">
        <span className="stat-label">武器</span>
        <span className="stat-value">{weaponName}</span>
      </div>

      <div className="hp-bar-wrap">
        <div className="hp-bar-label">
          <span>气血</span>
          <span>
            {Math.max(0, player.hp)}/{player.maxHp}
          </span>
        </div>
        <div className="hp-bar">
          <div className="hp-bar-fill" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      <div className="attr-grid">
        {Object.entries(player.attrs).map(([key, value]) => (
          <div className="attr-cell" key={key}>
            <span className="k">{ATTR_LABELS[key] ?? key}</span>
            <span className="v">{value}</span>
          </div>
        ))}
      </div>

      {player.skills.length > 0 && (
        <>
          <h3 className="section-title serif" style={{ marginTop: 16 }}>
            武功
          </h3>
          <div className="skill-list">
            {player.skills.map((id) => {
              const s = SKILL_MAP.get(id);
              if (!s) return null;
              return (
                <span key={id} className="skill-badge" title={`${SKILL_KIND_LABELS[s.kind]} · ${s.desc}`}>
                  {s.name}
                  <em>{SKILL_KIND_LABELS[s.kind]}</em>
                </span>
              );
            })}
          </div>
        </>
      )}

      <h3 className="section-title serif" style={{ marginTop: 18 }}>
        背包
      </h3>
      {invEntries.length === 0 ? (
        <div className="inv-empty">空空如也。</div>
      ) : (
        <div className="inv-list">
          {invEntries.map(([itemId, cnt]) => {
            const item = ITEMS[itemId];
            if (!item) return null;
            const isWeapon = item.kind === 'weapon';
            const equipped = isWeapon && player.weaponId === itemId;
            const usable = item.kind === 'pill' && Boolean(item.heal);
            const clickable = !dead && (isWeapon || usable);
            const label = equipped ? `${item.name}(已装备)` : item.name;
            return (
              <button
                key={itemId}
                type="button"
                className="btn btn-item"
                disabled={!clickable}
                title={item.desc}
                onClick={() => (isWeapon ? onEquip(itemId) : onUse(itemId))}
              >
                {label}
                <span className="cnt">x{cnt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
