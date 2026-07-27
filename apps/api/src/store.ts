import { randomUUID } from 'node:crypto';
import {
  advanceYear,
  getTrait,
  rollTraits,
  startLife,
  REROLL_MAX,
  INITIAL_POINTS,
  type Allocation,
  type LifeState,
  type YearResult,
} from '@game/game-core';
import { db, initDb, type LifeRow, type LifeYearRow } from './db.js';

initDb();

/** 对局会话(含进行中的权威状态)。completed=0 表示进行中 */
interface SessionRow {
  id: string;
  name: string;
  state: string; // JSON LifeState(flags 序列化为数组)
  completed: number;
  created_at: string;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '无名侠客',
    state TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
// 兼容旧库:若 sessions 表缺 name 列则补上
try {
  db.exec(`ALTER TABLE sessions ADD COLUMN name TEXT NOT NULL DEFAULT '无名侠客'`);
} catch {
  /* 列已存在则忽略 */
}

const insertSession = db.prepare('INSERT INTO sessions (id, name, state, completed) VALUES (?, ?, ?, 0)');
const getSessionStmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
const updateSessionStmt = db.prepare('UPDATE sessions SET state = ?, completed = ? WHERE id = ?');
const insertLifeStmt = db.prepare(`
  INSERT INTO lives (id, name, final_age, ending_id, ending_title, evaluation, cause, traits, attrs)
  VALUES (@id, @name, @final_age, @ending_id, @ending_title, @evaluation, @cause, @traits, @attrs)
`);
const insertYearStmt = db.prepare(`
  INSERT INTO life_years (life_id, age, stage, event_text, attr_snapshot)
  VALUES (?, ?, ?, ?, ?)
`);
const listLivesStmt = db.prepare('SELECT * FROM lives ORDER BY created_at DESC, rowid DESC LIMIT 100');
const getLifeStmt = db.prepare('SELECT * FROM lives WHERE id = ?');
const getYearsStmt = db.prepare('SELECT * FROM life_years WHERE life_id = ? ORDER BY age ASC, id ASC');

// —— 序列化:LifeState 的 flags 是 Set,需转数组 ——
interface SerializedState extends Omit<LifeState, 'flags' | 'ending'> {
  flags: string[];
  ending?: LifeState['ending'];
}

function serializeState(s: LifeState): string {
  const { flags, ...rest } = s;
  const out: SerializedState = { ...rest, flags: [...flags] };
  return JSON.stringify(out);
}

function deserializeState(json: string): LifeState {
  const parsed = JSON.parse(json) as SerializedState;
  return { ...parsed, flags: new Set(parsed.flags) };
}

function loadSession(id: string): { state: LifeState; name: string; completed: boolean } | null {
  const row = getSessionStmt.get(id) as SessionRow | undefined;
  if (!row) return null;
  return { state: deserializeState(row.state), name: row.name, completed: row.completed === 1 };
}

function saveSession(id: string, state: LifeState, completed: boolean): void {
  updateSessionStmt.run(serializeState(state), completed ? 1 : 0, id);
}

export const store = {
  roll(): { traits: ReturnType<typeof rollTraits>['traits']; rerollLeft: number } {
    const { traits, rerollLeft } = rollTraits(3);
    return { traits, rerollLeft };
  },

  start(traitIds: string[], name: string, initialAlloc: Allocation): { lifeId: string; state: LifeState } {
    try {
      if (!Array.isArray(traitIds) || traitIds.length === 0) throw new Error('traitIds 不能为空');
      for (const id of traitIds) getTrait(id); // 校验存在
      const state = startLife(traitIds, initialAlloc);
      const lifeId = randomUUID();
      insertSession.run(lifeId, name || '无名侠客', serializeState(state));
      return { lifeId, state };
    } catch (err) {
      // 词条/加点等参数校验失败属客户端错误,返回 400 而非 500
      throw Object.assign(err instanceof Error ? err : new Error(String(err)), { statusCode: 400 });
    }
  },

  advance(lifeId: string, alloc: Allocation): YearResult & { lifeId: string } {
    const sess = loadSession(lifeId);
    if (!sess) throw Object.assign(new Error('对局不存在'), { statusCode: 404 });
    if (sess.completed || sess.state.finished) {
      throw Object.assign(new Error('此生已落幕'), { statusCode: 400 });
    }
    let result: YearResult;
    try {
      result = advanceYear(sess.state, alloc);
    } catch (err) {
      // 加点校验失败属客户端错误
      throw Object.assign(err instanceof Error ? err : new Error(String(err)), { statusCode: 400 });
    }

    // 持久化当年
    insertYearStmt.run(lifeId, result.age, result.stage, result.text, JSON.stringify(result.attrs));

    const finished = result.finished;
    if (finished && result.ending) {
      // 终局:写入 lives 汇总
      const e = result.ending;
      insertLifeStmt.run({
        id: lifeId,
        name: sess.name || '无名侠客',
        final_age: e.finalAge,
        ending_id: e.id,
        ending_title: e.title,
        evaluation: e.evaluation,
        cause: e.cause,
        traits: JSON.stringify(sess.state.traits),
        attrs: JSON.stringify(result.attrs),
      });
    }
    saveSession(lifeId, sess.state, finished);
    return { ...result, lifeId };
  },

  listLives(): LifeRow[] {
    return listLivesStmt.all() as LifeRow[];
  },

  getLife(id: string): { life: LifeRow; years: LifeYearRow[] } | null {
    const life = getLifeStmt.get(id) as LifeRow | undefined;
    if (!life) return null;
    const years = getYearsStmt.all(id) as LifeYearRow[];
    return { life, years };
  },
};

export { INITIAL_POINTS, REROLL_MAX };
