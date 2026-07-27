import Fastify from 'fastify';
import cors from '@fastify/cors';
import { store } from './store.js';
import { ATTR_LABELS, RARITY_COLORS, RARITY_LABELS, INITIAL_POINTS, REROLL_MAX } from '@game/game-core';
import type { Allocation } from '@game/game-core';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';
// 允许的前端来源,逗号分隔;不设置则放开(本地开发友好)
const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export async function buildServer() {
  const app = Fastify({ logger: { level: 'info' } });

  await app.register(cors, { origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : true });

  // 统一错误处理
  app.setErrorHandler((err, _req, reply) => {
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    reply.code(status).send({ code: status, message: err.message, data: null });
  });

  app.get('/api/health', async () => ({ code: 0, message: 'ok', data: { status: 'up' } }));

  /** 元信息:属性名 / 稀有度配色 / 常量(前端展示用) */
  app.get('/api/meta', async () => ({
    code: 0,
    message: 'ok',
    data: { attrLabels: ATTR_LABELS, rarityLabels: RARITY_LABELS, rarityColors: RARITY_COLORS, initialPoints: INITIAL_POINTS, rerollMax: REROLL_MAX },
  }));

  /** 抽一手词条 */
  app.get('/api/traits/roll', async () => {
    const { traits, rerollLeft } = store.roll();
    return { code: 0, message: 'ok', data: { traits, rerollLeft } };
  });

  /** 开局 */
  app.post('/api/life/start', async (req, reply) => {
    const body = (req.body ?? {}) as { traitIds?: string[]; name?: string; initialAlloc?: Allocation };
    if (!Array.isArray(body.traitIds) || body.traitIds.length === 0) {
      return reply.code(400).send({ code: 400, message: 'traitIds 必填', data: null });
    }
    const { lifeId, state } = store.start(body.traitIds, body.name ?? '无名侠客', body.initialAlloc ?? {});
    return {
      code: 0,
      message: 'ok',
      data: { lifeId, age: state.age, attrs: state.attrs, traits: state.traits, pendingPoints: state.pendingPoints },
    };
  });

  /** 推进一年 */
  app.post('/api/life/advance', async (req, reply) => {
    const body = (req.body ?? {}) as { lifeId?: string; alloc?: Allocation };
    if (!body.lifeId) return reply.code(400).send({ code: 400, message: 'lifeId 必填', data: null });
    const r = store.advance(body.lifeId, body.alloc ?? {});
    return { code: 0, message: 'ok', data: r };
  });

  /** 历代人生列表 */
  app.get('/api/lives', async () => ({ code: 0, message: 'ok', data: store.listLives() }));

  /** 单局明细(逐年) */
  app.get('/api/lives/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const got = store.getLife(id);
    if (!got) return reply.code(404).send({ code: 404, message: '未找到该人生', data: null });
    const { life, years } = got;
    return {
      code: 0,
      message: 'ok',
      data: {
        ...life,
        traits: JSON.parse(life.traits) as string[],
        attrs: JSON.parse(life.attrs) as Record<string, number>,
        years: years.map((y) => ({ ...y, attr_snapshot: JSON.parse(y.attr_snapshot) as Record<string, number> })),
      },
    };
  });

  return app;
}

// 直接运行(非被测试 import)时启动
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  buildServer()
    .then((app) => app.listen({ port: PORT, host: HOST }))
    .then(() => console.log(`[api] listening on http://${HOST}:${PORT}`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
