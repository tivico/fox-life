import type { Character } from './Character';

export function createDebugPanel(host: HTMLElement, resetCamera: () => void) {
  const panel = document.createElement('aside');
  panel.innerHTML = `
    <p class="eyebrow">WEB TECHNICAL SPIKE · 01</p>
    <h1>Fox Life</h1>
    <p>小房間，第一步。</p>
    <details open><summary>Debug</summary>
      <dl>
        <dt>Character State</dt><dd id="state">Idle</dd>
        <dt>Position · X / Z</dt><dd id="position">—</dd>
        <dt>Window hits</dt><dd id="hits">0</dd>
        <dt>Viewport</dt><dd id="viewport">—</dd>
        <dt>Renderer</dt><dd id="renderer-status">Starting</dd>
      </dl>
    </details>
    <button type="button">重設鏡頭</button>
    <p class="hint">拖曳環繞 · 滾輪縮放<br>點擊藍色窗戶，確認命中回饋。<br>角色會自主巡走並短暫停留。</p>
    <p class="scope">Primitive placeholders · Idle / Walk only</p>`;
  host.append(panel);
  const button = panel.querySelector('button')!;
  button.addEventListener('click', resetCamera);
  const state = panel.querySelector('#state')!;
  const position = panel.querySelector('#position')!;
  const hits = panel.querySelector('#hits')!;
  const viewport = panel.querySelector('#viewport')!;
  const status = panel.querySelector('#renderer-status')!;
  return {
    update(character: Character, count: number, width: number, height: number) {
      state.textContent = character.state;
      position.textContent = `${character.root.position.x.toFixed(2)} / ${character.root.position.z.toFixed(2)}`;
      hits.textContent = String(count);
      viewport.textContent = `${width} × ${height}`;
      status.textContent = 'WebGL · rendering';
    },
    dispose() { button.removeEventListener('click', resetCamera); panel.remove(); },
  };
}
