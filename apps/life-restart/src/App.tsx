import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Allocation, Attributes, AttrKey, Ending, Trait, YearResult } from '@game/game-core';
import { advanceLife, fetchMeta } from './api';
import type { StartLifeData } from './api';
import { AttributePanel } from './components/AttributePanel';
import { TraitDraft } from './components/TraitDraft';
import { YearTimeline } from './components/YearTimeline';
import type { TimelineEntry } from './components/YearTimeline';
import { EndingSummary } from './components/EndingSummary';
import { LivesHistory } from './components/LivesHistory';

type Stage = 'draft' | 'live' | 'ending';

interface LiveState {
  lifeId: string;
  age: number;
  attrs: Attributes;
  pendingPoints: number;
  timeline: TimelineEntry[];
  chosenTraits: Trait[];
  /** 近况:武功/家室/灵宠/仇敌 */
  skills: string[];
  spouse?: string;
  pet?: string;
  heirs: { name: string; bornAtAge: number }[];
  enemyCount: number;
  allyCount: number;
}

export default function App() {
  const [stage, setStage] = useState<Stage>('draft');
  const [showHistory, setShowHistory] = useState(false);
  const [initialPoints, setInitialPoints] = useState<number>(12);
  const [live, setLive] = useState<LiveState | null>(null);
  const [ending, setEnding] = useState<Ending | null>(null);

  useEffect(() => {
    fetchMeta()
      .then((m) => setInitialPoints(m.initialPoints))
      .catch(() => {
        // meta 拉取失败不阻塞流程,沿用本地默认值 12
      });
  }, []);

  function handleStarted(data: StartLifeData, chosenTraits: Trait[]) {
    setLive({
      lifeId: data.lifeId,
      age: data.age,
      attrs: data.attrs,
      pendingPoints: data.pendingPoints,
      timeline: [],
      chosenTraits,
      skills: [],
      heirs: [],
      enemyCount: 0,
      allyCount: 0,
    });
    setEnding(null);
    setShowHistory(false);
    setStage('live');
  }

  function handleFinished(result: YearResult) {
    if (result.ending) setEnding(result.ending);
    setStage('ending');
  }

  function handleRestart() {
    setLive(null);
    setEnding(null);
    setShowHistory(false);
    setStage('draft');
  }

  return (
    <div className="app-shell">
      <h1 className="app-title serif">人生重开 · 仗剑江湖</h1>
      <p className="app-subtitle">一世一命,一剑一江湖</p>

      {showHistory ? (
        <LivesHistory onBack={() => setShowHistory(false)} />
      ) : stage === 'draft' ? (
        <>
          <TraitDraft initialPoints={initialPoints} onStarted={handleStarted} />
          <div className="center" style={{ marginTop: 20 }}>
            <button type="button" className="btn" onClick={() => setShowHistory(true)}>
              历代人生
            </button>
          </div>
        </>
      ) : stage === 'live' && live ? (
        <LiveStage live={live} setLive={setLive} onFinished={handleFinished} />
      ) : stage === 'ending' && ending ? (
        <EndingSummary
          ending={ending}
          timeline={live?.timeline ?? []}
          onRestart={handleRestart}
          onShowHistory={() => setShowHistory(true)}
        />
      ) : null}
    </div>
  );
}

/** 推进阶段:左侧属性 + 加点,右侧时间线 */
function LiveStage({
  live,
  setLive,
  onFinished,
}: {
  live: LiveState;
  setLive: Dispatch<SetStateAction<LiveState | null>>;
  onFinished: (result: YearResult) => void;
}) {
  const [alloc, setAlloc] = useState<Allocation>({});
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spent = useMemo(
    () => Object.values(alloc).reduce((sum: number, v) => sum + (v ?? 0), 0),
    [alloc],
  );
  const remaining = live.pendingPoints - spent;

  function changeAlloc(key: AttrKey, delta: number) {
    setAlloc((prev) => {
      const cur = prev[key] ?? 0;
      const next = cur + delta;
      if (next < 0) return prev;
      if (delta > 0 && remaining <= 0) return prev;
      const out: Allocation = { ...prev, [key]: next };
      if (next === 0) delete out[key];
      return out;
    });
  }

  async function handleAdvance() {
    setAdvancing(true);
    setError(null);
    try {
      const result = await advanceLife(live.lifeId, spent > 0 ? alloc : undefined);
      setLive((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          age: result.age,
          attrs: result.attrs,
          // 后端每年回充可分配点数并回传;死亡/完结后归零
          pendingPoints: result.dead || result.finished ? 0 : result.pendingPoints,
          // 同步近况
          skills: result.skills ?? prev.skills,
          spouse: result.spouse ?? prev.spouse,
          pet: result.pet ?? prev.pet,
          heirs: result.heirs ?? prev.heirs,
          enemyCount: result.enemyCount ?? prev.enemyCount,
          allyCount: result.allyCount ?? prev.allyCount,
          timeline: [
            ...prev.timeline,
            {
              age: result.age,
              stage: result.stage,
              text: result.text,
              dead: result.dead,
              gainedFlags: result.gainedFlags,
            },
          ],
        };
      });
      setAlloc({});
      if (result.dead || result.finished) {
        onFinished(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '推进失败');
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div>
      {error ? <div className="error-box">{error}</div> : null}
      <div className="live-grid">
        <div className="live-side">
          <h2 className="section-title serif">
            {live.age} 岁 · 属性
          </h2>
          <AttributePanel
            attrs={live.attrs}
            budget={remaining}
            alloc={alloc}
            onAllocChange={changeAlloc}
            footer={
              <div className="muted">
                本年可分配点数:<strong style={{ color: '#f0e6c8' }}>{remaining}</strong> / {live.pendingPoints}
              </div>
            }
          />
          <div className="center" style={{ marginTop: 18 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg serif"
              disabled={advancing}
              onClick={() => void handleAdvance()}
            >
              {advancing ? '岁月流转……' : '再活一年'}
            </button>
          </div>

          <StatusCard live={live} />
        </div>

        <div>
          <h2 className="section-title serif">人生流年</h2>
          <YearTimeline entries={live.timeline} />
        </div>
      </div>
    </div>
  );
}

/** 人物近况:武功 / 家室 / 灵宠 / 恩怨 */
function StatusCard({ live }: { live: LiveState }) {
  const hasAnything =
    live.skills.length > 0 || live.spouse || live.pet || live.heirs.length > 0 || live.enemyCount > 0 || live.allyCount > 0;
  if (!hasAnything) return null;
  return (
    <div className="card" style={{ marginTop: 18, padding: 14 }}>
      {live.skills.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>武功</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {live.skills.map((s) => (
              <span key={s} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, border: '1px solid #a142f4', color: '#c998f5', whiteSpace: 'nowrap' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 13, color: '#c2c7ce' }}>
        {live.spouse && <div>道侣 · <span style={{ color: '#e6c07a' }}>{live.spouse}</span></div>}
        {live.heirs.length > 0 && <div>子嗣 · <span style={{ color: '#e6c07a' }}>{live.heirs.map((h) => h.name).join('、')}</span></div>}
        {live.pet && <div>灵宠 · <span style={{ color: '#7dd38a' }}>{live.pet}</span></div>}
        {live.allyCount > 0 && <div>结义 · <span style={{ color: '#8ab4f8' }}>{live.allyCount} 人</span></div>}
        {live.enemyCount > 0 && <div>仇敌 · <span style={{ color: '#e07a7a' }}>{live.enemyCount} 人</span></div>}
      </div>
    </div>
  );
}
