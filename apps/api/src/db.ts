import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = process.env.DB_PATH ?? join(DATA_DIR, 'life.db');

mkdirSync(DATA_DIR, { recursive: true });

export const db: Database.Database = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

/** 建表(幂等) */
export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lives (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '无名侠客',
      final_age INTEGER NOT NULL,
      ending_id TEXT NOT NULL,
      ending_title TEXT NOT NULL,
      evaluation TEXT NOT NULL,
      cause TEXT NOT NULL,
      traits TEXT NOT NULL,          -- JSON: 词条 id 数组
      attrs TEXT NOT NULL,           -- JSON: 最终属性快照
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS life_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      life_id TEXT NOT NULL,
      age INTEGER NOT NULL,
      stage TEXT NOT NULL,
      event_text TEXT NOT NULL,
      attr_snapshot TEXT NOT NULL   -- JSON: 当年属性
      -- 注:不加外键。lives 汇总行仅在结局时写入,进行中的对局逐年落库时父行尚不存在。
    );

    CREATE INDEX IF NOT EXISTS idx_life_years_life_id ON life_years(life_id);
  `);
}

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

export interface LifeYearRow {
  id: number;
  life_id: string;
  age: number;
  stage: string;
  event_text: string;
  attr_snapshot: string;
}
