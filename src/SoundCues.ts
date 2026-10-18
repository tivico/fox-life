import type { Character } from './Character.ts';
import type { SoundKind } from './soundDesign.ts';
import { YARN_TAPS } from './YarnChoreography.ts';

export type SoundSnapshot = Pick<Character, 'root' | 'state' | 'sleepPhase' | 'sleepElapsed' | 'readPhase' |
  'readElapsed' | 'eatPhase' | 'eatElapsed' | 'activityKind' | 'activityPhase' | 'activityElapsed'> & Partial<Pick<Character, 'livingActivity'>>;

/** Follow actual movement and action clocks. Invitations and frame rate never trigger extra sounds. */
export class SoundCues {
  private previous: { x: number; z: number; key: string; elapsed: number; page: number } | null = null;
  private distance = 0;
  update(fox: SoundSnapshot, dt: number): SoundKind[] {
    if (!Number.isFinite(dt) || dt <= 0) return [];
    const living = fox.livingActivity;
    const key = living ? `${living.kind}/${living.phase}` : fox.sleepPhase ? `sleep/${fox.sleepPhase}` : fox.readPhase ? `read/${fox.readPhase}` :
      fox.eatPhase ? `eat/${fox.eatPhase}` : fox.activityKind ? `${fox.activityKind}/${fox.activityPhase}` : fox.state;
    const elapsed = living ? living.elapsed : fox.sleepPhase ? fox.sleepElapsed : fox.readPhase ? fox.readElapsed :
      fox.eatPhase ? fox.eatElapsed : fox.activityElapsed;
    const page = fox.root.getObjectByName('ReadingPage')?.rotation.z ?? 0;
    const current = { x: fox.root.position.x, z: fox.root.position.z, key, elapsed, page };
    const previous = this.previous;
    this.previous = current;
    if (!previous) return [];
    const cues: SoundKind[] = [];
    const movement = Math.hypot(current.x - previous.x, current.z - previous.z);
    if (fox.state === 'Walk' && movement <= .06) {
      this.distance += movement;
      if (this.distance >= Math.PI / 14.5) {
        this.distance %= Math.PI / 14.5;
        const onRug = Math.abs(current.x) < 1.85 && current.z > -1.1 && current.z < 1.8 ||
          Math.abs(current.x) < 2.35 && current.z > 4.4 && current.z < 8.2;
        cues.push(onRug ? 'step-rug' : 'step-wood');
      }
    } else this.distance = 0;
    const changed = previous.key !== key;
    const from = changed ? -1e-6 : previous.elapsed;
    const crossed = (time: number) => from < time && elapsed >= time;
    // Do not replay past cues after seeking or enabling audio halfway through a task.
    if (elapsed < from) return cues;
    // A dozing reader holds the page still. Follow visible page motion after waking,
    // rather than playing a rustle at the nominal 3-second page-turn timestamp.
    if (key === 'read/read' && !changed && previous.page <= .01 && page > .01) cues.push('page');
    if (key === 'eat/eat') for (const start of [.90, 2.70, 4.95]) if (crossed(start)) cues.push('crunch');
    if (key === 'Clean/active') for (const start of [.5, 3, 5.7]) if (crossed(start)) cues.push('sweep');
    if (key === 'Play/active') for (const start of YARN_TAPS) if (crossed(start)) cues.push('yarn');
    if (changed && (key === 'sleep/settle' || key === 'sleep/wake' || key === 'Stretch/active')) cues.push('cloth');
    if (key === 'WatchTV/active' && crossed(.25)) cues.push('remote');
    if (key === 'WatchTV/finish' && living!.motionTime >= .25 && crossed(.25)) cues.push('remote');
    if (key === 'Tea/putdown' && crossed(.96)) cues.push('cup');
    if (key === 'Tea/active') for (const time of [1.5, 4.7, 7.5]) if (crossed(time)) cues.push('sip');
    if (key === 'TidySofa/active') for (const time of [.6, 2.2, 3.8, 6.1]) if (crossed(time)) cues.push('cloth');
    if (key === 'Music/active') for (const time of [.1, 3.1, 6.1, 9.1]) if (crossed(time)) cues.push('radio');
    return cues;
  }
  reset() { this.previous = null; this.distance = 0; }
}
