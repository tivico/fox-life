import type { Character } from './Character.ts';
import { actionLabels, roomActions, JOURNAL_KEY, LifeJournal, lifePresentation, momentText, type LifeAction } from './life.ts';
import { homeRooms, roomAt } from './HomeNavigation.ts';
import { petFeedback, type PetReaction } from './pet.ts';
import { isPairAction, pairActions, pairLabels, type PairAction, type PairInvite } from './Pair.ts';

const drawings = {
  Kitchen: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18M7 5h1m4 0h1m4 0h1M6 11h12v7H6z"/>',
  ChopVegetables: '<path d="M3 20h18M6 17l9-12 5 4-9 8H6Zm9-12 2-3 5 4-2 3M5 11c-4-4-3-7 1-6l3 3"/>',
  CookSoup: '<path d="M4 10h16v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-6ZM1 12h3m16 0h3M7 2c-2 2 2 3 0 5m5-5c-2 2 2 3 0 5m5-5c-2 2 2 3 0 5"/>',
  BakeCookies: '<circle cx="12" cy="12" r="9"/><path d="M7 8h.01M14 6h.01M17 12h.01M10 13h.01M7 17h.01M14 18h.01" stroke-width="3"/>',
  Window: '<rect x="4" y="3" width="16" height="17" rx="2"/><path d="M12 3v17M4 11h16M2 21h20"/>',
  Bed: '<path d="M3 18V9m18 9V9M3 14h18v4H3m0-7V5h18v6M6 11V8h5v3m2 0V8h5v3"/>',
  Bookshelf: '<path d="M12 6c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1v15M5 9h4m-4 4h4m6-4h4m-4 4h4"/>',
  Food: '<path d="M3 12h18c0 6-3 9-9 9s-9-3-9-9ZM6 3c-3 3 3 3 0 6m6-6c-3 3 3 3 0 6m6-6c-3 3 3 3 0 6"/>',
  Clean: '<path d="m16 3-5 11m-4-2 8 4-4 6-9-4 5-6Zm-1 3-2 4m5-3-2 4m5-2-2 3"/>',
  Play: '<circle cx="12" cy="12" r="9"/><path d="M5 6c8 1 10 6 12 12M3 11c6-1 9 3 11 10M10 3c1 6 5 9 11 10M7 19c0-6 5-10 12-11"/>',
  WatchTV: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-2-13 5 3-5 3V8Z"/>',
  SofaRest: '<path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5M2 10h4v7h12v-7h4v10H2V10Zm2 10v2m16-2v2"/>',
  Tea: '<path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 1h3a3 3 0 0 1 0 6h-3M2 22h18M7 2v3m5-3v3"/>',
  Exercise: '<circle cx="12" cy="5" r="3"/><path d="m3 7 5 5h8l5-5m-9 5v5m-5 5 5-5 5 5"/>',
  Music: '<path d="M9 18V5l12-3v13M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="18" cy="15" rx="3" ry="3"/>',
  TidySofa: '<rect x="3" y="8" width="15" height="13" rx="3"/><path d="m16 2 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM7 12l7 5m-7 0 7-5"/>',
  WaterPlants: '<path d="M4 10h10v10H4V10Zm10 2 5-5 3 3-8 7M5 10V7a3 3 0 0 1 6 0v3M3 13H1v4h3"/>',
  WatchButterflies: '<path d="M12 9C6-2 0 4 5 11c-6 6 1 12 7 3 6 9 13 3 7-3 5-7-1-13-7-2Zm0 0v9m0-9-3-5m3 5 3-5"/>',
  GardenRest: '<path d="M3 13h18v4H3v-4Zm2-7h14v7H5V6Zm0 11v4m14-4v4M8 3l2-2m6 2 2-2"/>',
  Balcony: '<path d="M3 21h18M5 21V11h14v10M5 15h14M9 11v10m6-10v10M12 9V4m0 3C7 7 6 4 7 2c4 0 5 3 5 5Zm0 0c5 0 6-3 5-5-4 0-5 3-5 5Z"/>',
  Doze: '<path d="M3 13h8l-8 8h8m3-18h7l-7 7h7"/>',
  Boop: '<circle cx="6.5" cy="14" r="4.5"/><circle cx="17.5" cy="14" r="4.5"/><path d="M3.5 10.5 3 5l4 3m13.5 2.5L21 5l-4 3M11 14h2"/>',
  GazeTogether: '<rect x="4" y="2" width="16" height="11" rx="2"/><path d="M12 2v11M4 7.5h16"/><circle cx="8.5" cy="19" r="2.5"/><circle cx="15.5" cy="19" r="2.5"/>',
  Pet: '<circle cx="12" cy="16" r="4"/><circle cx="5.5" cy="11" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="11" r="2"/>',
  PetShy: '<circle cx="12" cy="16" r="4"/><circle cx="5.5" cy="11" r="2"/><circle cx="9.5" cy="6" r="2"/><circle cx="14.5" cy="6" r="2"/><circle cx="18.5" cy="11" r="2"/><path d="M20 18c-2 2-4 3-8 3"/>',
  Stretch: '<circle cx="12" cy="7" r="3"/><path d="m3 3 5 10h8l5-10m-9 10v8m-4 0 4-4 4 4"/>',
  Bedroom: '<path d="M3 11 12 3l9 8v10H3V11Zm5 10v-8h8v8"/>',
  LivingRoom: '<path d="M4 12V7h16v5M2 11h4v6h12v-6h4v9H2v-9Zm2 9v2m16-2v2"/>',
  leaf: '<path d="M5 20C3 10 8 3 21 3c0 12-6 18-14 14m-3 4L16 9"/>',
  reset: '<path d="M4 9a8 8 0 1 1 0 7M4 3v6h6"/>',
  journal: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18m4-12h5m-5 4h5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
function icon(name: keyof typeof drawings) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[name]}</svg>`;
}

export function createLifePanel(host: HTMLElement, foxes: { active: () => Character; all: readonly Character[] },
  request: (action: LifeAction) => void, resetCamera: () => void, viewChanged: () => void) {
  // The panel talks to the active fox; names appear only once there is more than one fox.
  const fox = () => foxes.active();
  const primary = foxes.all[0]!;
  const named = foxes.all.length > 1;
  const label = (who: Character) => who.name ?? '狐狸';
  let saved: unknown = [];
  let storageAvailable = true;
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    try { saved = JSON.parse(raw ?? '[]'); } catch { /* A damaged record starts a fresh diary. */ }
  } catch { storageAvailable = false; }
  const journal = new LifeJournal(saved);
  const ui = document.createElement('div');
  ui.className = 'life-ui';
  ui.innerHTML = `
    <header class="home-header">
      <div class="brand"><span class="brand-mark">${icon('leaf')}</span><div><h1>Fox Life<span>小狐狸的慢日子</span></h1><p>A LITTLE HOME, A LITTLE LIFE.</p></div></div>
      <nav class="home-tools" aria-label="小屋工具">
        <button type="button" data-tool="journal">${icon('journal')}<span>生活日記</span><span class="moment-count">${journal.entries.length}</span></button>
        <button type="button" data-tool="help" aria-label="怎麼玩">${icon('help')}</button>
      </nav>
    </header>
    <div class="room-caption"><span></span> ${primary.kitchenEnabled ? '有花香，也有飯香的小家' : primary.gardenEnabled ? '有花園的小日子' : '兩間房的小日子'} <i>／</i> 自在生活中</div>
    <div class="view-tools"><button type="button" data-tool="reset" aria-label="重設視角" title="重設鏡頭">${icon('reset')}<span>重設視角</span></button><button type="button" data-tool="quiet" aria-label="靜靜陪伴">${icon('leaf')}<span>靜靜陪伴</span></button></div>
    <footer class="life-footer">
      <section class="fox-status" aria-label="狐狸近況"><span class="status-symbol">${icon('leaf')}</span><div><p class="status-source">自己的小日常</p><p class="status-title" role="status">慢慢呼吸，放空一下</p></div><progress class="action-progress" max="100" value="0" aria-label="目前生活片段進度" hidden></progress></section>
      <div class="invitation"><span class="dock-room-label">臥室日常</span>${named
        ? `<div class="pair-actions" role="group" aria-label="兩隻一起"><span class="pair-with"></span>${pairActions.map(kind =>
          `<button type="button" data-pair="${kind}" aria-pressed="false">${icon(kind)}<span>${pairLabels[kind]}</span></button>`).join('')}</div>`
        : '<p>也可以什麼都不做，讓日常自己發生。</p>'}</div>
      <nav class="action-dock" aria-label="邀請狐狸做點什麼"></nav>
      <p class="control-hint">拖曳轉動小屋 <span>·</span> 滾輪拉近 <span>·</span> 點家具邀請牠 <span>·</span> 點狐狸摸摸頭</p>
    </footer>
    <p class="feedback" role="status" hidden></p>
    <button class="quiet-exit" type="button" hidden>${icon('leaf')} 回到小屋介面 <kbd>Esc</kbd></button>
    <dialog class="home-dialog" data-dialog="help" aria-labelledby="help-title">
      <button class="dialog-close" type="button" aria-label="關閉玩法說明">${icon('close')}</button>
      <p class="eyebrow">MAKE YOURSELF AT HOME</p><h2 id="help-title">歡迎來到牠的小小世界。</h2>
      <p>不用趕路，也沒有待辦清單。留一點時間，看看小狐狸怎麼過日子。</p>
      <ol class="help-steps"><li><b>先看一會</b><span>臥室裡可以睡覺、閱讀與吃點心；到了客廳，牠會看電視、窩沙發、喝茶、做運動、聽音樂或整理沙發。${primary.gardenEnabled ? '陽台可以澆花、看蝴蝶，或坐在長椅吹風。' : ''}${primary.kitchenEnabled ? '廚房可以切菜、煮湯和烤餅乾。' : ''}</span></li><li><b>送一個小邀請</b><span>下方依狐狸實際所在房間顯示專屬動作，也能直接點家具${primary.gardenEnabled ? '、花圃或長椅' : ''}。房間面板的前往按鈕可以邀請牠到另一個空間。直接點狐狸，可以摸摸牠的頭；牠會依當下在做的事給你一點回應。${named ? `點房間面板上的${foxes.all.map(label).join('或')}，就換成陪牠，鏡頭也偏向牠；動作欄旁可以邀請兩隻${pairActions.map(kind => `「${pairLabels[kind]}」`).join('或')}。` : ''}</span></li><li><b>留住生活片段</b><span>實際發生的日常會寫進「生活日記」，下次回來還能翻閱。</span></li></ol>
      <p class="help-note">預設鏡頭跟隨狐狸；手動選房間只改視角，動作欄仍跟隨狐狸的位置。<br>拖曳環繞 · 滾輪縮放 · 數字鍵對應當前動作欄<br>一次完成一個邀請；離開分頁時，日常會先暫停。聲音需由你在「小屋聲音」開啟。</p>
      <button class="primary-button" data-dismiss type="button">一起慢慢生活</button>
    </dialog>
    <dialog class="home-dialog journal-dialog" data-dialog="journal" aria-labelledby="journal-title">
      <button class="dialog-close" type="button" aria-label="關閉生活日記">${icon('close')}</button>
      <p class="eyebrow">LITTLE MOMENTS</p><h2 id="journal-title">生活日記</h2><p>沒有大事發生的日子，也值得記下來。</p>
      <ol class="moment-list"></ol><p class="journal-note"></p>
    </dialog>`;
  host.append(ui);
  const find = <T extends HTMLElement>(selector: string) => ui.querySelector<T>(selector)!;
  const title = find('.status-title');
  const source = find('.status-source');
  const symbol = find('.status-symbol');
  const progress = find<HTMLProgressElement>('.action-progress');
  const feedback = find('.feedback');
  const list = find<HTMLOListElement>('.moment-list');
  const count = find('.moment-count');
  let buttons: HTMLButtonElement[] = [];
  const pairButtons = [...ui.querySelectorAll<HTMLButtonElement>('[data-pair]')];
  const pairWith = ui.querySelector<HTMLElement>('.pair-with');
  let dockKey = '';
  const help = find<HTMLDialogElement>('[data-dialog="help"]');
  const diary = find<HTMLDialogElement>('[data-dialog="journal"]');
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
  let previousSymbol = '';
  let quiet = false;
  const setText = (element: HTMLElement, text: string) => { if (element.textContent !== text) element.textContent = text; };
  function notify(message: string) {
    clearTimeout(feedbackTimer);
    feedback.textContent = message;
    feedback.hidden = false;
    feedbackTimer = setTimeout(() => { feedback.hidden = true; }, 3600);
  }
  function setQuiet(value: boolean) {
    quiet = value;
    host.classList.toggle('quiet-mode', value);
    viewChanged();
    find<HTMLButtonElement>('.quiet-exit').hidden = !value;
    if (value) find('.quiet-exit').focus();
    else find('[data-tool="quiet"]').focus();
  }
  function renderJournal() {
    list.replaceChildren();
    if (!journal.entries.length) {
      const empty = document.createElement('li');
      empty.className = 'journal-empty';
      empty.textContent = '第一頁，留給接下來的小日常。陪牠看窗外、讀本書，或等牠自己開始生活。';
      list.append(empty);
    }
    const formatter = new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    for (const entry of journal.entries) {
      const item = document.createElement('li');
      item.innerHTML = `<span class="moment-icon">${icon(entry.kind)}</span><div><time></time><p></p><small></small></div>`;
      const time = item.querySelector('time')!;
      time.dateTime = new Date(entry.at).toISOString();
      time.textContent = formatter.format(entry.at);
      item.querySelector('p')!.textContent = (named && entry.who ? `${entry.who}：` : '') + momentText[entry.kind];
      item.querySelector('small')!.textContent = entry.source === 'player' ? '來自你的小邀請' : '牠自己的小日常';
      list.append(item);
    }
    setText(find('.journal-note'), storageAvailable ? '最近 40 則片段保存在這個瀏覽器。關閉頁面後不會產生離線日記。' : '瀏覽器暫時無法保存日記，這次開啟期間仍會記錄。');
    setText(count, String(journal.entries.length));
  }
  function update() {
    const actions = roomActions(fox()), nextDockKey = (named ? label(fox()) + ':' : '') + actions.join(',');
    if (dockKey !== nextDockKey) {
      const dock = find('.action-dock');
      const hadFocus = dock.contains(document.activeElement);
      dock.innerHTML = actions.map((key, index) => `<button type="button" data-action="${key}" aria-pressed="false" aria-keyshortcuts="${index + 1}"><span class="action-icon">${icon(key)}</span><span>${actionLabels[key]}</span><kbd>${index + 1}</kbd></button>`).join('');
      dock.style.setProperty('--action-count', String(actions.length));
      buttons = [...dock.querySelectorAll<HTMLButtonElement>('button')];
      if (hadFocus) buttons[0]?.focus();
      dockKey = nextDockKey;
      setText(find('.dock-room-label'), `${homeRooms[roomAt(fox().root.position)].label}日常 · 陪${named ? label(fox()) : '牠'}做點什麼`);
    }
    const status = lifePresentation(fox());
    setText(title, status.title);
    setText(source, document.hidden ? '離開一下，日常暫停中' : named ? `${label(fox())} · ${status.source}` : status.source);
    const nextSymbol = status.active ?? 'leaf';
    if (nextSymbol !== previousSymbol) { symbol.innerHTML = icon(nextSymbol); previousSymbol = nextSymbol; }
    progress.hidden = status.progress === null;
    if (status.progress !== null && progress.value !== status.progress) progress.value = status.progress;
    for (const button of [...buttons, ...pairButtons]) {
      const selected = (button.dataset.action ?? button.dataset.pair) === status.active;
      const disabled = status.locked || selected;
      if (button.getAttribute('aria-pressed') !== String(selected)) button.setAttribute('aria-pressed', String(selected));
      if (button.getAttribute('aria-disabled') !== String(disabled)) button.setAttribute('aria-disabled', String(disabled));
    }
    const partner = foxes.all.find(each => each !== fox());
    if (pairWith && partner) setText(pairWith, `和${label(partner)}`);
    let recorded = false;
    for (const each of foxes.all) if (journal.observe(each)) recorded = true;
    if (recorded) {
      try {
        localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal.entries));
        storageAvailable = true;
      } catch { storageAvailable = false; }
      renderJournal();
    }
  }
  const click = (event: MouseEvent) => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!target) return;
    if (target.dataset.action) request(target.dataset.action as LifeAction);
    else if (target.dataset.pair) request(target.dataset.pair as PairAction);
    else if (target.dataset.tool === 'reset') { resetCamera(); notify('回到熟悉的小屋視角。'); }
    else if (target.dataset.tool === 'quiet') setQuiet(true);
    else if (target.classList.contains('quiet-exit')) setQuiet(false);
    else if (target.dataset.tool === 'help') help.showModal();
    else if (target.dataset.tool === 'journal') { renderJournal(); diary.showModal(); }
    else if (target.matches('.dialog-close, [data-dismiss]')) target.closest('dialog')!.close();
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && quiet) { setQuiet(false); return; }
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || quiet || ui.querySelector('dialog[open]') ||
      (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
    const action = roomActions(fox())[Number(event.key) - 1];
    if (action) { event.preventDefault(); request(action); }
  };
  ui.addEventListener('click', click);
  document.addEventListener('keydown', keydown);
  renderJournal();
  update();
  return {
    update,
    visitResult(room: string, accepted: boolean) {
      notify(accepted ? `收到邀請了，去${room}待一會。` : '牠正在完成你的上一個邀請，等一下再邀請牠吧。');
      update();
    },
    petResult(reaction: PetReaction, who: Character) {
      notify(named ? `${label(who)}：${petFeedback[reaction]}` : petFeedback[reaction]);
      update();
    },
    pairResult(kind: PairAction, result: PairInvite) {
      const partner = foxes.all.find(each => each !== fox())!;
      notify(result === 'accepted' ? `收到邀請了，${label(fox())}和${label(partner)}要${pairLabels[kind]}了。`
        : result === 'same' ? '牠們已經在做這件事了，陪牠們一會吧。'
        : `${label(result === 'self-busy' ? fox() : partner)}正在完成你的上一個邀請，等一下再邀請牠們吧。`);
      update();
    },
    commandResult(action: LifeAction, accepted: boolean) {
      const other = isPairAction(action) ? undefined : foxes.all.find(each => each !== fox() && each.occupies(action));
      notify(accepted ? `收到邀請了，一起${actionLabels[action]}。` : fox().source === 'Player Command' ?
        '牠正在完成你的上一個邀請，等一下再邀請牠吧。' : other ? `${label(other)}正在那裡，等一下再邀請${label(fox())}吧。`
        : '牠已經在做這件事了，陪牠一會吧。');
      update();
    },
    dispose() {
      clearTimeout(feedbackTimer);
      ui.removeEventListener('click', click);
      document.removeEventListener('keydown', keydown);
      host.classList.remove('quiet-mode');
      help.close(); diary.close(); ui.remove();
    },
  };
}
