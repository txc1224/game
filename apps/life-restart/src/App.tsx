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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: 18,
          alignItems: 'start',
        }}
      >
        <div style={{ position: 'sticky', top: 20 }}>
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
        </div>

        <div>
          <h2 className="section-title serif">人生流年</h2>
          <YearTimeline entries={live.timeline} />
        </div>
      </div>
    </div>
  );
}
