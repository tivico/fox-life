export type DailyKind = 'Clean' | 'Play' | 'Stretch';
export type DailyPhase = 'approach' | 'settle' | 'carry' | 'active' | 'return' | 'finish';
export type CleanMode = 'pickup' | 'carry' | 'sweep' | 'stow';
export const CLEAN_STORAGE = {
  position: [-2.45, 0, 2.5], tool: [-2.09, 0, 2.7], heading: 0,
} as const;
export const DAILY = {
  settle: .4, finish: .45,
  Clean: { duration: 8.8, cooldown: 48, settle: .95, finish: .85 },
  Play: { duration: 7.6, cooldown: 38 },
  Stretch: { duration: 2.3, cooldown: 0 },
} as const;
