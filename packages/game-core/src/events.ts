import type { EventContext, HeirInfo } from './types.js';
import type { Rng } from './rng.js';
import { chance, pickOne } from './rng.js';
import { applyMod, clampAttr } from './attributes.js';
import { SKILLS, canLearn, getSkill } from './skills.js';

/**
 * 「少年仗剑江湖路」剧本事件库。
 * 每个事件:适用年龄区间 + 触发条件 + 权重 + run(一次性结算并返回叙述)。
 * run 就地修改 ctx,返回 { text, flags }。叙事与结算严格一致。
 */

export interface LifeEvent {
  id: string;
  minAge: number;
  maxAge: number;
  weight: number;
  when?: (ctx: EventContext) => boolean;
  run: (ctx: EventContext, rng: Rng) => { text: string; flags: string[] };
}

function bump(ctx: EventContext, mod: Parameters<typeof applyMod>[1]): void {
  ctx.attrs = applyMod(ctx.attrs, mod);
}

/** 尝试习得一门武功(就地结算属性与 skills),返回习得描述与 flag;已会或门槛不足返回 null */
function learnSkill(ctx: EventContext, skillId: string): { text: string; flag: string } | null {
  if (ctx.skills.has(skillId)) return null;
  const skill = getSkill(skillId);
  if (!canLearn(ctx.attrs, skill)) return null;
  ctx.skills.add(skillId);
  bump(ctx, skill.attrBonus);
  return { text: `习得${skill.name}——${skill.desc}`, flag: skill.flag };
}

/** 从当前可学的武功里随机挑一门修习 */
function learnRandomAvailable(ctx: EventContext, rng: Rng): { text: string; flag: string } | null {
  const available = SKILLS.filter((s) => !ctx.skills.has(s.id) && canLearn(ctx.attrs, s));
  if (available.length === 0) return null;
  return learnSkill(ctx, pickOne(rng, available).id);
}

const SURNAMES = ['李', '王', '张', '刘', '陈', '杨', '赵', '周', '吴', '郑', '林', '苏', '叶', '沈', '顾'];
const GIVEN = ['破天', '凌云', '啸天', '无恨', '惊鸿', '孤鸿', '傲雪', '问天', '铁心', '镇山', '灭门', '血手'];
const HERO_NAMES = ['红袖', '青鸾', '小昭', '芷若', '语嫣', '念慈', '蓉儿', '盈盈', '素素', '敏君'];
const HEIR_GIVEN = ['承志', '继业', '破天', '凌云', '念祖', '思过', '无忌', '小宝', '逍遥', '长青'];

const genPersonName = (rng: Rng): string => pickOne(rng, SURNAMES) + pickOne(rng, GIVEN);
const genSpouseName = (rng: Rng): string => pickOne(rng, HERO_NAMES);

function genHeir(rng: Rng, ctx: EventContext): HeirInfo {
  const inherit = (v: number) => Math.max(1, Math.round(v / 6));
  const heir: HeirInfo = {
    name: pickOne(rng, HEIR_GIVEN),
    bornAtAge: ctx.age,
    bonusAttrs: {
      strength: inherit(ctx.attrs.strength),
      wisdom: inherit(ctx.attrs.wisdom),
      constitution: inherit(ctx.attrs.constitution),
    },
  };
  if (ctx.flags.has('prodigy') || ctx.flags.has('sword-bone')) heir.inheritedFlag = 'talent';
  return heir;
}

const ev = (e: LifeEvent): LifeEvent => e;

export const EVENTS: readonly LifeEvent[] = [
  // ==================== 幼年 childhood (0-11) ====================
  ev({
    id: 'born', minAge: 0, maxAge: 0, weight: 100,
    run: (c) => ({
      text: `你出生在一个${c.flags.has('poor') ? '贫苦' : c.flags.has('rich') ? '殷实' : '普通'}人家,时值乱世,武林风波不断。接生婆说你哭声洪亮,是个好苗子。`,
      flags: [],
    }),
  }),
  ev({
    id: 'toddler-tumble', minAge: 2, maxAge: 5, weight: 8,
    run: (c) => { bump(c, { constitution: 1 }); return { text: '你蹒跚学步,摔得鼻青脸肿却咧嘴直笑,身子骨愈发结实。', flags: [] }; },
  }),
  ev({
    id: 'listen-storyteller', minAge: 5, maxAge: 11, weight: 10,
    run: (c) => { bump(c, { wisdom: 1, reputation: 1 }); return { text: '你蹲在茶馆听说书人讲侠客行侠仗义的故事,听得如痴如醉,心中埋下江湖梦。', flags: [] }; },
  }),
  ev({
    id: 'village-play-fight', minAge: 6, maxAge: 11, weight: 9,
    run: (c) => { bump(c, { strength: 1, agility: 1 }); return { text: '你与村中孩童舞枪弄棒、假扮侠客,一招一式竟有模有样。', flags: [] }; },
  }),
  ev({
    id: 'orphan-bully', minAge: 6, maxAge: 11, weight: 8,
    when: (c) => c.flags.has('orphan'),
    run: (c) => { bump(c, { wisdom: 2 }); return { text: '没了爹娘庇护,你常被顽童欺负,却也早早学会隐忍与察言观色。', flags: [] }; },
  }),
  ev({
    id: 'rich-tutor', minAge: 6, maxAge: 11, weight: 8,
    when: (c) => c.flags.has('rich'),
    run: (c) => { bump(c, { strength: 2, agility: 1 }); return { text: '家中为你延请武师开蒙,你根基打得比同龄人扎实许多。', flags: [] }; },
  }),
  ev({
    id: 'meet-beggar', minAge: 8, maxAge: 11, weight: 6,
    when: (c) => c.flags.has('lucky') || c.attrs.luck >= 14,
    run: (c) => { bump(c, { wisdom: 2, strength: 1 }); return { text: '你分了一个老叫化半块烧饼,他临走时摸出一页残破的拳谱塞给你。', flags: ['crumpled-manual'] }; },
  }),
  ev({
    id: 'manual-omen', minAge: 9, maxAge: 11, weight: 5,
    when: (c) => c.flags.has('secret-manual'),
    run: (c) => { bump(c, { constitution: 2, wisdom: 1 }); return { text: '夜深人静,你偷偷翻开怀中那半卷秘籍,只觉字字玄机,体内气血隐隐躁动。', flags: [] }; },
  }),

  // ==================== 拜师学艺 apprentice (12-17) ====================
  ev({
    id: 'join-sect', minAge: 12, maxAge: 14, weight: 30,
    run: (c) => {
      bump(c, { strength: 1, agility: 1, reputation: 1 });
      return {
        text: c.flags.has('martial-family')
          ? '依家中安排,你拜入祖上有旧的门派,正式踏上习武之路。'
          : '你告别家乡,辗转拜入一座山门,从扫地挑水的杂役做起。',
        flags: ['disciple'],
      };
    },
  }),
  ev({
    id: 'hard-training', minAge: 12, maxAge: 17, weight: 14,
    run: (c) => { bump(c, { strength: 2, constitution: 1 }); return { text: '冬练三九,夏练三伏。你咬牙苦熬,基本功日渐扎实。', flags: [] }; },
  }),
  ev({
    id: 'inner-force-boon', minAge: 13, maxAge: 17, weight: 8,
    when: (c) => c.flags.has('inner-force'),
    run: (c) => { bump(c, { constitution: 3, wisdom: 1 }); return { text: '你经脉宽阔,内力修行进境奇速,师兄们都道你是百年难遇的苗子。', flags: [] }; },
  }),
  ev({
    id: 'photographic-learn', minAge: 12, maxAge: 17, weight: 8,
    when: (c) => c.flags.has('photographic-memory'),
    run: (c) => { bump(c, { wisdom: 2, agility: 2 }); return { text: '师门演示的剑法你只看一遍便尽数记下,暗地里已悄悄练会了三套。', flags: [] }; },
  }),
  ev({
    id: 'prodigy-noticed', minAge: 13, maxAge: 17, weight: 7,
    when: (c) => c.flags.has('prodigy'),
    run: (c) => { bump(c, { strength: 2, agility: 2, wisdom: 2, reputation: 1 }); return { text: '掌门无意间见你练功,惊为天人,破例收你为入室弟子,倾囊相授。', flags: ['inner-disciple'] }; },
  }),
  ev({
    id: 'sword-bone-affinity', minAge: 13, maxAge: 17, weight: 7,
    when: (c) => c.flags.has('sword-bone'),
    run: (c) => { bump(c, { agility: 3, wisdom: 1 }); return { text: '你第一次握剑,便觉血脉偾张、人剑相合,剑在你手中仿佛活了过来。', flags: ['sword-affinity'] }; },
  }),
  ev({
    id: 'junior-bully', minAge: 12, maxAge: 16, weight: 7,
    run: (c) => { bump(c, { wisdom: 1, strength: 1 }); return { text: '有师兄仗势欺人,你据理力争反被穿小鞋,只能发奋练功争一口气。', flags: [] }; },
  }),
  ev({
    id: 'healer-herb', minAge: 12, maxAge: 17, weight: 6,
    when: (c) => c.flags.has('healer'),
    run: (c) => { bump(c, { constitution: 3, wisdom: 1 }); return { text: '你在后山采药时救了一位受伤的游方道人,他传你一套吐纳养生之法。', flags: ['breathing-art'] }; },
  }),

  // ==================== 初入江湖 jianghu (18-24) ====================
  ev({
    id: 'descend-mountain', minAge: 18, maxAge: 20, weight: 30,
    run: (c) => { bump(c, { reputation: 2, agility: 1 }); return { text: '艺成下山,你仗剑而立,望着山下滚滚红尘,正式踏入江湖。', flags: ['wanderer'] }; },
  }),
  ev({
    id: 'first-righteous', minAge: 18, maxAge: 24, weight: 12,
    run: (c) => {
      const win = c.attrs.strength + c.attrs.agility >= 24;
      if (win) { bump(c, { reputation: 4, strength: 1 }); return { text: '路见恶霸欺压良善,你拔剑相助,三招两式便将其制服,百姓拍手称快。', flags: ['righteous-deed'] }; }
      bump(c, { wisdom: 2, reputation: 1 });
      return { text: '你路见不平拔刀相助,却因武艺不精吃了闷亏,幸得路人接应才脱身,这狼狈让你暗下决心。', flags: [] };
    },
  }),
  ev({
    id: 'escort-mission', minAge: 18, maxAge: 24, weight: 9,
    run: (c) => { bump(c, { reputation: 2, constitution: 1, luck: 1 }); return { text: '你加入镖局走了一趟远镖,一路风餐露宿,见识了江湖的险恶与门道。', flags: [] }; },
  }),
  ev({
    id: 'save-drowning', minAge: 18, maxAge: 24, weight: 7,
    when: (c) => c.flags.has('lucky') || c.attrs.luck >= 16,
    run: (c) => { bump(c, { reputation: 4, luck: 1 }); return { text: '你救起一名落水书生,不想他竟是名门之后,执意与你结拜,引你入上流武林。', flags: ['sworn-brother'] }; },
  }),
  ev({
    id: 'nimble-heist', minAge: 18, maxAge: 24, weight: 6,
    when: (c) => c.flags.has('nimble'),
    run: (c) => { bump(c, { reputation: 3, agility: 2, luck: 1 }); return { text: '你夜探为富不仁的盐商家,取走不义之财接济穷人,只留下一朵纸花。', flags: ['folk-hero'] }; },
  }),
  ev({
    id: 'revenge-clue', minAge: 18, maxAge: 24, weight: 7,
    when: (c) => c.flags.has('revenge'),
    run: (c) => { bump(c, { wisdom: 1, strength: 1 }); return { text: '你四处打探仇人的下落,终于在一间酒肆听到一丝线索,握紧了拳头。', flags: ['revenge-trail'] }; },
  }),
  ev({
    id: 'ambushed', minAge: 19, maxAge: 24, weight: 6,
    when: (c) => c.attrs.luck < 10 && !c.flags.has('chosen-one'),
    run: (c) => { bump(c, { constitution: -2, wisdom: 2 }); c.lifespanDelta -= 1; return { text: '你遭人蒙面伏击,奋力杀出重围,虽捡回一命却也挂了彩,懂得了江湖险恶。', flags: [] }; },
  }),
  ev({
    id: 'manual-progress', minAge: 18, maxAge: 24, weight: 7,
    when: (c) => c.flags.has('secret-manual'),
    run: (c) => { bump(c, { constitution: 2, wisdom: 2, strength: 1 }); return { text: '你参悟怀中秘籍,渐入佳境,只觉一股暖流游走全身,内力大有精进。', flags: [] }; },
  }),
  ev({
    id: 'famous-duel', minAge: 20, maxAge: 24, weight: 6,
    when: (c) => c.attrs.reputation >= 8,
    run: (c) => { bump(c, { reputation: 4 }); return { text: '你与人当街比武,数十招不分胜负,自此在江湖上闯出了名号。', flags: ['known-name'] }; },
  }),

  // ==================== 恩怨沉浮 feud (25-39) ====================
  ev({
    id: 'revenge-showdown', minAge: 25, maxAge: 39, weight: 16,
    when: (c) => c.flags.has('revenge') && c.flags.has('revenge-trail') && !c.flags.has('revenge-done'),
    run: (c) => {
      const strong = c.attrs.strength + c.attrs.wisdom + c.skills.size * 4 >= 45;
      if (strong) { bump(c, { reputation: 6, constitution: -1 }); c.lifespanDelta -= 1; return { text: '你终于寻到灭门仇人,一场血战,手刃仇敌。大仇得报,你仰天长啸,泪湿衣襟。', flags: ['revenge-done'] }; }
      bump(c, { constitution: -2, wisdom: 3 }); c.lifespanDelta -= 2;
      return { text: '你寻到仇人,奈何武艺不济,功亏一篑,重伤而逃。此仇未报,你誓要更强。', flags: [] };
    },
  }),
  ev({
    id: 'secret-manual-mastered', minAge: 25, maxAge: 39, weight: 10,
    when: (c) => c.flags.has('secret-manual') && !c.flags.has('manual-mastered'),
    run: (c) => { bump(c, { strength: 4, agility: 4, constitution: 4, wisdom: 4 }); return { text: '多年苦修,你终于将那半卷绝世秘籍融会贯通,武学造诣再上一层楼,脱胎换骨。', flags: ['manual-mastered'] }; },
  }),
  ev({
    id: 'jianghu-feud', minAge: 25, maxAge: 39, weight: 9,
    run: (c) => {
      const win = c.attrs.strength + c.attrs.agility + c.attrs.constitution >= 50;
      if (win) { bump(c, { reputation: 5, wisdom: 1 }); return { text: '你卷入两大帮派的仇杀,凭借过人武艺全身而退,还顺势调停了纷争,声名大噪。', flags: ['peacemaker'] }; }
      bump(c, { constitution: -2 }); c.lifespanDelta -= 1;
      return { text: '你卷入帮派仇杀,险象环生,虽保住了性命,却也结下几桩梁子。', flags: ['made-enemies'] };
    },
  }),
  ev({
    id: 'poison-plot', minAge: 25, maxAge: 39, weight: 7,
    run: (c) => {
      if (c.flags.has('poison-immune')) { bump(c, { reputation: 3 }); return { text: '有人在你酒里下毒,你百毒不侵,不动声色便将计就计,揪出了幕后黑手。', flags: [] }; }
      if (c.flags.has('healer')) { bump(c, { constitution: -1 }); return { text: '你中了暗算之毒,幸而通晓医理,连夜配药解了毒,惊魂未定。', flags: [] }; }
      bump(c, { constitution: -2 }); c.lifespanDelta -= 2;
      return { text: '你遭人下毒,虽侥幸保住性命,却也损了根基,从此对这江湖多了几分提防。', flags: [] };
    },
  }),
  ev({
    id: 'find-master', minAge: 25, maxAge: 39, weight: 7,
    when: (c) => c.flags.has('lucky') || c.attrs.luck >= 18 || c.flags.has('chosen-one'),
    run: (c) => { bump(c, { wisdom: 4, strength: 2, agility: 2 }); return { text: '你机缘巧合,得遇一位隐世高人指点迷津,茅塞顿开,武学上豁然贯通。', flags: ['grandmaster-taught'] }; },
  }),
  ev({
    id: 'sword-master-duel', minAge: 28, maxAge: 39, weight: 6,
    when: (c) => c.flags.has('sword-affinity') || c.flags.has('sword-bone'),
    run: (c) => {
      const win = c.attrs.agility + c.attrs.wisdom >= 50;
      if (win) { bump(c, { reputation: 6, agility: 2 }); return { text: '你与名动天下的剑客决战于华山之巅,一剑定胜负,自此剑名远播。', flags: ['sword-master'] }; }
      bump(c, { wisdom: 3, agility: 1 });
      return { text: '你与顶尖剑客论剑,虽败犹荣,窥见了剑道更高的境界。', flags: [] };
    },
  }),
  ev({
    id: 'iron-body-forge', minAge: 25, maxAge: 39, weight: 6,
    when: (c) => c.flags.has('iron-body') || c.flags.has('mighty'),
    run: (c) => { bump(c, { constitution: 5, strength: 2 }); return { text: '你寻得一处地火熔岩之地,以烈火淬炼肉身,横练功夫臻至化境,刀枪不入。', flags: ['diamond-body'] }; },
  }),

  // ==================== 门派风云 sect (40-54) ====================
  ev({
    id: 'found-sect', minAge: 40, maxAge: 54, weight: 14,
    when: (c) => !c.flags.has('sect-founder'),
    run: (c) => {
      if (c.attrs.reputation >= 20) { bump(c, { reputation: 6 }); return { text: '你德高望重,四方豪杰纷纷来投,你索性开山立派,自立门户。', flags: ['sect-founder', 'sect-leader'] }; }
      bump(c, { reputation: 3 });
      return { text: '你回到师门,执掌一峰,开始授徒传艺,延续师门香火。', flags: ['sect-leader'] };
    },
  }),
  ev({
    id: 'sect-strife', minAge: 40, maxAge: 54, weight: 9,
    when: (c) => c.flags.has('sect-leader'),
    run: (c) => {
      const wise = c.attrs.wisdom >= 30;
      if (wise) { bump(c, { reputation: 4, wisdom: 1 }); return { text: '门中长老争权夺利,你运筹帷幄,恩威并施,一场内乱消弭于无形。', flags: ['sect-stable'] }; }
      bump(c, { constitution: -2, reputation: -2 }); c.lifespanDelta -= 1;
      return { text: '门中内斗愈演愈烈,你心力交瘁,门派元气大伤。', flags: [] };
    },
  }),
  ev({
    id: 'train-disciples', minAge: 40, maxAge: 54, weight: 9,
    run: (c) => { bump(c, { reputation: 3, wisdom: 1 }); return { text: '你悉心教导门下弟子,桃李满门,后生晚辈皆以你为武林泰山北斗。', flags: ['mentor'] }; },
  }),
  ev({
    id: 'defend-evil-cult', minAge: 40, maxAge: 54, weight: 8,
    when: (c) => c.attrs.reputation >= 18,
    run: (c) => {
      const win = c.attrs.strength + c.attrs.agility + c.attrs.wisdom >= 70;
      if (win) { bump(c, { reputation: 8, constitution: -1 }); c.lifespanDelta -= 1; return { text: '魔教大举进犯中原,你振臂一呼,率群雄血战于断魂崖,终将其击退,名扬天下。', flags: ['repelled-evil', 'hero-of-realm'] }; }
      bump(c, { constitution: -3, reputation: 2 }); c.lifespanDelta -= 2;
      return { text: '魔教来犯,你率众抵御,死伤惨重,虽守住山门,却也元气大伤。', flags: ['repelled-evil'] };
    },
  }),
  ev({
    id: 'grandmaster-visit', minAge: 40, maxAge: 54, weight: 6,
    when: (c) => c.flags.has('grandmaster-taught'),
    run: (c) => { bump(c, { wisdom: 3, reputation: 3 }); return { text: '当年那位隐世高人再度现身,与你印证武学,你二人煮酒论剑,传为武林佳话。', flags: [] }; },
  }),

  // ==================== 宗师/归隐 master (55+) ====================
  ev({
    id: 'write-manual', minAge: 55, maxAge: 200, weight: 10,
    run: (c) => { bump(c, { reputation: 4, wisdom: 1 }); return { text: '你将毕生武学著成秘籍,藏于名山,以待有缘,后世武林皆承你的衣钵。', flags: ['authored-manual'] }; },
  }),
  ev({
    id: 'teach-successor', minAge: 55, maxAge: 200, weight: 9,
    when: (c) => c.flags.has('sect-leader') || c.flags.has('mentor'),
    run: (c) => { bump(c, { reputation: 2 }); return { text: '你寻得一位可造之材,倾囊相授,将一身绝学与门派重担托付后人。', flags: ['successor-chosen'] }; },
  }),
  ev({
    id: 'seclusion', minAge: 55, maxAge: 200, weight: 8,
    run: (c) => { bump(c, { constitution: 1, wisdom: 1 }); c.lifespanDelta += 2; return { text: '你厌倦江湖纷争,归隐山林,种菊东篱,看云卷云舒,得享清闲。', flags: ['recluse'] }; },
  }),
  ev({
    id: 'chosen-one-legend', minAge: 55, maxAge: 200, weight: 7,
    when: (c) => c.flags.has('chosen-one'),
    run: (c) => { bump(c, { reputation: 6 }); return { text: '你一生行侠仗义,济世安民,百姓为你立生祠,你的事迹被编成戏文传唱天下。', flags: ['living-legend'] }; },
  }),
  ev({
    id: 'old-age-meditate', minAge: 60, maxAge: 200, weight: 8,
    run: (c) => { bump(c, { wisdom: 2, constitution: 1 }); c.lifespanDelta += 1; return { text: '你闭关静修,参研武学至理,虽已年迈,内功却愈发精深,返璞归真。', flags: [] }; },
  }),

  // ==================== 武功系统 (12+) ====================
  ev({
    id: 'train-skill', minAge: 12, maxAge: 200, weight: 11,
    when: (c) => SKILLS.some((s) => !c.skills.has(s.id) && canLearn(c.attrs, s)),
    run: (c, rng) => {
      const r = learnRandomAvailable(c, rng);
      if (r) return { text: `你潜心习武,${r.text}`, flags: [r.flag] };
      bump(c, { wisdom: 1 });
      return { text: '你潜心习武,颇有心得。', flags: [] };
    },
  }),
  ev({
    id: 'master-teaches-skill', minAge: 12, maxAge: 17, weight: 8,
    when: (c) => c.flags.has('inner-disciple') || c.flags.has('prodigy'),
    run: (c, rng) => {
      const r = learnRandomAvailable(c, rng);
      if (r) return { text: `师父倾囊相授,${r.text}`, flags: [r.flag] };
      bump(c, { wisdom: 1 });
      return { text: '师父指点你门中绝学,你受益匪浅。', flags: [] };
    },
  }),

  // ==================== 江湖奇遇 (18-45) ====================
  ev({
    id: 'cliff-fortune', minAge: 18, maxAge: 40, weight: 7,
    when: (c) => (c.flags.has('lucky') || c.attrs.luck >= 16 || c.flags.has('chosen-one')) && !c.flags.has('cliff-fortune'),
    run: (c, rng) => {
      const r = learnRandomAvailable(c, rng);
      bump(c, { constitution: 3, luck: 1 });
      const text = r
        ? `你不慎坠下悬崖,却因祸得福,在崖底发现前辈高人遗留的洞府,${r.text}`
        : '你不慎坠下悬崖,侥幸攀着藤蔓捡回一命,还在崖底得了些前辈遗留的丹药,滋补了身子。';
      return { text, flags: ['cliff-fortune'] };
    },
  }),
  ev({
    id: 'spirit-beast', minAge: 18, maxAge: 45, weight: 6,
    when: (c) => (c.flags.has('lucky') || c.attrs.luck >= 15) && !c.pet,
    run: (c, rng) => {
      const pet = pickOne(rng, ['神雕', '白猿', '灵狐', '雪豹']);
      c.pet = pet;
      bump(c, { luck: 3, agility: 1 });
      return { text: `你在深山救下一只受伤的${pet},它通灵相伴,从此随你闯荡江湖,多次助你脱险。`, flags: ['has-pet'] };
    },
  }),
  ev({
    id: 'sworn-brotherhood', minAge: 18, maxAge: 45, weight: 8,
    when: (c) => c.allies.length < 2,
    run: (c, rng) => {
      const name = genPersonName(rng);
      c.allies.push(name);
      bump(c, { reputation: 2, luck: 1 });
      return { text: `你与${name}意气相投,在桃园结为异性兄弟,誓同生死,江湖路上多了个过命交情。`, flags: ['sworn-brother'] };
    },
  }),
  ev({
    id: 'meet-soulmate', minAge: 20, maxAge: 45, weight: 8,
    when: (c) => !c.spouse,
    run: (c, rng) => {
      const name = genSpouseName(rng);
      c.spouse = name;
      bump(c, { luck: 2, reputation: 1 });
      return { text: `你邂逅了${name},一见倾心,二人执手江湖,儿女情长,刀光剑影中添了几分温柔。`, flags: ['married'] };
    },
  }),

  // ==================== 仇家与门派关系 (20-55) ====================
  ev({
    id: 'make-enemy', minAge: 20, maxAge: 50, weight: 7,
    run: (c, rng) => {
      const name = genPersonName(rng);
      c.enemies.push(name);
      bump(c, { wisdom: 1 });
      return { text: `你因一桩恩怨与${name}结下梁子,对方扬言要你血债血偿,江湖路从此多了一分凶险。`, flags: ['made-enemies'] };
    },
  }),
  ev({
    id: 'enemy-ambush', minAge: 21, maxAge: 55, weight: 7,
    when: (c) => c.enemies.length > 0,
    run: (c) => {
      const enemy = c.enemies[0]!;
      const win = c.attrs.strength + c.attrs.agility + c.skills.size * 3 >= 40;
      if (win) {
        c.enemies.shift();
        bump(c, { reputation: 3 });
        return { text: `${enemy}设下埋伏取你性命,你沉着应战,将其击败,恩怨就此了结。`, flags: ['defeated-enemy'] };
      }
      bump(c, { constitution: -2 }); c.lifespanDelta -= 2;
      return { text: `${enemy}设下埋伏,你寡不敌众,负伤而逃,此仇此恨,你铭记于心。`, flags: [] };
    },
  }),
  ev({
    id: 'ally-reinforce', minAge: 22, maxAge: 55, weight: 6,
    when: (c) => c.allies.length > 0,
    run: (c) => {
      bump(c, { reputation: 2, constitution: 1 });
      return { text: `你遭人围攻,危急时刻,结拜兄弟${c.allies[0]!}率人赶到,里应外合,杀出重围。`, flags: [] };
    },
  }),
  ev({
    id: 'sect-war', minAge: 30, maxAge: 54, weight: 7,
    when: (c) => c.flags.has('sect-leader') || c.flags.has('disciple'),
    run: (c) => {
      const win = c.attrs.strength + c.attrs.wisdom + c.skills.size * 3 >= 55;
      if (win) { bump(c, { reputation: 4 }); return { text: '敌对门派上门挑衅,你挺身而出,技压群雄,为门派赢得赫赫威名。', flags: ['sect-honor'] }; }
      bump(c, { constitution: -2, reputation: -1 }); c.lifespanDelta -= 1;
      return { text: '敌对门派上门挑衅,一场恶战,你虽奋力抵抗,门派还是吃了些亏。', flags: [] };
    },
  }),

  // ==================== 子嗣传承 (25-200) ====================
  ev({
    id: 'child-born', minAge: 25, maxAge: 55, weight: 9,
    when: (c) => !!c.spouse && c.heirs.length < 3,
    run: (c, rng) => {
      const heir = genHeir(rng, c);
      c.heirs.push(heir);
      bump(c, { reputation: 1, luck: 1 });
      return { text: `${c.spouse}为你诞下一${chance(rng, 0.5) ? '子' : '女'},取名${heir.name},你初为人父,喜不自胜,更多了份牵挂。`, flags: ['has-child'] };
    },
  }),
  ev({
    id: 'teach-child', minAge: 35, maxAge: 65, weight: 7,
    when: (c) => c.heirs.some((h) => c.age - h.bornAtAge >= 6 && c.age - h.bornAtAge <= 18),
    run: (c) => {
      const child = c.heirs.find((h) => c.age - h.bornAtAge >= 6 && c.age - h.bornAtAge <= 18)!;
      bump(c, { wisdom: 1 });
      return { text: `你悉心教导${child.name}习武读书,将一身所学倾囊相授,望他日后成器。`, flags: ['child-trained'] };
    },
  }),
  ev({
    id: 'child-grown', minAge: 45, maxAge: 200, weight: 8,
    when: (c) => c.heirs.some((h) => c.age - h.bornAtAge >= 16) && !c.flags.has('child-grown'),
    run: (c) => {
      const child = c.heirs.find((h) => c.age - h.bornAtAge >= 16)!;
      bump(c, { reputation: 3 });
      return { text: `${child.name}已长大成人,文武双全,开始行走江湖,你的衣钵后继有人。`, flags: ['child-grown'] };
    },
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
    return ev({
      id: 'quiet-year', minAge: 0, maxAge: 999, weight: 1,
      run: (c) => {
        bump(c, c.age <= 11 ? { constitution: 1 } : { wisdom: 1 });
        return {
          text: c.age <= 11 ? '你在乡间野地里疯跑玩耍,捉鱼摸虾,无忧无虑地长大了些。' : '这一年波澜不惊,你勤加练功,静待时机。',
          flags: [],
        };
      },
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

  if (ctx.age > 60) {
    const p = (ctx.age - 60) * 0.006 * (1 - mitigation);
    if (chance(rng, p)) {
      return pickOne(rng, ['一场大病,药石无灵', '旧伤复发,撒手人寰', '寿数将尽,无疾而终']);
    }
  }
  if (ctx.age >= 18 && chance(rng, 0.006 * (1 - mitigation))) {
    return pickOne(rng, ['卷入仇杀,横死街头', '遭人暗算,含恨而亡', '渡江遇险,葬身鱼腹']);
  }
  return null;
}

export { clampAttr };
