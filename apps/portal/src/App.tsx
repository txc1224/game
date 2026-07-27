interface GameCard {
  id: string;
  title: string;
  subtitle: string;
  desc: string;
  tags: string[];
  /** 相对合集页的路径(部署到 Pages 时) */
  path: string;
  emoji: string;
}

const GAMES: GameCard[] = [
  {
    id: 'life-restart',
    title: '人生重开模拟器',
    subtitle: '仗剑江湖',
    desc: '开局刷词条定天赋,一年一年推进武侠人生。幼年拜师、闯荡江湖、恩怨情仇、开宗立派,寿终或横死后落个身后名。武功、奇遇、子嗣传承,每一世都独一无二。',
    tags: ['文字模拟', '词条', '人生'],
    path: './life-restart/',
    emoji: '🗡️',
  },
  {
    id: 'wulin-mud',
    title: '武林群侠传',
    subtitle: '文字江湖 MUD',
    desc: '复古文字 MUD。探索地图、回合制战斗、打怪升级、拾取装备、拜师学艺。若你玩过《人生重开》,前世结局会化作今生的彩蛋加持。',
    tags: ['MUD', '探索', '回合战斗'],
    path: './wulin-mud/',
    emoji: '⚔️',
  },
];

export default function App() {
  return (
    <div className="portal">
      <header className="portal-header">
        <h1 className="serif">江湖集</h1>
        <p className="portal-sub">一世一命,一剑一江湖 · 小游戏合集</p>
      </header>

      <main className="portal-grid">
        {GAMES.map((g) => (
          <a key={g.id} className="game-card" href={g.path}>
            <div className="game-emoji">{g.emoji}</div>
            <div className="game-body">
              <div className="game-title serif">{g.title}</div>
              <div className="game-subtitle">{g.subtitle}</div>
              <p className="game-desc">{g.desc}</p>
              <div className="game-tags">
                {g.tags.map((t) => (
                  <span key={t} className="game-tag">{t}</span>
                ))}
              </div>
            </div>
            <div className="game-cta serif">进入江湖 →</div>
          </a>
        ))}
      </main>

      <footer className="portal-footer">
        <span>本地畅玩 · 数据存于你的浏览器</span>
      </footer>
    </div>
  );
}
