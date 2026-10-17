import { AUDIO_KEY, HomeAudio } from './HomeAudio.ts';

export function createSoundPanel(host: HTMLElement, audio: HomeAudio) {
  const tools = host.querySelector('.home-tools')!;
  const button = document.createElement('button'); button.type = 'button';
  button.className = 'sound-tool'; button.setAttribute('aria-label', '小屋聲音'); button.title = '小屋聲音';
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3Z"/><path class="sound-waves" d="M16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/><path class="sound-slash" d="m16 9 5 6m0-6-5 6"/></svg>';
  tools.insertBefore(button, tools.lastElementChild);
  const dialog = document.createElement('dialog'); dialog.className = 'home-dialog sound-dialog';
  dialog.setAttribute('aria-labelledby', 'sound-title');
  dialog.innerHTML = `<button class="dialog-close" type="button" aria-label="關閉聲音設定">×</button>
    <p class="eyebrow">SOUNDS OF A LITTLE HOME</p><h2 id="sound-title">聽見小屋的日常。</h2>
    <p>窗外的風與偶爾的鳥鳴，還有腳下、書頁間的小小聲響。</p>
    <button type="button" class="primary-button sound-toggle" aria-pressed="false">開啟聲音</button>
    <p class="sound-status" role="status">由你決定，什麼時候讓聲音進來。</p>
    <label class="sound-level">環境音 <output>65%</output><input name="ambience" type="range" min="0" max="100" step="1" aria-label="環境音音量"></label>
    <label class="sound-level">動作音效 <output>70%</output><input name="effects" type="range" min="0" max="100" step="1" aria-label="動作音效音量"></label>
    <button class="sound-preview" type="button">試聽翻頁聲</button>
    <p class="help-note">聲音設定會保存在這個瀏覽器。切到其他分頁時，聲音也會一起休息。</p>`;
  host.querySelector('.life-ui')!.append(dialog);
  const toggle = dialog.querySelector<HTMLButtonElement>('.sound-toggle')!;
  const status = dialog.querySelector<HTMLElement>('.sound-status')!;
  const preview = dialog.querySelector<HTMLButtonElement>('.sound-preview')!;
  const sliders = [...dialog.querySelectorAll<HTMLInputElement>('input')];
  let failed = false, busy = false;
  const save = () => { try { localStorage.setItem(AUDIO_KEY, JSON.stringify(audio.preferences)); } catch { /* Playback works without storage. */ } };
  function update() {
    const active = audio.running;
    const audioState = active ? 'on' : 'off';
    if (button.dataset.audioState !== audioState) {
      button.dataset.audioState = audioState; button.setAttribute('aria-description', active ? '聲音已開啟' : '聲音尚未開啟');
    }
    const label = busy ? '正在開啟…' : active ? '關閉聲音' : '開啟聲音';
    if (toggle.textContent !== label) toggle.textContent = label;
    if (toggle.disabled !== busy) toggle.disabled = busy;
    if (toggle.getAttribute('aria-pressed') !== String(active)) toggle.setAttribute('aria-pressed', String(active));
    preview.disabled = !active || audio.preferences.effects === 0;
    const text = failed ? '暫時無法播放，請再按一次開啟聲音。' : active ? '風聲、鳥鳴與動作音效，正在陪伴小屋。' : '由你決定，什麼時候讓聲音進來。';
    if (status.textContent !== text) status.textContent = text;
    for (const input of sliders) {
      const value = Math.round(audio.preferences[input.name as 'ambience' | 'effects'] * 100);
      if (input.value !== String(value)) input.value = String(value);
      if (input.previousElementSibling!.textContent !== `${value}%`) input.previousElementSibling!.textContent = `${value}%`;
    }
  }
  const open = () => { update(); dialog.showModal(); };
  const close = () => dialog.close();
  const audition = () => audio.preview();
  const switchSound = async () => {
    if (busy) return;
    if (audio.running) { audio.mute(); failed = false; }
    else { busy = true; update(); failed = !await audio.enable(); busy = false; }
    save(); update();
  };
  const change = (event: Event) => {
    const input = event.target as HTMLInputElement;
    audio.setVolume(input.name as 'ambience' | 'effects', Number(input.value) / 100); save(); update();
  };
  button.addEventListener('click', open);
  dialog.querySelector('.dialog-close')!.addEventListener('click', close);
  toggle.addEventListener('click', switchSound);
  preview.addEventListener('click', audition);
  sliders.forEach(input => input.addEventListener('input', change)); update();
  return { update, dispose() {
    button.removeEventListener('click', open); toggle.removeEventListener('click', switchSound);
    preview.removeEventListener('click', audition);
    sliders.forEach(input => input.removeEventListener('input', change)); dialog.close(); button.remove(); dialog.remove();
  } };
}
