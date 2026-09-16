export const READ = { settle: 0.35, duration: 7, finish: 0.35, cooldown: 30, weight: 1 } as const;
export type ReadPhase = 'approach' | 'settle' | 'read' | 'finish';
