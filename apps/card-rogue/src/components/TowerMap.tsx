import type { MapNode, RunPhase } from '@game/card-core';

interface Props {
  nodes: MapNode[];
  nodeIndex: number;
  options: MapNode[];
  phase: RunPhase;
  onChoose: (nodeIndex: number) => void;
}

const KIND_ICON: Record<MapNode['kind'], string> = {
  battle: '⚔️',
  elite: '☠️',
  rest: '🔥',
  boss: '👑',
  shop: '💰',
  event: '❓',
};

const KIND_LABEL: Record<MapNode['kind'], string> = {
  battle: '战斗',
  elite: '精英',
  rest: '篝火',
  boss: '幕主',
  shop: '货郎',
  event: '奇遇',
};

/** 分叉爬塔地图:按层(tier)自下而上排列,当前可选节点高亮可点。 */
export default function TowerMap({ nodes, nodeIndex, options, phase, onChoose }: Props) {
  // 按层分组(tier 升序),展示时高层在上
  const tiers = new Map<number, MapNode[]>();
  for (const n of nodes) {
    const arr = tiers.get(n.tier) ?? [];
    arr.push(n);
    tiers.set(n.tier, arr);
  }
  const sortedTiers = [...tiers.keys()].sort((a, b) => b - a); // 高层在上
  const optionIdx = new Set(options.map((o) => o.index));
  const canChoose = phase === 'map';
  const curTier = nodeIndex >= 0 ? (nodes[nodeIndex]?.tier ?? -1) : -1;

  return (
    <div className="tower-map card">
      <div className="tower-tiers">
        {sortedTiers.map((tier) => (
          <div className="tower-tier" key={tier}>
            {tiers.get(tier)!.map((n) => {
              const isCurrent = n.index === nodeIndex;
              const isOption = canChoose && optionIdx.has(n.index);
              const isPassed = n.tier < curTier;
              const cls = [
                'tower-node',
                `kind-${n.kind}`,
                isCurrent ? 'current' : '',
                isOption ? 'option' : '',
                isPassed ? 'passed' : '',
              ].join(' ');
              return (
                <button
                  key={n.index}
                  type="button"
                  className={cls}
                  disabled={!isOption}
                  title={KIND_LABEL[n.kind]}
                  onClick={() => onChoose(n.index)}
                >
                  <span className="tower-icon">{KIND_ICON[n.kind]}</span>
                  <span className="tower-label">{n.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {canChoose && options.length > 0 && <div className="tower-hint">点一个发亮的节点上塔 ↑</div>}
    </div>
  );
}
