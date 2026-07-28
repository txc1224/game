import { useEffect, useState } from 'react';
import { todayKey } from '@game/card-core';

interface DailyBannerProps {
  mode: 'normal' | 'daily';
  currentFloor: number;
  cleared: boolean;
  onToDaily: () => void;
  onToNormal: () => void;
}

const RESULT_KEY = 'card-rogue:daily-result';

/** 每日一塔横幅:切换模式、显示今日最佳成绩、分享战报。 */
export default function DailyBanner({ mode, currentFloor, cleared, onToDaily, onToNormal }: DailyBannerProps) {
  const [best, setBest] = useState<{ floor: number; cleared: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem(RESULT_KEY) ?? '{}') as Record<string, { floor: number; cleared: boolean }>;
      setBest(all[todayKey()] ?? null);
    } catch {
      setBest(null);
    }
  }, [mode, currentFloor, cleared]);

  const handleShare = async () => {
    const floor = cleared ? '通关' : `第 ${currentFloor} 层`;
    const text = `【黑风塔 · 每日一塔 ${todayKey()}】我今日爬到了${floor}!来和我比一比 → ${location.origin}${location.pathname}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用则忽略
    }
  };

  if (mode !== 'daily') {
    return (
      <div className="daily-banner daily-off">
        <span className="daily-text">每日一塔:与天下侠客同闯一座塔,看谁走得远。</span>
        <button type="button" className="btn btn-sm daily-btn" onClick={onToDaily}>
          挑战今日之塔 →
        </button>
      </div>
    );
  }

  return (
    <div className="daily-banner daily-on">
      <div className="daily-left">
        <span className="daily-tag">📅 每日一塔</span>
        <span className="daily-date">{todayKey()}</span>
        {best && (
          <span className="daily-best">
            今日最佳:{best.cleared ? '已通关' : `第 ${best.floor} 层`}
          </span>
        )}
      </div>
      <div className="daily-right">
        <button type="button" className="btn btn-sm" onClick={() => void handleShare()}>
          {copied ? '已复制 ✓' : '📣 分享战报'}
        </button>
        <button type="button" className="btn btn-sm daily-btn-ghost" onClick={onToNormal}>
          返回常规
        </button>
      </div>
    </div>
  );
}
