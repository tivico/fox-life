import type { WebGLRenderer } from 'three';

/** Opt-in, single bounded rAF sample for AC-10; absent from the normal UI. */
export function createPerformanceSample(host: HTMLElement, renderer: WebGLRenderer) {
  if (new URLSearchParams(location.search).get('measure') !== '1') return null;
  const output = document.createElement('pre');
  output.id = 'performance-sample';
  output.textContent = '量測暖機 5 秒，接著連續 60 秒。請保持前景並操作窗戶與鏡頭。';
  host.append(output);
  let start: number | null = null;
  let previous: number | null = null;
  let firstFrame = 0;
  let finished = false;
  let interrupted = false;
  const frames: number[] = [];
  const states = new Set<string>();
  return {
    frame(now: number, hidden: boolean, state: string) {
      if (finished) return;
      if (hidden) {
        interrupted = true;
        start = null;
        previous = null;
        frames.length = 0;
        states.clear();
        output.textContent = '背景中：這次取樣作廢，返回後重新暖機與量測。';
        return;
      }
      start ??= now;
      if (now - start < 5000) return;
      if (previous === null) { previous = now; firstFrame = now; return; }
      frames.push(now - previous);
      previous = now;
      states.add(state);
      if (now - firstFrame < 60000) return;
      finished = true;
      const sorted = [...frames].sort((a, b) => a - b);
      const percentile = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
      const elapsedMs = now - firstFrame;
      const gl = renderer.getContext();
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      output.textContent = JSON.stringify({
        tool: 'requestAnimationFrame intervals (not GPU profiler)', timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight],
        devicePixelRatio, renderPixelRatio: renderer.getPixelRatio(),
        drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable',
        warmupMs: 5000, elapsedMs, frames: frames.length, averageFps: frames.length / elapsedMs * 1000,
        frameMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99), max: sorted.at(-1) },
        over33ms: frames.filter(ms => ms > 33.34).length, over50ms: frames.filter(ms => ms > 50).length,
        states: [...states], restartedAfterBackground: interrupted,
      }, null, 2);
    },
    dispose() { output.remove(); },
  };
}
