import { useEffect, useState } from 'react';
import { ATTR_LABELS, ATTR_KEYS, getTrait } from '@game/game-core';
import type { Attributes } from '@game/game-core';
import { fetchLifeDetail, fetchLives } from '../api';
import type { LifeDetail, LifeRow } from '../api';
import { YearTimeline } from './YearTimeline';

interface LivesHistoryProps {
  /** 返回(回到结局页或开局页) */
  onBack: () => void;
}

export function LivesHistory({ onBack }: LivesHistoryProps) {
  const [rows, setRows] = useState<LifeRow[] | null>(null);
  const [detail, setDetail] = useState<LifeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLives()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '读取历代人生失败');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function openDetail(id: string) {
    setLoadingDetail(true);
    setError(null);
    try {
      const data = await fetchLifeDetail(id);
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取人生明细失败');
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 className="section-title serif" style={{ margin: 0 }}>
          {detail ? '人生明细' : '历代人生'}
        </h2>
        <button type="button" className="btn" onClick={() => (detail ? setDetail(null) : onBack())}>
          {detail ? '← 返回列表' : '← 返回'}
        </button>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      {detail ? (
        <DetailView detail={detail} />
      ) : rows === null ? (
        <div className="card center muted" style={{ padding: 40 }}>
          正在翻阅生死簿……
        </div>
      ) : rows.length === 0 ? (
        <div className="card center muted" style={{ padding: 40 }}>
          生死簿上尚无记载,去活一世再来。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => void openDetail(r.id)}
              className="card"
              style={{
                textAlign: 'left',
                fontFamily: 'inherit',
                cursor: 'pointer',
                color: '#e6e1d5',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
              disabled={loadingDetail}
            >
              <span className="serif" style={{ fontSize: 18, color: '#e8d9a8', minWidth: 110 }}>
                {r.name || '无名氏'}
              </span>
              <span className="muted">终年 {r.final_age} 岁</span>
              <span
                style={{
                  fontSize: 12,
                  color: '#b89b5e',
                  border: '1px solid rgba(184,155,94,0.4)',
                  borderRadius: 999,
                  padding: '1px 8px',
                }}
              >
                {r.ending_title}
              </span>
              <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
                {formatTime(r.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailView({ detail }: { detail: LifeDetail }) {
  const lastIdx = detail.years.length - 1;
  const entries = detail.years.map((y, i) => ({
    age: y.age,
    stage: y.stage,
    text: y.event_text,
    // 已落幕的人生,最后一年即为终年
    dead: i === lastIdx,
  }));

  return (
    <div>
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
          <span className="serif" style={{ fontSize: 24, color: '#e8d9a8' }}>
            {detail.name || '无名氏'}
          </span>
          <span className="muted">终年 {detail.final_age} 岁</span>
          <span
            style={{
              fontSize: 13,
              color: '#b89b5e',
              border: '1px solid rgba(184,155,94,0.4)',
              borderRadius: 999,
              padding: '2px 10px',
            }}
          >
            {detail.ending_title}
          </span>
        </div>
        <p className="muted" style={{ margin: '0 0 12px', lineHeight: 1.7 }}>
          死因:{detail.cause}
        </p>
        <p className="serif" style={{ margin: '0 0 14px', lineHeight: 1.9, color: '#d5dae1' }}>
          {detail.evaluation}
        </p>

        {detail.traits.length > 0 ? (
          <div style={{ marginBottom: 14 }}>
            <div className="muted" style={{ marginBottom: 6 }}>先天天赋</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {detail.traits.map((id) => (
                <span
                  key={id}
                  style={{
                    fontSize: 12,
                    padding: '3px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.18)',
                    color: '#c2c7ce',
                  }}
                >
                  {traitName(id)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="muted" style={{ marginBottom: 6 }}>最终属性</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {ATTR_KEYS.map((k) => (
            <span key={k} className="muted" style={{ fontSize: 13 }}>
              {ATTR_LABELS[k]} <strong style={{ color: '#f0e6c8' }}>{detail.attrs[k]}</strong>
            </span>
          ))}
        </div>
      </div>

      <h3 className="section-title serif" style={{ fontSize: 16 }}>
        逐年回顾
      </h3>
      <YearTimeline entries={entries} />
    </div>
  );
}

function traitName(id: string): string {
  try {
    return getTrait(id).name;
  } catch {
    return id;
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', { hour12: false });
}
