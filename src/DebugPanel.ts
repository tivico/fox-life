import type { Character } from './Character.ts';

export function createDebugPanel(host: HTMLElement, resetCamera: () => void) {
  const panel = document.createElement('aside');
  panel.innerHTML = `
    <p class="eyebrow">A LITTLE HOME · EAT</p>
    <h1>Fox Life</h1>
    <p class="intro">陪牠，看一會窗外。</p>
    <button id="debug-toggle" type="button" aria-expanded="false" aria-controls="debug-data">顯示 Debug</button>
    <dl id="debug-data" hidden>
      <dt>Current State</dt><dd id="state">—</dd>
      <dt>Current Action</dt><dd id="action">—</dd>
      <dt>Current Target</dt><dd id="target">—</dd>
      <dt>Control Source</dt><dd id="source">—</dd>
      <dt>Idle variation</dt><dd id="variation">—</dd>
      <dt>Observe seconds</dt><dd id="observe-time">—</dd>
      <dt>Position · X / Z</dt><dd id="position">—</dd>
      <dt>Window hits</dt><dd id="hits">0</dd>
      <dt>Bed hits</dt><dd id="bed-hits">0</dd>
      <dt>Sleep phase / seconds</dt><dd id="sleep-phase">—</dd>
      <dt>Sleep cooldown</dt><dd id="sleep-cooldown">0</dd>
      <dt>Bookshelf hits</dt><dd id="read-hits">0</dd>
      <dt>Read phase / seconds</dt><dd id="read-phase">—</dd>
      <dt>Read cooldown</dt><dd id="read-cooldown">0</dd>
      <dt>Food hits</dt><dd id="eat-hits">0</dd>
      <dt>Eat phase / seconds</dt><dd id="eat-phase">—</dd>
      <dt>Eat cooldown</dt><dd id="eat-cooldown">0</dd>
      <dt>Viewport</dt><dd id="viewport">—</dd>
      <dt>Renderer</dt><dd id="renderer-status">Starting</dd>
    </dl>
    <button id="reset-camera" type="button">重設鏡頭</button>
    <p class="hint">拖曳環繞 · 滾輪縮放<br>點窗看風景，點床休息，點書架讀一會，點餐碗吃點心。</p>`;
  host.append(panel);
  const reset = panel.querySelector<HTMLButtonElement>('#reset-camera')!;
  const toggle = panel.querySelector<HTMLButtonElement>('#debug-toggle')!;
  const data = panel.querySelector<HTMLElement>('#debug-data')!;
  const toggleDebug = () => {
    data.hidden = !data.hidden;
    toggle.setAttribute('aria-expanded', String(!data.hidden));
    toggle.textContent = data.hidden ? '顯示 Debug' : '隱藏 Debug';
  };
  reset.addEventListener('click', resetCamera);
  toggle.addEventListener('click', toggleDebug);
  const fields = new Map([...data.querySelectorAll('dd')].map(node => [node.id, node]));
  const set = (id: string, value: string) => {
    const node = fields.get(id)!;
    if (node.textContent !== value) node.textContent = value;
  };
  return {
    update(character: Character, count: number, width: number, height: number, bedHits = 0, readHits = 0, eatHits = 0) {
      const target = character.target;
      set('state', character.state);
      set('action', character.action);
      set('target', target ? `${character.targetLabel} (${target.x.toFixed(2)}, ${target.z.toFixed(2)})` : 'None');
      set('source', character.source);
      set('variation', character.state === 'Idle' ? character.idleVariation : '—');
      set('observe-time', character.state === 'Observe' ? `${character.observeElapsed.toFixed(2)} / 4.00` : '—');
      set('position', `${character.root.position.x.toFixed(2)} / ${character.root.position.z.toFixed(2)}`);
      set('hits', String(count));
      set('bed-hits', String(bedHits));
      set('sleep-phase', character.sleepPhase ? `${character.sleepPhase} / ${character.sleepElapsed.toFixed(2)}` : '—');
      set('sleep-cooldown', character.sleepCooldownRemaining.toFixed(1));
      set('read-hits', String(readHits));
      set('read-phase', character.readPhase ? `${character.readPhase} / ${character.readElapsed.toFixed(2)}` : '—');
      set('read-cooldown', character.readCooldownRemaining.toFixed(1));
      set('eat-hits', String(eatHits));
      set('eat-phase', character.eatPhase ? `${character.eatPhase} / ${character.eatElapsed.toFixed(2)}` : '—');
      set('eat-cooldown', character.eatCooldownRemaining.toFixed(1));
      set('viewport', `${width} × ${height}`);
      set('renderer-status', 'WebGL · rendering');
    },
    dispose() {
      reset.removeEventListener('click', resetCamera);
      toggle.removeEventListener('click', toggleDebug);
      panel.remove();
    },
  };
}
