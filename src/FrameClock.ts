/** Only foreground deltas reach simulation. Reset on BOTH visibility edges. */
export class FrameClock {
  private previous: number | null = null;
  reset() { this.previous = null; }
  tick(now: number, hidden: boolean) {
    if (hidden) { this.reset(); return 0; }
    const dt = this.previous === null ? 0 : Math.max(0, (now - this.previous) / 1000);
    this.previous = now;
    return Math.min(dt, 0.05);
  }
}
