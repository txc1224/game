import { evalMedals, type Profile } from '../achievements';

const TIER_LABEL: Record<string, string> = {
  bronze: '铜',
  silver: '银',
  gold: '金',
};

/** 成就勋章墙:已解锁点亮,未解锁灰显并示进度。 */
export default function MedalWall({ profile }: { profile: Profile }) {
  const medals = evalMedals(profile);
  const unlockedCount = medals.filter((m) => m.isUnlocked).length;

  return (
    <div className="medal-wall">
      <div className="medal-head">
        <span className="profile-kicker">成就勋章</span>
        <span className="medal-count">
          {unlockedCount} / {medals.length}
        </span>
      </div>
      <div className="medal-grid">
        {medals.map((m) => (
          <div
            key={m.id}
            className={`medal medal-${m.tier} ${m.isUnlocked ? 'unlocked' : 'locked'}`}
            title={`${m.name}(${TIER_LABEL[m.tier]})——${m.desc}${m.isUnlocked ? ' · 已解锁' : ''}`}
          >
            <span className="medal-emoji">{m.emoji}</span>
            <span className="medal-name">{m.name}</span>
            {m.isUnlocked ? (
              <span className="medal-check">✓</span>
            ) : (
              <span className="medal-progress">{m.progressText ?? m.desc}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
