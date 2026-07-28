import { useEffect, useState } from 'react';
import { readProfile, renownTitle, type Profile } from '../achievements';
import MedalWall from './MedalWall';

/** 侠影档案:聚合三款游戏的成就,展示江湖声望与档案墙。 */
export default function ProfilePanel() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    setProfile(readProfile());
  }, []);

  if (!profile) return null;
  const anyPlayed = profile.life.played || profile.mud.played || profile.card.played;

  if (!anyPlayed) {
    return (
      <div className="profile-empty">
          初入江湖,尚无档案。去玩一款游戏,这里就会记下你的侠影。
      </div>
    );
  }

  const title = renownTitle(profile.renown);

  return (
    <div className="profile-panel">
      <div className="profile-head">
        <div className="profile-title-group">
          <span className="profile-kicker">侠影档案</span>
          <h2 className="profile-title serif">{title}</h2>
        </div>
        <div className="profile-renown">
          <span className="profile-renown-num">{profile.renown}</span>
          <span className="profile-renown-label">江湖声望</span>
        </div>
      </div>

      <div className="profile-grid">
        {/* 人生重开 */}
        <div className={`profile-card ${profile.life.played ? '' : 'dim'}`}>
          <div className="profile-card-head">🗡️ 人生重开</div>
          {profile.life.played ? (
            <ul className="profile-list">
              <li><span>历经</span><strong>{profile.life.lives} 世</strong></li>
              {profile.life.bestTitle && <li><span>最高成就</span><strong className="hl">{profile.life.bestTitle}</strong></li>}
              {profile.life.bestAge !== undefined && <li><span>最长寿</span><strong>{profile.life.bestAge} 岁</strong></li>}
              {profile.life.recentEnding && <li><span>最近一世</span><strong>{profile.life.recentEnding}</strong></li>}
            </ul>
          ) : (
            <div className="profile-none">尚未投胎</div>
          )}
        </div>

        {/* 武林 MUD */}
        <div className={`profile-card ${profile.mud.played ? '' : 'dim'}`}>
          <div className="profile-card-head">⚔️ 武林群侠传</div>
          {profile.mud.played ? (
            <ul className="profile-list">
              <li><span>修为</span><strong>Lv.{profile.mud.level}</strong></li>
              <li><span>武功</span><strong className="hl">{profile.mud.skills} 门</strong></li>
              <li><span>境况</span><strong>{profile.mud.alive ? '闯荡中' : '已陨落'}</strong></li>
            </ul>
          ) : (
            <div className="profile-none">尚未入谷</div>
          )}
        </div>

        {/* 黑风塔 */}
        <div className={`profile-card ${profile.card.played ? '' : 'dim'}`}>
          <div className="profile-card-head">🃏 黑风塔</div>
          {profile.card.played ? (
            <ul className="profile-list">
              <li><span>登顶</span><strong className={profile.card.cleared ? 'hl' : ''}>{profile.card.cleared ? '已通关' : `第 ${profile.card.floor} 层`}</strong></li>
              <li><span>牌组</span><strong>{profile.card.deckSize} 张</strong></li>
              <li><span>遗物</span><strong>{profile.card.relics} 件</strong></li>
            </ul>
          ) : (
            <div className="profile-none">尚未登塔</div>
          )}
        </div>
      </div>

      <MedalWall profile={profile} />
    </div>
  );
}
