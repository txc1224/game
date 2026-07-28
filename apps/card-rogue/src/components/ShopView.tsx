import { useState } from 'react';
import type { RunState } from '@game/card-core';
import { getCard, RELICS } from '@game/card-core';

interface ShopViewProps {
  run: RunState;
  onBuy: (index: number) => void;
  onRemove: (cardId: string) => void;
  onLeave: () => void;
}

/** 商店:买牌/买遗物/删牌/回血。 */
export default function ShopView({ run, onBuy, onRemove, onLeave }: ShopViewProps) {
  const [removing, setRemoving] = useState(false);
  const stock = run.shopStock ?? [];

  return (
    <div className="shop-view card">
      <h2 className="section-title serif">游方货郎</h2>
      <p className="rest-text">
        「客官,瞧瞧?童叟无欺。」 <span className="gold-text">你有 {run.gold} 两银子。</span>
      </p>

      <div className="shop-grid">
        {stock.map((item, i) => {
          const afford = run.gold >= item.price;
          return (
            <div key={i} className={`shop-item ${item.sold ? 'sold' : ''}`}>
              <div className="shop-item-body">
                {item.kind === 'card' && item.cardId ? (
                  <>
                    <div className="shop-item-name">{getCard(item.cardId).name}</div>
                    <div className="shop-item-desc">{getCard(item.cardId).desc}</div>
                  </>
                ) : item.kind === 'relic' && item.relicId ? (
                  <>
                    <div className="shop-item-name">{RELICS[item.relicId]?.name}</div>
                    <div className="shop-item-desc">{RELICS[item.relicId]?.desc}</div>
                  </>
                ) : (
                  <div className="shop-item-name">{item.label}</div>
                )}
              </div>
              {item.kind === 'remove' ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={item.sold || !afford}
                  onClick={() => setRemoving((v) => !v)}
                >
                  {item.sold ? '已售' : `${item.price} 两`}
                </button>
              ) : (
                <button type="button" className="btn btn-sm" disabled={item.sold || !afford} onClick={() => onBuy(i)}>
                  {item.sold ? '已售' : `${item.price} 两`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {removing && (
        <div className="shop-remove">
          <div className="group-label">选择要剔除的牌:</div>
          <div className="btn-flow">
            {run.deck.map((id, idx) => (
              <button
                key={`${id}-${idx}`}
                type="button"
                className="btn btn-sm btn-item"
                onClick={() => {
                  onRemove(id);
                  setRemoving(false);
                }}
              >
                {getCard(id).name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="center" style={{ marginTop: 16 }}>
        <button type="button" className="btn" onClick={onLeave}>
          离开货郎
        </button>
      </div>
    </div>
  );
}
