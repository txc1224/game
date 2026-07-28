interface FloatItem {
  id: number;
  value: string;
  kind: 'enemy-dmg' | 'player-dmg' | 'block' | 'heal';
}

interface DamageFloatProps {
  floats: FloatItem[];
  onDone: (id: number) => void;
}

/** 伤害/治疗飘字:数字从目标身上飘出并消散。 */
export default function DamageFloat({ floats, onDone }: DamageFloatProps) {
  return (
    <div className="damage-float-layer">
      {floats.map((f) => (
        <span
          key={f.id}
          className={`damage-float float-${f.kind}`}
          onAnimationEnd={() => onDone(f.id)}
        >
          {f.value}
        </span>
      ))}
    </div>
  );
}
