import { useEffect, useMemo, useState } from 'react';
import { ATTR_LABELS, ATTR_KEYS, ALLOC_CAP_PER_ATTR, BASE_ATTRS, RARITY_COLORS, RARITY_LABELS } from '@game/game-core';
import type { Allocation, Attributes, AttrKey, Trait } from '@game/game-core';
import { rollTraits, startLife } from '../api';
import type { StartLifeData } from '../api';
import { AttributePanel } from './AttributePanel';

interface TraitDraftProps {
  initialPoints: number;
  /** 开局成功后上抛给 App 进入 live 阶段 */
  onStarted: (data: StartLifeData, chosenTraits: Trait[]) => void;
}

/** 格式化词条的属性修正,如「臂力 +6 · 根骨 +2」 */
function formatAttrMod(mod: Partial<Attributes>): string {
  const parts: string[] = [];
  for (const k of ATTR_KEYS) {
    const v = mod[k];
    if (typeof v === 'number' && v !== 0) {
      parts.push(`${ATTR_LABELS[k]} ${v > 0 ? '+' : ''}${v}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : '无属性修正';
}

export function TraitDraft({ initialPoints, onStarted }: TraitDraftProps) {
  const [traits, setTraits] = useState<Trait[]>([]);
  const [rerollLeft, setRerollLeft] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [alloc, setAlloc] = useState<Allocation>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spent = useMemo(
    () => ATTR_KEYS.reduce((sum, k) => sum + (alloc[k] ?? 0), 0),
    [alloc],
  );
  const remaining = initialPoints - spent;

  async function loadTraits(isReroll = false) {
    setLoading(true);
    setError(null);
    try {
      const data = await rollTraits();
      setTraits(data.traits);
      // 后端每次都回满 REROLL_MAX,故刷新次数由前端本地维护:首次装载用后端值,之后递减
      setRerollLeft((prev) => (isReroll ? Math.max(0, prev - 1) : data.rerollLeft));
      // 默认全选一手词条,允许玩家点选取舍
      setSelected(new Set(data.traits.map((t) => t.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '抽取词条失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTraits(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTrait(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function changeAlloc(key: AttrKey, delta: number) {
    setAlloc((prev) => {
      const cur = prev[key] ?? 0;
      const next = cur + delta;
      if (next < 0) return prev;
      if (next > ALLOC_CAP_PER_ATTR) return prev; // 单项加点上限,与后端一致
      if (delta > 0 && remaining <= 0) return prev;
      const out: Allocation = { ...prev, [key]: next };
      if (next === 0) delete out[key];
      return out;
    });
  }

  async function handleStart() {
    if (selected.size === 0) {
      setError('请至少选择一个词条,方能踏入江湖。');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const chosen = traits.filter((t) => selected.has(t.id));
      const data = await startLife({
        traitIds: [...selected],
        initialAlloc: spent > 0 ? alloc : undefined,
      });
      onStarted(data, chosen);
    } catch (e) {
      setError(e instanceof Error ? e.message : '开局失败');
      setStarting(false);
    }
  }

  return (
    <div>
      <h2 className="section-title serif">选择你的先天天赋</h2>
      <p className="muted" style={{ marginTop: -6 }}>
        命由天定,运由己造。点击卡片可取舍词条,选中的词条将伴随你一生。
      </p>

      {error ? <div className="error-box">{error}</div> : null}

      {loading ? (
        <div className="card center muted" style={{ padding: 48 }}>
          正在为你掷出先天天赋……
        </div>
      ) : (
        <>
          <div className="trait-grid">
            {traits.map((t) => {
              const color = RARITY_COLORS[t.rarity];
              const active = selected.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTrait(t.id)}
                  style={{
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    borderRadius: 10,
                    padding: 16,
                    background: active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${color}`,
                    boxShadow: active ? `0 0 0 1px ${color}, 0 6px 18px rgba(0,0,0,0.4)` : 'none',
                    opacity: active ? 1 : 0.55,
                    transition: 'all 0.15s ease',
                    color: '#e6e1d5',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span
                      className="serif"
                      style={{ fontSize: 18, fontWeight: 600, color: '#f0e6c8', letterSpacing: 1 }}
                    >
                      {t.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 999,
                        border: `1px solid ${color}`,
                        color,
                        letterSpacing: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {RARITY_LABELS[t.rarity]}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.6, color: '#c2c7ce' }}>{t.desc}</p>
                  <div style={{ fontSize: 12, color: '#9aa0a6' }}>{formatAttrMod(t.attrMod)}</div>
                  <div style={{ marginTop: 10, fontSize: 12, color: active ? '#7dd38a' : '#8a8f98' }}>
                    {active ? '✓ 已选中' : '点击选择'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="center" style={{ marginBottom: 22 }}>
            <button type="button" className="btn" disabled={rerollLeft <= 0 || loading} onClick={() => void loadTraits(true)}>
              刷新词条{rerollLeft > 0 ? `(剩 ${rerollLeft} 次)` : '(已用完)'}
            </button>
          </div>

          <h2 className="section-title serif">分配初始属性</h2>
          <AttributePanel
            attrs={baseFromTraits(traits, selected)}
            budget={remaining}
            alloc={alloc}
            onAllocChange={changeAlloc}
            footer={
              <div className="muted">
                剩余可分配点数:<strong style={{ color: '#f0e6c8' }}>{remaining}</strong> / {initialPoints}
                (面板数值已含词条加成与预览加点)
              </div>
            }
          />

          <div className="center" style={{ marginTop: 28 }}>
            <button type="button" className="btn btn-primary btn-lg serif" disabled={starting} onClick={() => void handleStart()}>
              {starting ? '踏入中……' : '踏入江湖'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** 以基础值 + 选中词条的加成作为初始面板基准 */
function baseFromTraits(traits: Trait[], selected: Set<string>): Attributes {
  const base: Attributes = { ...BASE_ATTRS };
  for (const t of traits) {
    if (!selected.has(t.id)) continue;
    for (const k of ATTR_KEYS) {
      base[k] += t.attrMod[k] ?? 0;
    }
  }
  return base;
}
