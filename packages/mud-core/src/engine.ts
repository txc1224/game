import {
  combatPower,
  seededRng,
  SKILLS,
  SKILL_MAP,
  SKILL_KIND_LABELS,
  canLearn,
  type Attributes,
  type Rng,
  type Skill,
} from '@game/game-core';
import { DIR_LABELS, OPPOSITE, getRoom, rollEncounter, ITEMS, MONSTERS, type Direction, type Monster, type Room } from './world.js';

/** 玩家状态 */
export interface Player {
  name: string;
  attrs: Attributes;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  gold: number;
  roomId: string;
  /** 背包 itemId -> 数量 */
  inventory: Record<string, number>;
  /** 已装备武器 id */
  weaponId?: string;
  /** 习得武功 id 集(复用 game-core 武功) */
  skills: string[];
  /** 彩蛋:来自《人生重开》的前世结局称号 */
  pastLifeTitle?: string;
}

export interface LogLine {
  text: string;
  kind: 'info' | 'combat' | 'good' | 'bad' | 'system';
}

export interface MudState {
  player: Player;
  /** 当前战斗(若有) */
  combat: { monster: Monster; monsterHp: number; isBoss?: boolean } | null;
  log: LogLine[];
  dead: boolean;
  /** 主线:是否已击败黑风寨主(通关) */
  bossDefeated?: boolean;
}

const BASE_ATTRS: Attributes = { strength: 10, agility: 10, constitution: 10, wisdom: 10, luck: 10, reputation: 0 };

function maxHpOf(p: { attrs: Attributes; level: number }): number {
  return 40 + p.attrs.constitution * 2 + p.level * 8;
}

export function createPlayer(name: string, opts?: { pastLifeTitle?: string; bonusAttrs?: Partial<Attributes> }): Player {
  const attrs: Attributes = { ...BASE_ATTRS };
  if (opts?.bonusAttrs) {
    for (const [k, v] of Object.entries(opts.bonusAttrs)) {
      attrs[k as keyof Attributes] = Math.max(0, (attrs[k as keyof Attributes] ?? 0) + (v ?? 0));
    }
  }
  const p: Player = {
    name: name || '无名侠客',
    attrs,
    level: 1,
    exp: 0,
    hp: 0,
    maxHp: 0,
    gold: 30,
    roomId: 'qingxi-cun',
    inventory: { 'qing-feng-jian': 1, 'jin-chuang-yao': 2 },
    weaponId: 'qing-feng-jian',
    skills: [],
    pastLifeTitle: opts?.pastLifeTitle,
  };
  p.maxHp = maxHpOf(p);
  p.hp = p.maxHp;
  return p;
}

export function newGame(name: string, opts?: { pastLifeTitle?: string; bonusAttrs?: Partial<Attributes> }): MudState {
  const player = createPlayer(name, opts);
  const room = getRoom(player.roomId);
  const log: LogLine[] = [
    { text: `你睁开双眼,发现自己身在${room.name}。${opts?.pastLifeTitle ? `前世「${opts.pastLifeTitle}」的记忆在脑海中若隐若现,这一世,你要走出一条不同的江湖路。` : '这一世,你要在江湖中闯出一番名堂。'}`, kind: 'system' },
    { text: room.desc, kind: 'info' },
    { text: exitsText(room), kind: 'system' },
  ];
  return { player, combat: null, log, dead: false };
}

function exitsText(room: Room): string {
  const dirs = (Object.keys(room.exits) as Direction[]).map((d) => `${DIR_LABELS[d]}(${d})`).join(' ');
  return `出口: ${dirs || '无'}`;
}

function push(state: MudState, text: string, kind: LogLine['kind'] = 'info'): void {
  state.log.push({ text, kind });
}

/** 武功提供的战力加成(按 attrBonus 折算,不再只按门数) */
function skillPower(p: Player): number {
  let power = 0;
  for (const id of p.skills) {
    const s = SKILL_MAP.get(id);
    if (!s) continue;
    for (const [k, v] of Object.entries(s.attrBonus)) {
      power += (v ?? 0) * (k === 'strength' ? 1.0 : k === 'agility' ? 0.9 : 0.7);
    }
  }
  return power;
}

/** 玩家当前最强武功(用于战斗招式与面板) */
export function signatureSkillOf(p: Player): Skill | null {
  let best: Skill | null = null;
  for (const id of p.skills) {
    const s = SKILL_MAP.get(id);
    if (!s) continue;
    if (!best) { best = s; continue; }
    const score = (x: Skill) => Object.values(x.attrBonus).reduce((a, b) => a + (b ?? 0), 0);
    if (score(s) > score(best)) best = s;
  }
  return best;
}

/** 玩家战力(基础属性 + 武器 + 武功加成) */
function playerPower(p: Player): number {
  let power = combatPower(p.attrs);
  if (p.weaponId) {
    const w = ITEMS[p.weaponId];
    if (w?.attrBonus) {
      const bonus = Object.entries(w.attrBonus).reduce((s, [k, v]) => s + (v ?? 0) * (k === 'strength' ? 1.2 : 0.8), 0);
      power += bonus;
    }
  }
  power += skillPower(p) + p.level * 3;
  return power;
}

/** 尝试习得一门武功:成功则加属性并入 skills,返回描述;已会/门槛不足返回 null */
export function learnSkill(p: Player, skillId: string): { text: string; skill: Skill } | null {
  if (p.skills.includes(skillId)) return null;
  const skill = SKILL_MAP.get(skillId);
  if (!skill) return null;
  if (!canLearn(p.attrs, skill)) return null;
  p.skills.push(skillId);
  for (const [k, v] of Object.entries(skill.attrBonus)) {
    const key = k as keyof Attributes;
    p.attrs[key] = Math.max(0, (p.attrs[key] ?? 0) + (v ?? 0));
  }
  // 根骨提升也带动气血上限
  const oldMax = p.maxHp;
  p.maxHp = maxHpOf(p);
  if (p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
  return { text: `习得【${skill.name}】(${SKILL_KIND_LABELS[skill.kind]})——${skill.desc}`, skill };
}

function playerDefense(p: Player): number {
  return p.attrs.constitution * 0.5 + p.level * 0.5;
}

export type Command =
  | { type: 'go'; dir: Direction }
  | { type: 'look' }
  | { type: 'explore' }
  | { type: 'attack' }
  | { type: 'flee' }
  | { type: 'use'; itemId: string }
  | { type: 'equip'; itemId: string }
  | { type: 'talk'; npcId: string }
  | { type: 'rest' }
  | { type: 'status' }
  | { type: 'challenge' };

/**
 * 执行一条命令,返回新的日志(直接就地改 state.log,返回本步新增的行数供 UI 滚动)。
 */
export function exec(state: MudState, cmd: Command, seed?: number): MudState {
  const rng: Rng = seed !== undefined ? seededRng(seed) : { next: Math.random };
  const p = state.player;

  if (state.dead) {
    push(state, '你已经死了。点击「重新来过」开启新一世。', 'system');
    return state;
  }

  // 战斗中只允许 attack / flee / use;look / status 为只读,放行
  if (state.combat && !['attack', 'flee', 'use', 'look', 'status'].includes(cmd.type)) {
    push(state, `你正与${state.combat.monster.name}激战中,无法分身!`, 'bad');
    return state;
  }

  switch (cmd.type) {
    case 'look': {
      const room = getRoom(p.roomId);
      push(state, `【${room.name}】${room.desc}`, 'info');
      push(state, exitsText(room), 'system');
      if (room.npcs) push(state, `这里有: ${room.npcs.map((n) => n.name).join('、')}`, 'system');
      break;
    }
    case 'go': {
      const room = getRoom(p.roomId);
      const destId = room.exits[cmd.dir];
      if (!destId) { push(state, `${DIR_LABELS[cmd.dir]}边没有路。`, 'bad'); break; }
      p.roomId = destId;
      const dest = getRoom(destId);
      push(state, `你往${DIR_LABELS[cmd.dir]}走,来到【${dest.name}】。${dest.desc}`, 'info');
      push(state, exitsText(dest), 'system');
      maybeEncounter(state, rng);
      break;
    }
    case 'explore': {
      const room = getRoom(p.roomId);
      push(state, `你在${room.name}四处探寻……`, 'info');
      // 断魂崖:偶有顿悟绝世武功(不再遭遇怪物时才有空灵悟道)
      if (p.roomId === 'duan-hun-ya' && !state.combat) {
        const learnable = SKILLS.filter((s) => !p.skills.includes(s.id) && canLearn(p.attrs, s));
        if (learnable.length > 0 && rng.next() < 0.35) {
          const pick = learnable[Math.floor(rng.next() * learnable.length)]!;
          const r = learnSkill(p, pick.id);
          if (r) {
            push(state, `崖顶罡风猎猎,石碑剑痕森然。你静心体悟前贤剑意,竟有所悟——${r.text}`, 'good');
            break;
          }
        }
      }
      maybeEncounter(state, rng, true);
      break;
    }
    case 'attack': {
      if (!state.combat) { push(state, '这里没有敌人。试试「探索」。', 'system'); break; }
      combatRound(state, rng);
      break;
    }
    case 'flee': {
      if (!state.combat) { push(state, '你并不在战斗中。', 'system'); break; }
      const m = state.combat.monster;
      const fleeChance = 0.5 + p.attrs.agility * 0.02 - m.tier * 0.05;
      if (rng.next() < fleeChance) {
        push(state, `你且战且退,摆脱了${m.name}的纠缠。`, 'good');
        state.combat = null;
      } else {
        push(state, `你想逃跑,却被${m.name}缠住了!`, 'bad');
        monsterStrike(state, rng);
      }
      break;
    }
    case 'use': {
      const count = p.inventory[cmd.itemId] ?? 0;
      if (count <= 0) { push(state, '你没有这件物品。', 'bad'); break; }
      const item = ITEMS[cmd.itemId];
      if (!item) { push(state, '未知物品。', 'bad'); break; }
      if (item.kind === 'pill' && item.heal) {
        if (p.hp >= p.maxHp) {
          push(state, '你气血充盈,无须服药。', 'system');
          break;
        }
        const healed = Math.min(item.heal, p.maxHp - p.hp);
        if (count - 1 <= 0) delete p.inventory[cmd.itemId];
        else p.inventory[cmd.itemId] = count - 1;
        p.hp += healed;
        push(state, `你服下${item.name},恢复 ${healed} 点气血。(气血 ${p.hp}/${p.maxHp})`, 'good');
        if (state.combat) monsterStrike(state, rng); // 战斗中吃药挨一刀
      } else if (item.kind === 'weapon') {
        push(state, `这是武器,试试「装备 ${item.name}」。`, 'system');
      } else {
        push(state, `${item.name}没什么用处,可以卖钱。`, 'system');
      }
      break;
    }
    case 'equip': {
      const count = p.inventory[cmd.itemId] ?? 0;
      const item = ITEMS[cmd.itemId];
      if (count <= 0 || !item) { push(state, '你没有这件装备。', 'bad'); break; }
      if (item.kind !== 'weapon') { push(state, '这不是武器。', 'bad'); break; }
      p.weaponId = cmd.itemId;
      push(state, `你装备上${item.name}。${item.desc}`, 'good');
      break;
    }
    case 'talk': {
      const room = getRoom(p.roomId);
      const npc = room.npcs?.find((n) => n.id === cmd.npcId);
      if (!npc) { push(state, '这里没有这个人。', 'bad'); break; }
      talkToNpc(state, npc, rng);
      break;
    }
    case 'rest': {
      if (state.combat) { push(state, '战斗中无法休息!', 'bad'); break; }
      const room = getRoom(p.roomId);
      if (!room.safe) { push(state, '此地危险,不宜久留。回青溪村再休息吧。', 'bad'); break; }
      p.hp = p.maxHp;
      push(state, '你好好休息了一晚,气血尽复。', 'good');
      break;
    }
    case 'status': {
      push(state, statusText(p), 'system');
      break;
    }
    case 'challenge': {
      if (state.combat) { push(state, '你正在战斗中!', 'bad'); break; }
      if (p.roomId !== 'duan-hun-ya') {
        push(state, '黑风寨主在断魂崖顶闭关。去断魂崖再挑战吧。', 'system');
        break;
      }
      if (state.bossDefeated) {
        push(state, '你已击败过黑风寨主。江湖路远,还有更广阔的天地等你。', 'system');
        break;
      }
      // BOSS 战:寨主真身
      const boss = MONSTERS['hei-feng-zhai-zhu']!;
      state.combat = { monster: boss, monsterHp: boss.hp, isBoss: true };
      push(state, `你长啸一声,纵上断魂崖顶,向【${boss.name}】下了战书!`, 'combat');
      push(state, `${boss.name}缓缓起身,黑风刀出鞘,煞气冲天。「哪来的小子,敢来送死?」`, 'combat');
      push(state, '这是生死之战!「攻击」全力一搏,或「逃跑」保命。', 'system');
      break;
    }
  }
  return state;
}

function statusText(p: Player): string {
  const a = p.attrs;
  const skillNames = p.skills.map((id) => SKILL_MAP.get(id)?.name ?? id);
  return `【${p.name}】 Lv.${p.level} 阅历${p.exp} 气血${p.hp}/${p.maxHp} 银两${p.gold}` +
    `\n臂力${a.strength} 身法${a.agility} 根骨${a.constitution} 悟性${a.wisdom} 福缘${a.luck}` +
    `\n武器: ${p.weaponId ? ITEMS[p.weaponId]?.name : '无'}  武功: ${skillNames.length > 0 ? skillNames.join('、') : '无'}` +
    (p.pastLifeTitle ? `\n前世: ${p.pastLifeTitle}` : '');
}

function maybeEncounter(state: MudState, rng: Rng, force = false): void {
  const room = getRoom(state.player.roomId);
  const m = force ? (rollEncounter(room, { next: () => 0 }) ?? rollEncounter(room, rng)) : rollEncounter(room, rng);
  if (!m) {
    if (force) push(state, '四下平静,没有发现敌人。', 'system');
    return;
  }
  state.combat = { monster: m, monsterHp: m.hp };
  push(state, `⚔️ 遭遇【${m.name}】!${m.desc}(气血 ${m.hp})`, 'combat');
  push(state, '输入「攻击」迎战,或「逃跑」保命。', 'system');
}

function combatRound(state: MudState, rng: Rng): void {
  const p = state.player;
  const c = state.combat!;
  const m = c.monster;

  // 玩家出手(身法高者有几率先手/连击)
  const power = playerPower(p);
  let dmg = Math.max(1, Math.round(power * (0.6 + rng.next() * 0.5) - m.defense));
  const crit = rng.next() < p.attrs.luck * 0.008;
  if (crit) dmg = Math.round(dmg * 1.8);
  c.monsterHp -= dmg;
  const sig = signatureSkillOf(p);
  const moveText = sig ? `【${sig.name}】` : '寻常拳脚';
  push(state, `你使出${moveText},对${m.name}造成 ${dmg} 点伤害${crit ? '(会心一击!)' : ''}。`, 'combat');

  if (c.monsterHp <= 0) { winCombat(state, rng); return; }
  monsterStrike(state, rng);
}

function monsterStrike(state: MudState, rng: Rng): void {
  const p = state.player;
  const c = state.combat!;
  const m = c.monster;
  let dmg = Math.max(1, Math.round(m.attack * (0.7 + rng.next() * 0.6) - playerDefense(p)));
  const dodged = rng.next() < p.attrs.agility * 0.008;
  if (dodged) {
    push(state, `${m.name}扑来,你侧身一闪,堪堪避过。`, 'good');
    return;
  }
  p.hp -= dmg;
  push(state, `${m.name}反击,你受了 ${dmg} 点伤。(气血 ${Math.max(0, p.hp)}/${p.maxHp})`, 'bad');
  if (p.hp <= 0) {
    p.hp = 0;
    state.dead = true;
    state.combat = null;
    push(state, `你不敌${m.name},眼前一黑……这一世,就到此为止了。`, 'bad');
    push(state, `【享年 Lv.${p.level}】 你死在了${getRoom(p.roomId).name}。点击「重新来过」开启新一世。`, 'system');
  }
}

function winCombat(state: MudState, rng: Rng): void {
  const p = state.player;
  const isBoss = state.combat!.isBoss;
  const m = state.combat!.monster;
  state.combat = null;
  push(state, `✅ 你击败了【${m.name}】!获得阅历 ${m.exp}。`, 'good');

  // 掉落
  if (m.drops) {
    for (const d of m.drops) {
      if (rng.next() < d.chance) {
        p.inventory[d.itemId] = (p.inventory[d.itemId] ?? 0) + 1;
        push(state, `拾取:【${ITEMS[d.itemId]?.name ?? d.itemId}】`, 'good');
      }
    }
  }

  // 主线:击败黑风寨主,通关
  if (isBoss) {
    state.bossDefeated = true;
    push(state, '━━━━━━━━━━━━━━━━━━', 'system');
    push(state, `🎉 你一刀斩落黑风寨主,黑风寨群龙无首,作鸟兽散!`, 'good');
    push(state, `方圆百里的百姓再不受剪径之苦,你的侠名自此传遍江湖。`, 'good');
    push(state, `【通关】${p.name} 以 Lv.${p.level} 之身剿灭黑风寨,了却这一段江湖公案。`, 'system');
    push(state, '江湖路远,你还可以继续历练、登峰造极,或「重新来过」开启新一世。', 'system');
  }

  // 阅历升级(支持一次获得大量阅历的连续升级)
  p.exp += m.exp;
  while (p.exp >= p.level * 20) {
    p.exp -= p.level * 20;
    p.level += 1;
    p.attrs.strength += 1;
    p.attrs.agility += 1;
    p.attrs.constitution += 1;
    const oldMax = p.maxHp;
    p.maxHp = maxHpOf(p);
    p.hp += p.maxHp - oldMax;
    push(state, `🎉 你的修为精进,升到 Lv.${p.level}!气血上限提升。`, 'good');
  }
}

function talkToNpc(state: MudState, npc: { id: string; name: string; kind: string; line: string }, rng: Rng): void {
  const p = state.player;
  push(state, `${npc.name}:${npc.line}`, 'info');
  switch (npc.kind) {
    case 'healer':
      p.hp = p.maxHp;
      push(state, `${npc.name}为你敷药疗伤,气血尽复。(气血 ${p.hp}/${p.maxHp})`, 'good');
      break;
    case 'merchant': {
      // 简单收购:把所有 misc 卖钱
      let earned = 0;
      for (const [id, cnt] of Object.entries(p.inventory)) {
        const item = ITEMS[id];
        if (item?.kind === 'misc' && cnt > 0) {
          earned += item.price * cnt;
          delete p.inventory[id];
        }
      }
      if (earned > 0) {
        p.gold += earned;
        push(state, `你把杂物卖给${npc.name},得银 ${earned} 两。(现有 ${p.gold} 两)`, 'good');
      } else {
        push(state, `${npc.name}:你也没什么好卖的。去山里打些狼牙蛇胆来吧。`, 'system');
      }
      break;
    }
    case 'master': {
      // 隐士传授武功:从你当前可学的武功里挑一门(优先未学的);悟性越高越能学上乘武功
      const learnable = SKILLS.filter((s) => !p.skills.includes(s.id) && canLearn(p.attrs, s));
      if (learnable.length > 0 && p.exp >= 15) {
        p.exp -= 15;
        // 随机一门( weighted 偏向上乘,即可学中 attrBonus 总和大的 )
        const scored = learnable.map((s) => ({ s, score: Object.values(s.attrBonus).reduce((a, b) => a + (b ?? 0), 0) }));
        scored.sort((a, b) => b.score - a.score);
        const pick = scored[Math.floor(rng.next() * Math.min(3, scored.length))]!.s;
        const r = learnSkill(p, pick.id);
        if (r) {
          push(state, `${npc.name}见你资质不俗,将独门绝学倾囊相授。你${r.text}`, 'good');
        }
      } else if (learnable.length === 0) {
        push(state, `${npc.name}:你已尽得我所知,江湖之大,去别处寻访更高明的武功吧。`, 'system');
      } else {
        push(state, `${npc.name}:你阅历尚浅,武功强求不得。先去历练(需阅历≥15,悟性/臂力等达武功门槛)。`, 'system');
      }
      break;
    }
    default:
      break;
  }
}
