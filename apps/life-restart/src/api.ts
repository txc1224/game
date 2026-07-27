/**
 * 数据访问层 —— 当前为「本地单机模式」:直接在浏览器内运行 game-core,
 * 历代人生存 localStorage,零后端依赖。
 *
 * 后端 HTTP 实现完整保留在本文件底部注释中;要切回联网模式,
 * 把下面的 re-export 换成注释里的 HTTP 实现即可(组件无需改动)。
 */

export {
  fetchMeta,
  rollTraits,
  startLife,
  advanceLife,
  fetchLives,
  fetchLifeDetail,
} from './local-engine';

export type {
  Meta,
  RolledTraitsData,
  StartLifeData,
  HeirInfo,
  AdvanceData,
  LifeRow,
  LifeYear,
  LifeDetail,
} from './local-engine';

/* ================================================================================
 * 后端 HTTP 实现(保留,供联网模式切回)
 * 需要后端 apps/api 运行(本地 :3001 或线上 VITE_API_BASE)。
 * 把上面的 re-export 替换为下面这份实现即可,组件侧 API 完全一致。
 * ================================================================================

import type {
  Allocation,
  Attributes,
  AttrKey,
  Rarity,
  StageId,
  Trait,
  YearResult,
} from '@game/game-core';

const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? '';

interface Envelope<T> { code: number; message: string; data: T }

export class ApiError extends Error {
  readonly code: number;
  constructor(code: number, message: string) { super(message); this.name = 'ApiError'; this.code = code; }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  } catch {
    throw new ApiError(-1, '无法连接到后端服务。');
  }
  const body = (await res.json()) as Envelope<T>;
  if (!res.ok || body.code !== 0) throw new ApiError(body.code ?? res.status, body.message || `请求失败(HTTP ${res.status})。`);
  return body.data;
}

export interface Meta { attrLabels: Record<AttrKey, string>; rarityLabels: Record<Rarity, string>; rarityColors: Record<Rarity, string>; initialPoints: number; rerollMax: number }
export const fetchMeta = () => request<Meta>('/api/meta');
export interface RolledTraitsData { traits: Trait[]; rerollLeft: number }
export const rollTraits = () => request<RolledTraitsData>('/api/traits/roll');
export interface StartLifeData { lifeId: string; age: number; attrs: Attributes; traits: string[]; pendingPoints: number }
export const startLife = (input: { traitIds: string[]; name?: string; initialAlloc?: Allocation }) =>
  request<StartLifeData>('/api/life/start', { method: 'POST', body: JSON.stringify(input) });
export interface HeirInfo { name: string; bornAtAge: number; bonusAttrs: Partial<Attributes>; inheritedFlag?: string }
export type AdvanceData = YearResult & { lifeId: string; pendingPoints: number; skills: string[]; spouse?: string; pet?: string; heirs: HeirInfo[]; enemyCount: number; allyCount: number };
export const advanceLife = (lifeId: string, alloc?: Allocation) =>
  request<AdvanceData>('/api/life/advance', { method: 'POST', body: JSON.stringify({ lifeId, alloc }) });
export interface LifeRow { id: string; name: string; final_age: number; ending_id: string; ending_title: string; evaluation: string; cause: string; traits: string; attrs: string; created_at: string }
export const fetchLives = () => request<LifeRow[]>('/api/lives');
export interface LifeYear { id: number; life_id: string; age: number; stage: StageId | string; event_text: string; attr_snapshot: Attributes }
export interface LifeDetail extends Omit<LifeRow, 'traits' | 'attrs'> { traits: string[]; attrs: Attributes; years: LifeYear[] }
export const fetchLifeDetail = (id: string) => request<LifeDetail>(`/api/lives/${encodeURIComponent(id)}`);
================================================================================ */
