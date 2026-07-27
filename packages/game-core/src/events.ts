import type { EventContext, StageId } from './types.js';
import type { Rng } from './rng.js';
import { chance, pickOne, randInt } from './rng.js';
import { applyMod, clampAttr } from './attributes.js';

/**
 * 「少年仗剑江湖路」剧本事件库。
 * 每个事件:适用年龄区间 + 触发条件 + 权重 + 叙述生成 + 结算效果。
 * effect 直接就地修改 ctx(age/attrs/flags/lifespanDelta/history)。
 */

export interface LifeEvent {
  id: string;
  minAge: number;
  maxAge: number;
  /** 触发权重(在满足条件的事件中) */
  weight: number;
  /** 附加触发条件(返回 true 才可能被选) */
  when?: (ctx: EventContext) => boolean;
  /** 生成叙述文本(可使用结算前算好的数值) */
  text: (ctx: EventContext, rng: Rng) => string;
  /** 结算:就地修改 ctx,返回当年获得的 flag */
  effect: (ctx: EventContext, rng: Rng) => string[];
}

function bump(ctx: EventContext, mod: Parameters<typeof applyMod>[1]): void {
  ctx.attrs = applyMod(ctx.attrs, mod);
}

const ev = (e: LifeEvent): LifeEvent => e;

export const EVENTS: readonly LifeEvent[] = [
  // ==================== 幼年 childhood (0-11) ====================
  ev({
    id: 'born',
    minAge: 0, maxAge: 0, weight: 100,
    text: (c) =>
      `你出生在一个${c.flags.has('poor') ? '贫苦' : c.flags.has('rich') ? '殷实' : '普通'}人家,` +
      `时值乱世,武林风波不断。接生婆说你哭声洪亮,是个好苗子。`,
    effect: () => [],
  }),
  ev({
    id: 'toddler-tumble',
    minAge: 2, maxAge: 5, weight: 8,
    text: () => '你蹒跚学步,摔得鼻青脸肿却咧嘴直笑,身子骨愈发结实。',
    effect: (c) => { bump(c, { constitution: 1 }); return []; },
  }),
  ev({
    id: 'listen-storyteller',
    minAge: 5, maxAge: 11, weight: 10,
    text: () => '你蹲在茶馆听说书人讲侠客行侠仗义的故事,听得如痴如醉,心中埋下江湖梦。',
    effect: (c) => { bump(c, { wisdom: 1, reputation: 1 }); return []; },
  }),
  ev({
    id: 'village-play-fight',
    minAge: 6, maxAge: 11, weight: 9,
    text: () => '你与村中孩童舞枪弄棒、假扮侠客,一招一式竟有模有样。',
    effect: (c) => { bump(c, { strength: 1, agility: 1 }); return []; },
  }),
  ev({
    id: 'orphan-bully',
    minAge: 6, maxAge: 11, weight: 8,
    when: (c) => c.flags.has('orphan'),
    text: () => '没了爹娘庇护,你常被顽童欺负,却也早早学会隐忍与察言观色。',
    effect: (c) => { bump(c, { wisdom: 2 }); return []; },
  }),
  ev({
    id: 'rich-tutor',
    minAge: 6, maxAge: 11, weight: 8,
    when: (c) => c.flags.has('rich'),
    text: () => '家中为你延请武师开蒙,你根基打得比同龄人扎实许多。',
    effect: (c) => { bump(c, { strength: 2, agility: 1 }); return []; },
  }),
  ev({
    id: 'meet-beggar',
    minAge: 8, maxAge: 11, weight: 6,
    when: (c) => c.flags.has('lucky') || c.attrs.luck >= 14,
    text: () => '你分了一个老叫化半块烧饼,他临走时摸出一页残破的拳谱塞给你。',
    effect: (c) => { bump(c, { wisdom: 2, strength: 1 }); return ['crumpled-manual']; },
  }),
  ev({
    id: 'manual-omen',
    minAge: 9, maxAge: 11, weight: 5,
    when: (c) => c.flags.has('secret-manual'),
    text: () => '夜深人静,你偷偷翻开怀中那半卷秘籍,只觉字字玄机,体内气血隐隐躁动。',
    effect: (c) => { bump(c, { constitution: 2, wisdom: 1 }); return []; },
  }),

  // ==================== 拜师学艺 apprentice (12-17) ====================
  ev({
    id: 'join-sect',
    minAge: 12, maxAge: 14, weight: 30,
    text: (c) =>
      c.flags.has('martial-family')
        ? '依家中安排,你拜入祖上有旧的门派,正式踏上习武之路。'
        : '你告别家乡,辗转拜入一座山门,从扫地挑水的杂役做起。',
    effect: (c) => { bump(c, { strength: 1, agility: 1, reputation: 1 }); return ['disciple']; },
  }),
  ev({
    id: 'hard-training',
    minAge: 12, maxAge: 17, weight: 14,
    text: () => '冬练三九,夏练三伏。你咬牙苦熬,基本功日渐扎实。',
    effect: (c) => { bump(c, { strength: 2, constitution: 1 }); return []; },
  }),
  ev({
    id: 'inner-force-boon',
    minAge: 13, maxAge: 17, weight: 8,
    when: (c) => c.flags.has('inner-force'),
    text: () => '你经脉宽阔,内力修行进境奇速,师兄们都道你是百年难遇的苗子。',
    effect: (c) => { bump(c, { constitution: 3, wisdom: 1 }); return []; },
  }),
  ev({
    id: 'photographic-learn',
    minAge: 12, maxAge: 17, weight: 8,
    when: (c) => c.flags.has('photographic-memory'),
    text: () => '师门演示的剑法你只看一遍便尽数记下,暗地里已悄悄练会了三套。',
    effect: (c) => { bump(c, { wisdom: 2, agility: 2 }); return []; },
  }),
  ev({
    id: 'prodigy-noticed',
    minAge: 13, maxAge: 17, weight: 7,
    when: (c) => c.flags.has('prodigy'),
    text: () => '掌门无意间见你练功,惊为天人,破例收你为入室弟子,倾囊相授。',
    effect: (c) => { bump(c, { strength: 2, agility: 2, wisdom: 2, reputation: 1 }); return ['inner-disciple']; },
  }),
  ev({
    id: 'sword-bone-affinity',
    minAge: 13, maxAge: 17, weight: 7,
    when: (c) => c.flags.has('sword-bone'),
    text: () => '你第一次握剑,便觉血脉偾张、人剑相合,剑在你手中仿佛活了过来。',
    effect: (c) => { bump(c, { agility: 3, wisdom: 1 }); return ['sword-affinity']; },
  }),
  ev({
    id: 'junior-bully',
    minAge: 12, maxAge: 16, weight: 7,
    text: () => '有师兄仗势欺人,你据理力争反被穿小鞋,只能发奋练功争一口气。',
    effect: (c) => { bump(c, { wisdom: 1, strength: 1 }); return []; },
  }),
  ev({
    id: 'healer-herb',
    minAge: 12, maxAge: 17, weight: 6,
    when: (c) => c.flags.has('healer'),
    text: () => '你在后山采药时救了一位受伤的游方道人,他传你一套吐纳养生之法。',
    effect: (c) => { bump(c, { constitution: 3, wisdom: 1 }); return ['breathing-art']; },
  }),

  // ==================== 初入江湖 jianghu (18-24) ====================
  ev({
    id: 'descend-mountain',
    minAge: 18, maxAge: 20, weight: 30,
    text: () => '艺成下山,你仗剑而立,望着山下滚滚红尘,正式踏入江湖。',
    effect: (c) => { bump(c, { reputation: 2, agility: 1 }); return ['wanderer']; },
  }),
  ev({
    id: 'first-righteous',
    minAge: 18, maxAge: 24, weight: 12,
    text: (c) => {
      const win = c.attrs.strength + c.attrs.agility >= 24;
      return win
        ? '路见恶霸欺压良善,你拔剑相助,三招两式便将其制服,百姓拍手称快。'
        : '你路见不平拔刀相助,却因武艺不精吃了闷亏,幸得路人接应才脱身的狼狈,让你暗下决心。';
    },
    effect: (c) => {
      const win = c.attrs.strength + c.attrs.agility >= 24;
      if (win) { bump(c, { reputation: 4, strength: 1 }); return ['righteous-deed']; }
      bump(c, { wisdom: 2, reputation: 1 }); return [];
    },
  }),
  ev({
    id: 'escort-mission',
    minAge: 18, maxAge: 24, weight: 9,
    text: () => '你加入镖局走了一趟远镖,一路风餐露宿,见识了江湖的险恶与门道。',
    effect: (c) => { bump(c, { reputation: 2, constitution: 1, luck: 1 }); return []; },
  }),
  ev({
    id: 'save-drowning',
    minAge: 18, maxAge: 24, weight: 7,
    when: (c) => c.flags.has('lucky') || c.attrs.luck >= 16,
    text: () => '你救起一名落水书生,不想他竟是名门之后,执意与你结拜,引你入上流武林。',
    effect: (c) => { bump(c, { reputation: 4, luck: 1 }); return ['sworn-brother']; },
  }),
  ev({
    id: 'nimble-heist',
    minAge: 18, maxAge: 24, weight: 6,
    when: (c) => c.flags.has('nimble'),
    text: () => '你夜探为富不仁的盐商家,取走不义之财接济穷人,只留下一朵纸花。',
    effect: (c) => { bump(c, { reputation: 3, agility: 2, luck: 1 }); return ['folk-hero']; },
  }),
  ev({
    id: 'revenge-clue',
    minAge: 18, maxAge: 24, weight: 7,
    when: (c) => c.flags.has('revenge'),
    text: () => '你四处打探仇人的下落,终于在一间酒肆听到一丝线索,握紧了拳头。',
    effect: (c) => { bump(c, { wisdom: 1, strength: 1 }); return ['revenge-trail']; },
  }),
  ev({
    id: 'ambushed',
    minAge: 19, maxAge: 24, weight: 6,
    when: (c) => c.attrs.luck < 10 && !c.flags.has('chosen-one'),
    text: () => '你遭人蒙面伏击,奋力杀出重围,虽捡回一命却也挂了彩,懂得了江湖险恶。',
    effect: (c) => { bump(c, { constitution: -2, wisdom: 2 }); c.lifespanDelta -= 1; return []; },
  }),
  ev({
    id: 'manual-progress',
    minAge: 18, maxAge: 24, weight: 7,
    when: (c) => c.flags.has('secret-manual'),
    text: () => '你参悟怀中秘籍,渐入佳境,只觉一股暖流游走全身,内力大有精进。',
    effect: (c) => { bump(c, { constitution: 2, wisdom: 2, strength: 1 }); return []; },
  }),
  ev({
    id: 'famous-duel',
    minAge: 20, maxAge: 24, weight: 6,
    when: (c) => c.attrs.reputation >= 8,
    text: () => '你与人当街比武,数十招不分胜负,自此在江湖上闯出了名号。',
    effect: (c) => { bump(c, { reputation: 4 }); return ['known-name']; },
  }),

  // ==================== 恩怨沉浮 feud (25-39) ====================
  ev({
    id: 'revenge-showdown',
    minAge: 25, maxAge: 39, weight: 16,
    when: (c) => c.flags.has('revenge') && c.flags.has('revenge-trail') && !c.flags.has('revenge-done'),
    text: (c) => {
      const strong = c.attrs.strength + c.attrs.wisdom >= 45;
      return strong
        ? '你终于寻到灭门仇人,一场血战,手刃仇敌。大仇得报,你仰天长啸,泪湿衣襟。'
        : '你寻到仇人,奈何武艺不济,功亏一篑,重伤而逃。此仇未报,你誓要更强。';
    },
    effect: (c) => {
      const strong = c.attrs.strength + c.attrs.wisdom >= 45;
      if (strong) { bump(c, { reputation: 6, constitution: -1 }); c.lifespanDelta -= 1; return ['revenge-done']; }
      bump(c, { constitution: -2, wisdom: 3 }); c.lifespanDelta -= 2; return [];
    },
  }),
  ev({
    id: 'secret-manual-mastered',
    minAge: 25, maxAge: 39, weight: 10,
    when: (c) => c.flags.has('secret-manual') && !c.flags.has('manual-mastered'),
    text: () => '多年苦修,你终于将那半卷绝世秘籍融会贯通,武学造诣再上一层楼,脱胎换骨。',
    effect: (c) => {
      bump(c, { strength: 4, agility: 4, constitution: 4, wisdom: 4 });
      return ['manual-mastered'];
    },
  }),
  ev({
    id: 'jianghu-feud',
    minAge: 25, maxAge: 39, weight: 9,
    text: (c) => {
      const win = c.attrs.strength + c.attrs.agility + c.attrs.constitution >= 50;
      return win
        ? '你卷入两大帮派的仇杀,凭借过人武艺全身而退,还顺势调停了纷争,声名大噪。'
        : '你卷入帮派仇杀,险象环生,虽保住了性命,却也结下几桩梁子。';
    },
    effect: (c) => {
      const win = c.attrs.strength + c.attrs.agility + c.attrs.constitution >= 50;
      if (win) { bump(c, { reputation: 5, wisdom: 1 }); return ['peacemaker']; }
      bump(c, { constitution: -2 }); c.lifespanDelta -= 1; return ['made-enemies'];
    },
  }),
  ev({
    id: 'poison-plot',
    minAge: 25, maxAge: 39, weight: 7,
    text: (c) => {
      if (c.flags.has('poison-immune')) return '有人在你酒里下毒,你百毒不侵,不动声色便将计就计,揪出了幕后黑手。';
      if (c.flags.has('healer')) return '你中了暗算之毒,幸而通晓医理,连夜配药解了毒,惊魂未定。';
      return '你遭人下毒,虽侥幸保住性命,却也损了根基,从此对这江湖多了几分提防。';
    },
    effect: (c) => {
      if (c.flags.has('poison-immune')) { bump(c, { reputation: 3 }); return []; }
      if (c.flags.has('healer')) { bump(c, { constitution: -1 }); return []; }
      bump(c, { constitution: -2 }); c.lifespanDelta -= 2; return [];
    },
  }),
  ev({
    id: 'find-master',
    minAge: 25, maxAge: 39, weight: 7,
    when: (c) => c.flags.has('lucky') || c.attrs.luck >= 18 || c.flags.has('chosen-one'),
    text: () => '你机缘巧合,得遇一位隐世高人指点迷津,茅塞顿开,武学上豁然贯通。',
    effect: (c) => { bump(c, { wisdom: 4, strength: 2, agility: 2 }); return ['grandmaster-taught']; },
  }),
  ev({
    id: 'love',
    minAge: 25, maxAge: 39, weight: 7,
    text: () => '你邂逅一位红颜知己,执手江湖,儿女情长,刀光剑影中添了几分温柔。',
    effect: (c) => { bump(c, { luck: 2, reputation: 1 }); return ['married']; },
  }),
  ev({
    id: 'sword-master-duel',
    minAge: 28, maxAge: 39, weight: 6,
    when: (c) => c.flags.has('sword-affinity') || c.flags.has('sword-bone'),
    text: (c) => {
      const win = c.attrs.agility + c.attrs.wisdom >= 50;
      return win
        ? '你与名动天下的剑客决战于华山之巅,一剑定胜负,自此剑名远播。'
        : '你与顶尖剑客论剑,虽败犹荣,窥见了剑道更高的境界。';
    },
    effect: (c) => {
      const win = c.attrs.agility + c.attrs.wisdom >= 50;
      if (win) { bump(c, { reputation: 6, agility: 2 }); return ['sword-master']; }
      bump(c, { wisdom: 3, agility: 1 }); return [];
    },
  }),
  ev({
    id: 'iron-body-forge',
    minAge: 25, maxAge: 39, weight: 6,
    when: (c) => c.flags.has('iron-body') || c.flags.has('mighty'),
    text: () => '你寻得一处地火熔岩之地,以烈火淬炼肉身,横练功夫臻至化境,刀枪不入。',
    effect: (c) => { bump(c, { constitution: 5, strength: 2 }); return ['diamond-body']; },
  }),

  // ==================== 门派风云 sect (40-54) ====================
  ev({
    id: 'found-sect',
    minAge: 40, maxAge: 54, weight: 14,
    when: (c) => !c.flags.has('sect-founder'),
    text: (c) =>
      c.attrs.reputation >= 20
        ? '你德高望重,四方豪杰纷纷来投,你索性开山立派,自立门户。'
        : '你回到师门,执掌一峰,开始授徒传艺,延续师门香火。',
    effect: (c) => {
      if (c.attrs.reputation >= 20) { bump(c, { reputation: 6 }); return ['sect-founder', 'sect-leader']; }
      bump(c, { reputation: 3 }); return ['sect-leader'];
    },
  }),
  ev({
    id: 'sect-strife',
    minAge: 40, maxAge: 54, weight: 9,
    when: (c) => c.flags.has('sect-leader'),
    text: (c) => {
      const wise = c.attrs.wisdom >= 30;
      return wise
        ? '门中长老争权夺利,你运筹帷幄,恩威并施,一场内乱消弭于无形。'
        : '门中内斗愈演愈烈,你心力交瘁,门派元气大伤。';
    },
    effect: (c) => {
      const wise = c.attrs.wisdom >= 30;
      if (wise) { bump(c, { reputation: 4, wisdom: 1 }); return ['sect-stable']; }
      bump(c, { constitution: -2, reputation: -2 }); c.lifespanDelta -= 1; return [];
    },
  }),
  ev({
    id: 'train-disciples',
    minAge: 40, maxAge: 54, weight: 9,
    text: () => '你悉心教导门下弟子,桃李满门,后生晚辈皆以你为武林泰山北斗。',
    effect: (c) => { bump(c, { reputation: 3, wisdom: 1 }); return ['mentor']; },
  }),
  ev({
    id: 'defend-evil-cult',
    minAge: 40, maxAge: 54, weight: 8,
    when: (c) => c.attrs.reputation >= 18,
    text: (c) => {
      const win = c.attrs.strength + c.attrs.agility + c.attrs.wisdom >= 70;
      return win
        ? '魔教大举进犯中原,你振臂一呼,率群雄血战于断魂崖,终将其击退,名扬天下。'
        : '魔教来犯,你率众抵御,死伤惨重,虽守住山门,却也元气大伤。';
    },
    effect: (c) => {
      const win = c.attrs.strength + c.attrs.agility + c.attrs.wisdom >= 70;
      if (win) { bump(c, { reputation: 8, constitution: -1 }); c.lifespanDelta -= 1; return ['repelled-evil', 'hero-of-realm']; }
      bump(c, { constitution: -3, reputation: 2 }); c.lifespanDelta -= 2; return ['repelled-evil'];
    },
  }),
  ev({
    id: 'grandmaster-visit',
    minAge: 40, maxAge: 54, weight: 6,
    when: (c) => c.flags.has('grandmaster-taught'),
    text: () => '当年那位隐世高人再度现身,与你印证武学,你二人煮酒论剑,传为武林佳话。',
    effect: (c) => { bump(c, { wisdom: 3, reputation: 3 }); return []; },
  }),

  // ==================== 宗师/归隐 master (55+) ====================
  ev({
    id: 'write-manual',
    minAge: 55, maxAge: 200, weight: 10,
    text: () => '你将毕生武学著成秘籍,藏于名山,以待有缘,后世武林皆承你的衣钵。',
    effect: (c) => { bump(c, { reputation: 4, wisdom: 1 }); return ['authored-manual']; },
  }),
  ev({
    id: 'teach-successor',
    minAge: 55, maxAge: 200, weight: 9,
    when: (c) => c.flags.has('sect-leader') || c.flags.has('mentor'),
    text: () => '你寻得一位可造之材,倾囊相授,将一身绝学与门派重担托付后人。',
    effect: (c) => { bump(c, { reputation: 2 }); return ['successor-chosen']; },
  }),
  ev({
    id: 'seclusion',
    minAge: 55, maxAge: 200, weight: 8,
    text: () => '你厌倦江湖纷争,归隐山林,种菊东篱,看云卷云舒,得享清闲。',
    effect: (c) => { bump(c, { constitution: 1, wisdom: 1 }); c.lifespanDelta += 2; return ['recluse']; },
  }),
  ev({
    id: 'chosen-one-legend',
    minAge: 55, maxAge: 200, weight: 7,
    when: (c) => c.flags.has('chosen-one'),
    text: () => '你一生行侠仗义,济世安民,百姓为你立生祠,你的事迹被编成戏文传唱天下。',
    effect: (c) => { bump(c, { reputation: 6 }); return ['living-legend']; },
  }),
  ev({
    id: 'old-age-meditate',
    minAge: 60, maxAge: 200, weight: 8,
    text: () => '你闭关静修,参研武学至理,虽已年迈,内功却愈发精深,返璞归真。',
    effect: (c) => { bump(c, { wisdom: 2, constitution: 1 }); c.lifespanDelta += 1; return []; },
  }),
];

/** 按当前上下文筛出可触发的事件并加权随机一个 */
export function pickEvent(ctx: EventContext, rng: Rng): LifeEvent {
  const pool = EVENTS.filter((e) => {
    if (ctx.age < e.minAge || ctx.age > e.maxAge) return false;
    if (e.when && !e.when(ctx)) return false;
    return true;
  });
  if (pool.length === 0) {
    // 兜底:给一段贴合年龄的通用事件(理论上各年龄段都应有专属事件,此为保险)
    return ev({
      id: 'quiet-year',
      minAge: 0, maxAge: 999, weight: 1,
      text: (c) =>
        c.age <= 11
          ? '你在乡间野地里疯跑玩耍,捉鱼摸虾,无忧无虑地长大了些。'
          : '这一年波澜不惊,你勤加练功,静待时机。',
      effect: (c) => { bump(c, c.age <= 11 ? { constitution: 1 } : { wisdom: 1 }); return []; },
    });
  }
  const weights = pool.map((e) => e.weight);
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]!;
    if (roll < 0) return pool[i]!;
  }
  return pool[pool.length - 1]!;
}

/** 判定某年是否因年迈/横祸而死亡(非寿终),返回死因或 null。福缘越高横祸越少 */
export function checkSuddenDeath(ctx: EventContext, rng: Rng): string | null {
  const luck = ctx.attrs.luck;
  const mitigation = Math.min(0.75, luck / 120); // 福缘提供最高 75% 的横祸减免

  // 高龄后每年按年龄增长死亡率(福缘可部分减免)
  if (ctx.age > 60) {
    const p = (ctx.age - 60) * 0.006 * (1 - mitigation);
    if (chance(rng, p)) {
      return pickOne(rng, ['一场大病,药石无灵', '旧伤复发,撒手人寰', '寿数将尽,无疾而终']);
    }
  }
  // 成年后的江湖横祸(福缘低者更易遭劫)
  if (ctx.age >= 18 && chance(rng, 0.006 * (1 - mitigation))) {
    return pickOne(rng, ['卷入仇杀,横死街头', '遭人暗算,含恨而亡', '渡江遇险,葬身鱼腹']);
  }
  return null;
}

export { clampAttr };
