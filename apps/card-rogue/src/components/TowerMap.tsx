import type { MapNode } from '@game/card-core';

interface Props {
  nodes: MapNode[];
  nodeIndex: number;
  phase: string;
  onAdvance: () => void;
}

const KIND_ICON: Record<MapNode['kind'], string> = {
  battle: '⚔️',
  elite: '☠️',
  rest: '🔥',
  boss: '👑',
};

/** 爬塔地图条:横向排列节点,当前位置高亮,点击「前进」进入下一节点。 */
export default function TowerMap({ nodes, nodeIndex, phase, onAdvance }: Props) {
  return (
    <div className="tower-map card">
      <div className="tower-track">
        {nodes.map((node, i) => {
          const done = i <= nodeIndex;
          const current = i === nodeIndex + 1;
          const cls = [
            'tower-node',
            `tower-${node.kind}`,
            done ? 'done' : '',
            current ? 'current' : '',
          ]
            .join(' ');
          return (
            <div key={node.index} className="tower-node-wrap">
              <div className={cls} title={`第 ${node.index + 1} 层 · ${node.label}`}>
                <span className="tower-icon">{KIND_ICON[node.kind]}</span>
                <span className="tower-label">{node.label}</span>
              </div>
              {i < nodes.length - 1 && <div className={`tower-link ${done ? 'done' : ''}`} />}
            </div>
          );
        })}
      </div>
      {phase === 'map' && (
        <button className="btn btn-primary tower-advance" onClick={onAdvance}>
          前进 →
        </button>
      )}
    </div>
  );
}
