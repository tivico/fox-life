import type { Character } from './Character.ts';
import { SLEEP } from './sleep.ts';
import { READ } from './read.ts';
import { EAT } from './eat.ts';
import { DAILY } from './daily.ts';

export type LifeAction = 'Window' | 'Bed' | 'Bookshelf' | 'Food' | 'Clean' | 'Play';
export type MomentKind = LifeAction | 'Doze' | 'Stretch';
export type LifeSnapshot = Pick<Character, 'state' | 'action' | 'source' | 'targetLabel' |
  'sleepPhase' | 'sleepElapsed' | 'readPhase' | 'readElapsed' | 'eatPhase' | 'eatElapsed' | 'observeElapsed' |
  'activityKind' | 'activityPhase' | 'activityElapsed' | 'microEvent'>;

export const actionLabels: Record<LifeAction, string> = {
  Window: '看風景', Bed: '睡個覺', Bookshelf: '讀本書', Food: '吃點心',
  Clean: '掃掃地', Play: '玩毛線',
};
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
};

export function lifePresentation(fox: LifeSnapshot) {
  const target = fox.targetLabel === 'DiningArea' ? 'Food' : fox.targetLabel;
  const active = target && target in actionLabels ? target as LifeAction : null;
  let progress: number | null = null;
  if (fox.state === 'Observe') progress = fox.observeElapsed / 4;
  else if (fox.sleepPhase === 'sleep') progress = fox.sleepElapsed / SLEEP.duration;
  else if (fox.readPhase === 'read') progress = fox.readElapsed / READ.duration;
  else if (fox.eatPhase === 'eat') progress = fox.eatElapsed / EAT.duration;
  else if (fox.activityKind && fox.activityPhase === 'active') progress = fox.activityElapsed / DAILY[fox.activityKind].duration;
  return {
    title: descriptions[fox.action] ?? '在家裡慢慢生活', active,
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
};
export const JOURNAL_KEY = 'fox-life.moments.v1';
export const JOURNAL_LIMIT = 40;

// Store observed moments only; no invented history or background simulation.
export class LifeJournal {
  readonly entries: LifeMoment[];
  private previous: LifeAction | null = null;
  private previousMicro: 'Doze' | 'Stretch' | null = null;
  constructor(saved: unknown = []) {
    this.entries = Array.isArray(saved) ? saved.filter((item): item is LifeMoment =>
      item !== null && typeof item === 'object' && typeof item.kind === 'string' && Object.hasOwn(momentText, item.kind) &&
      typeof item.at === 'number' && Number.isFinite(item.at) && item.at > 0 && item.at <= 8.64e15 &&
      (item.source === 'player' || item.source === 'autonomous')).slice(0, JOURNAL_LIMIT)
      .map(({ kind, at, source }) => ({ kind, at, source })) : [];
  }
  observe(fox: LifeSnapshot, now = Date.now()): boolean {
    const kind = fox.state === 'Observe' ? 'Window' : fox.sleepPhase === 'sleep' ? 'Bed' :
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
