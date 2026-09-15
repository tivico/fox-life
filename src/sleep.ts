/** Sleep-only timing and pose contract; no registry or future action configuration. */
export const SLEEP = { settle: 0.65, duration: 8, wake: 0.75, cooldown: 45, walkWeight: 3, weight: 1 } as const;
export type SleepPhase = 'approach' | 'settle' | 'sleep' | 'wake';
