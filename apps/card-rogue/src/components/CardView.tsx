import { effectiveCard, type Card } from '@game/card-core';

interface Props {
  cardId: string;
  upgraded?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const KIND_LABEL: Record<Card['kind'], string> = {
  attack: '攻击',
  skill: '技能',
  power: '能力',
};

/** 单张卡牌视图:牌名、能量费、类型、效果描述。 */
export default function CardView({ cardId, upgraded, disabled, onClick }: Props) {
  const card = effectiveCard(cardId, upgraded ? new Set([cardId]) : new Set());
  return (
    <button
      className={`game-card card-kind-${card.kind} card-rarity-${card.rarity} ${upgraded ? 'card-upgraded' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="gc-head">
        <span className="gc-name">{card.name}</span>
        <span className="gc-cost">{card.cost}</span>
      </div>
      <div className="gc-kind">{KIND_LABEL[card.kind]}</div>
      <div className="gc-desc">{card.desc}</div>
    </button>
  );
}
