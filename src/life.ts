import type { Character } from './Character.ts';
import { SLEEP } from './sleep.ts';
import { READ } from './read.ts';
import { EAT } from './eat.ts';
import { DAILY } from './daily.ts';
import { livingActions, livingLabels, livingDurations, type LivingAction } from './LivingActivity.ts';
import { roomAt } from './HomeNavigation.ts';

export type LifeAction = 'Window' | 'Bed' | 'Bookshelf' | 'Food' | 'Clean' | 'Play' | LivingAction;
export type MomentKind = LifeAction | 'Doze' | 'Stretch' | 'Bedroom' | 'LivingRoom';
export type LifeSnapshot = Pick<Character, 'state' | 'action' | 'source' | 'targetLabel' |
  'sleepPhase' | 'sleepElapsed' | 'readPhase' | 'readElapsed' | 'eatPhase' | 'eatElapsed' | 'observeElapsed' |
  'activityKind' | 'activityPhase' | 'activityElapsed' | 'microEvent' | 'livingActivity'>;

export const actionLabels: Record<LifeAction, string> = {
  Window: '看風景', Bed: '睡個覺', Bookshelf: '讀本書', Food: '吃點心',
  Clean: '掃掃地', Play: '玩毛線',
  ...livingLabels,
};
export function roomActions(fox: Pick<Character, 'root'>): LifeAction[] {
  return roomAt(fox.root.position) === 'LivingRoom' ? [...livingActions] : ['Window', 'Bed', 'Bookshelf', 'Food', 'Clean'];
}
const descriptions: Record<string, string> = {
  'Autonomous idle': '慢慢呼吸，放空一下', 'Autonomous walk': '在家裡隨意走走',
  'Walk to window': '走到窗邊，看看外面的世界', 'Observe environment': '窗外的風景，值得多看一會',
  'Walk to bed': '準備回到柔軟的床邊', 'Settle into bed': '找個舒服的位置躺下',
  'Sleeping': '安安靜靜地做個小夢', 'Waking up': '伸伸懶腰，慢慢醒來',
  'Waking up for window': '睡醒了，準備去看看窗外', 'Waking up for reading': '睡醒了，準備翻開一本書',
  'Walk to reading area': '去書架找一本喜歡的書', 'Opening book': '翻開書，故事就要開始了',
  'Reading': '把自己藏進一個小故事裡', 'Putting book away': '收好書，留一點故事給下次',
  'Walk to dining area': '走向餐桌，點心時間到了', 'Smelling food': '先聞一聞，今天有什麼好吃的',
  'Eating': '一口一口，享受小小的點心', 'Finishing meal': '吃好了，整理一下再出發',
  'Walk to clean': '去地毯邊，把小家掃一掃', 'Getting broom': '拿好小掃帚，開始整理',
  'Walk to broom': '先去床邊拿掃帚', 'Carry broom to rug': '拿著掃帚，走到要整理的地方',
  'Return broom': '掃好了，把掃帚拿回原位', 'Putting broom back': '放穩掃帚，再慢慢鬆開手',
  'Sweeping': '左掃掃、右掃掃，小家又舒服了', 'Walk to play': '去找毛線球，玩一會吧',
  'Getting yarn': '撥一下毛線球，看看它往哪裡滾', 'Playing with yarn': '追著毛線球，自己也玩得很開心',
  'Putting activity away': '把東西收好，再繼續小日常', 'Dozing over book': '故事讀到一半，眼皮開始變重了…',
  'Preparing stretch': '站穩腳步，準備舒展一下', 'Stretching': '手伸高高，舒服地伸個懶腰',
  'Finishing stretch': '伸完懶腰，精神又回來了',
  'Walk to Bedroom': '穿過門口，回臥室待一會', 'Visit Bedroom': '回到臥室，享受安靜的小角落',
  'Walk to LivingRoom': '穿過門口，去客廳看看', 'Visit LivingRoom': '在客廳停下來，慢慢看看自己的小家',
};

export function lifePresentation(fox: LifeSnapshot) {
  const target = fox.targetLabel === 'DiningArea' ? 'Food' : fox.targetLabel;
  const active = target && target in actionLabels ? target as LifeAction : null;
  let progress: number | null = null;
  if (fox.livingActivity?.phase === 'active') progress = fox.livingActivity.elapsed / livingDurations[fox.livingActivity.kind];
  else if (fox.state === 'Observe') progress = fox.observeElapsed / 4;
  else if (fox.sleepPhase === 'sleep') progress = fox.sleepElapsed / SLEEP.duration;
  else if (fox.readPhase === 'read') progress = fox.readElapsed / READ.duration;
  else if (fox.eatPhase === 'eat') progress = fox.eatElapsed / EAT.duration;
  else if (fox.activityKind && fox.activityPhase === 'active') progress = fox.activityElapsed / DAILY[fox.activityKind].duration;
  const living = fox.livingActivity;
  const title = living ? living.phase === 'approach' ? `去客廳${livingLabels[living.kind]}`
    : living.phase === 'pickup' ? '從電視櫃拿起杯子，準備坐下喝茶'
    : living.phase === 'carry' ? '拿好茶杯，走到沙發邊'
    : living.phase === 'return' ? '拿著杯子，慢慢走回電視櫃'
    : living.phase === 'putdown' ? '把茶杯輕輕放回杯碟'
    : living.phase === 'finish' ? living.kind === 'Exercise' ? '運動完，慢慢放鬆下來' : '收好手邊的小物，準備繼續生活'
    : living.phase === 'settle' ? living.kind === 'Exercise' ? '站穩腳步，準備活動身體' : living.kind === 'TidySofa' ? '走近沙發，準備整理抱枕' : '慢慢坐好，找個舒服的位置'
    : { WatchTV: '拿著遙控器，專心看一段小節目', SofaRest: '靠著沙發，舒服地放空一下', Tea: '吹一吹熱茶，再慢慢喝一口',
      Exercise: '抬抬手、伸展身體，再原地踏踏步', Music: '跟著音樂輕輕搖擺，享受自己的時間', TidySofa: '拍鬆抱枕，把毯子整理好' }[living.kind] : descriptions[fox.action] ?? '在家裡慢慢生活';
  return {
    title, active,
    source: fox.source === 'Player Command' ? '回應你的邀請' : '自己的小日常',
    locked: fox.source === 'Player Command',
    progress: progress === null ? null : Math.round(Math.max(0, Math.min(1, progress)) * 100),
  };
}

export interface LifeMoment { kind: MomentKind; at: number; source: 'player' | 'autonomous' }
export const momentText: Record<MomentKind, string> = {
  Window: '在窗前停下來，看了一會風景。', Bed: '窩進柔軟的床，開始做一個小夢。',
  Bookshelf: '翻開一本書，走進新的故事。', Food: '到了點心時間，慢慢享受每一口。',
  Clean: '拿起小掃帚，仔仔細細地整理地毯。', Play: '發現一團毛線球，開心地撥來撥去。',
  Doze: '書還捧在手上，卻讀著讀著打起瞌睡。', Stretch: '停下腳步，舒舒服服地伸了個懶腰。',
  Bedroom: '回到臥室，在熟悉的小角落停留了一會。', LivingRoom: '走進客廳，享受家裡另一個舒服的角落。',
  WatchTV: '窩在沙發上，看了一段自己喜歡的小節目。', SofaRest: '靠著柔軟的沙發，什麼也不趕地休息了一會。',
  Tea: '拿起茶杯，坐下來慢慢享受一杯熱茶。', Exercise: '抬手伸展、側彎身體，再精神地原地踏步。',
  Music: '聽著小音響的旋律，跟著節奏輕輕晃動。', TidySofa: '拍鬆抱枕、整理毯子，讓沙發又舒服了。',
};
export const JOURNAL_KEY = 'fox-life.moments.v1';
export const JOURNAL_LIMIT = 40;

// Store observed moments only; no invented history or background simulation.
export class LifeJournal {
  readonly entries: LifeMoment[];
  private previous: MomentKind | null = null;
  private previousMicro: 'Doze' | 'Stretch' | null = null;
  constructor(saved: unknown = []) {
    this.entries = Array.isArray(saved) ? saved.filter((item): item is LifeMoment =>
      item !== null && typeof item === 'object' && typeof item.kind === 'string' && Object.hasOwn(momentText, item.kind) &&
      typeof item.at === 'number' && Number.isFinite(item.at) && item.at > 0 && item.at <= 8.64e15 &&
      (item.source === 'player' || item.source === 'autonomous')).slice(0, JOURNAL_LIMIT)
      .map(({ kind, at, source }) => ({ kind, at, source })) : [];
  }
  observe(fox: LifeSnapshot, now = Date.now()): boolean {
    const kind = fox.livingActivity?.phase === 'active' ? fox.livingActivity.kind : fox.state === 'Observe' ? (fox.targetLabel === 'Bedroom' || fox.targetLabel === 'LivingRoom' ? fox.targetLabel : 'Window') : fox.sleepPhase === 'sleep' ? 'Bed' :
      fox.readPhase === 'read' ? 'Bookshelf' : fox.eatPhase === 'eat' ? 'Food' :
      fox.activityPhase === 'active' && fox.activityKind !== 'Stretch' ? fox.activityKind : null;
    const changed = kind !== null && kind !== this.previous;
    this.previous = kind;
    const microChanged = fox.microEvent !== null && fox.microEvent !== this.previousMicro;
    this.previousMicro = fox.microEvent;
    if (!changed && !microChanged) return false;
    const source = fox.source === 'Player Command' ? 'player' : 'autonomous';
    if (changed) this.entries.unshift({ kind: kind!, at: now, source });
    if (microChanged) this.entries.unshift({ kind: fox.microEvent!, at: now, source });
    this.entries.length = Math.min(this.entries.length, JOURNAL_LIMIT);
    return true;
  }
}
