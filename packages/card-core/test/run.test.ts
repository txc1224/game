import { describe, it, expect } from 'vitest';
import {
  newRun,
  enterNode,
  nextOptions,
  buyShopItem,
  removeCard,
  resolveEvent,
  upgradeRandomCard,
  effectiveCard,
  leaveShopOrEvent,
  seededRng,
} from '../src/index.js';

describe('爬塔进程:分叉/商店/事件/删牌/升级', () => {
  it('塔是分叉的,每层有 nextOptions 可选', () => {
    const r = newRun(seededRng(1));
    const opts = nextOptions(r);
    expect(opts.length).toBeGreaterThanOrEqual(1);
    // 进入第一层后,应有下一层选项
    enterNode(r, opts[0]!.index, seededRng(1));
    if (r.phase === 'combat') r.phase = 'map';
    else if (r.phase !== 'map') leaveShopOrEvent(r);
    expect(nextOptions(r).length).toBeGreaterThanOrEqual(1);
  });

  it('商店卖货且能购买', () => {
    const r = newRun(seededRng(2));
    // 推进到商店
    let shop;
    for (let t = 0; t < 10 && !shop; t++) {
      const opts = nextOptions(r);
      shop = opts.find((n) => n.kind === 'shop');
      const pick = shop ?? opts[0]!;
      enterNode(r, pick.index, seededRng(t));
      if (pick.kind !== 'shop') { if (r.phase === 'combat') r.phase = 'map'; else leaveShopOrEvent(r); }
    }
    expect(shop).toBeTruthy();
    expect(r.phase).toBe('shop');
    expect(r.shopStock!.length).toBeGreaterThan(0);
    // 买一张牌(找第一个 card 且买得起的)
    const cardIdx = r.shopStock!.findIndex((it) => it.kind === 'card' && it.price <= r.gold);
    if (cardIdx >= 0) {
      const deckBefore = r.deck.length;
      expect(buyShopItem(r, cardIdx)).toBe(true);
      expect(r.deck.length).toBe(deckBefore + 1);
    }
  });

  it('删牌服务可剔除起始白板', () => {
    const r = newRun(seededRng(3));
    const before = r.deck.length;
    expect(r.deck).toContain('strike');
    expect(removeCard(r, 'strike')).toBe(true);
    expect(r.deck.length).toBe(before - 1);
    expect(removeCard(r, 'not-exist')).toBe(false);
  });

  it('事件选项能结算并回 map', () => {
    const r = newRun(seededRng(4));
    let ev;
    for (let t = 0; t < 10 && !ev; t++) {
      const opts = nextOptions(r);
      ev = opts.find((n) => n.kind === 'event');
      const pick = ev ?? opts[0]!;
      enterNode(r, pick.index, seededRng(t));
      if (pick.kind !== 'event') { if (r.phase === 'combat') r.phase = 'map'; else leaveShopOrEvent(r); }
    }
    expect(ev).toBeTruthy();
    expect(r.phase).toBe('event');
    expect(r.activeEvent).toBeTruthy();
    const res = resolveEvent(r, 0, seededRng(4));
    expect(res.text.length).toBeGreaterThan(0);
    expect(r.phase).toBe('map');
  });

  it('升级牌:数值提升且标记', () => {
    const r = newRun(seededRng(5));
    const up = upgradeRandomCard(r, seededRng(5));
    expect(up).toBeTruthy();
    expect(r.upgraded.has(up!)).toBe(true);
    const base = effectiveCard(up!, new Set());
    const upgraded = effectiveCard(up!, r.upgraded);
    expect(upgraded.name).toContain('+');
    if (base.damage) expect(upgraded.damage).toBeGreaterThan(base.damage);
  });

  it('金币在商店消费', () => {
    const r = newRun(seededRng(6));
    r.gold = 100;
    r.phase = 'shop';
    r.shopStock = [{ kind: 'card', cardId: 'qingfeng', price: 22, label: '青锋快剑', sold: false }];
    const ok = buyShopItem(r, 0);
    expect(ok).toBe(true);
    expect(r.gold).toBe(78);
    expect(r.deck).toContain('qingfeng');
  });
});
