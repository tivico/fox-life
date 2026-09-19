// Each eligible life action occupies one chooser slot; no unused weight setting.
export const EAT = { settle: 0.40, duration: 6, finish: 0.35, cooldown: 30 } as const;
export type EatPhase = 'approach' | 'settle' | 'eat' | 'finish';
