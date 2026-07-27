/**
 * 后端 REST 封装。
 * 统一响应格式 { code, message, data },code !== 0 视为业务错误并抛出。
 * 前端一律使用相对路径 /api,由 Vite dev server 代理到后端(见 vite.config.ts)。
 */
import type {
  Allocation,
  Attributes,
  AttrKey,
  Rarity,
  StageId,
  Trait,
  YearResult,
} from '@game/game-core';

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

/** 业务错误,message 来自后端 */
export class ApiError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError(-1, '无法连接到后端服务,请确认 API 已启动(端口 3001)。');
  }

  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(res.status, `服务返回了无法解析的响应(HTTP ${res.status})。`);
  }

  if (!res.ok || body.code !== 0) {
    throw new ApiError(body.code ?? res.status, body.message || `请求失败(HTTP ${res.status})。`);
  }
  return body.data;
}

/** GET /api/meta */
export interface Meta {
  attrLabels: Record<AttrKey, string>;
  rarityLabels: Record<Rarity, string>;
  rarityColors: Record<Rarity, string>;
  initialPoints: number;
  rerollMax: number;
}

export function fetchMeta(): Promise<Meta> {
  return request<Meta>('/api/meta');
}

/** GET /api/traits/roll */
export interface RolledTraitsData {
  traits: Trait[];
  rerollLeft: number;
}

export function rollTraits(): Promise<RolledTraitsData> {
  return request<RolledTraitsData>('/api/traits/roll');
}

/** POST /api/life/start */
export interface StartLifeData {
  lifeId: string;
  age: number;
  attrs: Attributes;
  traits: string[];
  pendingPoints: number;
}

export function startLife(input: {
  traitIds: string[];
  name?: string;
  initialAlloc?: Allocation;
}): Promise<StartLifeData> {
  return request<StartLifeData>('/api/life/start', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** POST /api/life/advance —— 返回 YearResult 外加 lifeId 与回充后的可分配点数 */
export type AdvanceData = YearResult & { lifeId: string; pendingPoints: number };

export function advanceLife(lifeId: string, alloc?: Allocation): Promise<AdvanceData> {
  return request<AdvanceData>('/api/life/advance', {
    method: 'POST',
    body: JSON.stringify({ lifeId, alloc }),
  });
}

/** GET /api/lives 列表行(注意:历史库的字段为 snake_case) */
export interface LifeRow {
  id: string;
  name: string;
  final_age: number;
  ending_id: string;
  ending_title: string;
  evaluation: string;
  cause: string;
  traits: string;
  attrs: string;
  created_at: string;
}

export function fetchLives(): Promise<LifeRow[]> {
  return request<LifeRow[]>('/api/lives');
}

/** GET /api/lives/:id 明细(逐年) */
export interface LifeYear {
  id: number;
  life_id: string;
  age: number;
  stage: StageId | string;
  event_text: string;
  attr_snapshot: Attributes;
}

export interface LifeDetail extends Omit<LifeRow, 'traits' | 'attrs'> {
  traits: string[];
  attrs: Attributes;
  years: LifeYear[];
}

export function fetchLifeDetail(id: string): Promise<LifeDetail> {
  return request<LifeDetail>(`/api/lives/${encodeURIComponent(id)}`);
}
