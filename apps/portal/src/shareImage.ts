import { evalMedals, renownTitle, type Profile } from './achievements';

/**
 * 档案分享图:把侠影档案 + 勋章墙用 canvas 绘制成一张武侠风卡片,导出 PNG 下载。
 * 不依赖 html2canvas 等库,直接手绘,体积小、风格统一。
 */

const W = 1080;
const PADDING = 60;

export async function renderProfileImage(profile: Profile): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  const medals = evalMedals(profile);
  const unlocked = medals.filter((m) => m.isUnlocked);

  // 计算高度:头 + 三档案 + 勋章墙
  const medalCols = 6;
  const medalRows = Math.ceil(medals.length / medalCols);
  const H = PADDING * 2 + 150 + 220 + 60 + medalRows * 130 + 40;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 背景(深色武侠渐变)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#14100a');
  bg.addColorStop(0.5, '#0d0f12');
  bg.addColorStop(1, '#120d0d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 顶部金线
  ctx.strokeStyle = 'rgba(232,217,168,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  let y = PADDING + 30;

  // 标题
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8d9a8';
  ctx.font = '700 64px STSong, "Songti SC", serif';
  ctx.fillText('侠影档案', W / 2, y);
  y += 40;

  // 称号 + 声望
  ctx.font = '400 32px STSong, serif';
  ctx.fillStyle = '#c9b98a';
  ctx.fillText(`${renownTitle(profile.renown)} · 江湖声望 ${profile.renown}`, W / 2, y);
  y += 60;

  // 三栏档案
  const cards: { title: string; lines: [string, string][] }[] = [
    {
      title: '🗡 人生重开',
      lines: profile.life.played
        ? [
            ['历经', `${profile.life.lives} 世`],
            ['最高成就', profile.life.bestTitle ?? '—'],
            ['最长寿', `${profile.life.bestAge ?? 0} 岁`],
          ]
        : [['', '尚未投胎']],
    },
    {
      title: '⚔ 武林群侠传',
      lines: profile.mud.played
        ? [
            ['修为', `Lv.${profile.mud.level}`],
            ['武功', `${profile.mud.skills} 门`],
            ['境况', profile.mud.alive ? '闯荡中' : '已陨落'],
          ]
        : [['', '尚未入谷']],
    },
    {
      title: '🃏 黑风塔',
      lines: profile.card.played
        ? [
            ['登顶', profile.card.cleared ? '已通关' : `第 ${profile.card.floor} 层`],
            ['牌组', `${profile.card.deckSize} 张`],
            ['遗物', `${profile.card.relics} 件`],
          ]
        : [['', '尚未登塔']],
    },
  ];

  const colW = (W - PADDING * 2 - 40) / 3;
  ctx.textAlign = 'left';
  cards.forEach((card, i) => {
    const x = PADDING + i * (colW + 20);
    // 卡片底
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    roundRect(ctx, x, y, colW, 200, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232,217,168,0.2)';
    ctx.stroke();
    // 标题
    ctx.fillStyle = '#c9b98a';
    ctx.font = '600 26px STSong, serif';
    ctx.fillText(card.title, x + 24, y + 44);
    // 行
    ctx.font = '400 24px "PingFang SC", sans-serif';
    card.lines.forEach(([k, v], j) => {
      const ly = y + 90 + j * 40;
      ctx.fillStyle = '#9aa0a6';
      ctx.fillText(k, x + 24, ly);
      ctx.fillStyle = '#e6e1d5';
      ctx.textAlign = 'right';
      ctx.fillText(v, x + colW - 24, ly);
      ctx.textAlign = 'left';
    });
  });
  y += 240;

  // 勋章标题
  ctx.fillStyle = '#c9b98a';
  ctx.font = '600 28px STSong, serif';
  ctx.fillText(`成就勋章 ${unlocked.length} / ${medals.length}`, PADDING, y);
  y += 30;

  // 勋章网格(emoji 用文字近似,因 canvas emoji 渲染不一)
  const cellW = (W - PADDING * 2) / medalCols;
  medals.forEach((m, i) => {
    const col = i % medalCols;
    const row = Math.floor(i / medalCols);
    const x = PADDING + col * cellW;
    const my = y + row * 130;
    ctx.fillStyle = m.isUnlocked ? 'rgba(232,217,168,0.08)' : 'rgba(255,255,255,0.02)';
    roundRect(ctx, x + 6, my, cellW - 12, 116, 10);
    ctx.fill();
    ctx.strokeStyle = m.isUnlocked ? tierColor(m.tier) : 'rgba(255,255,255,0.08)';
    ctx.stroke();
    // emoji
    ctx.font = '40px serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = m.isUnlocked ? 1 : 0.35;
    ctx.fillText(m.emoji, x + cellW / 2, my + 52);
    // 名
    ctx.font = '400 20px "PingFang SC", sans-serif';
    ctx.fillStyle = m.isUnlocked ? '#e6e1d5' : '#9aa0a6';
    ctx.fillText(m.name, x + cellW / 2, my + 92);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  });

  // 底部水印
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(154,160,166,0.5)';
  ctx.font = '400 20px "PingFang SC", sans-serif';
  ctx.fillText('江湖集 · 一世一命 一剑一江湖', W / 2, H - 30);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function tierColor(tier: string): string {
  if (tier === 'gold') return 'rgba(232,217,168,0.6)';
  if (tier === 'silver') return 'rgba(192,192,192,0.5)';
  return 'rgba(205,127,50,0.5)';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
