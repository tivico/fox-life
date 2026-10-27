import type { Character } from './Character.ts';
import type { createHomeView, HomeViewMode } from './HomeView.ts';
import { homeRooms, roomAt, type RoomId } from './HomeNavigation.ts';
import { createPanelDisclosure } from './PanelDisclosure.ts';

export const ROOM_PANEL_KEY = 'fox-life.room-panel.v1';

export function createRoomPanel(host: HTMLElement, foxes: { active: () => Character; all: readonly Character[] },
  view: ReturnType<typeof createHomeView>, visit: (room: RoomId) => boolean, select: (fox: Character) => void) {
  const fox = () => foxes.active();
  const primary = foxes.all[0]!;
  const named = foxes.all.length > 1;
  const label = () => named ? fox().name ?? '狐狸' : '狐狸';
  const panel = document.createElement('section'); panel.className = 'room-panel'; panel.setAttribute('aria-label', '小屋空間');
  const roomIds: RoomId[] = primary.gardenEnabled ? ['Bedroom', 'LivingRoom', 'Balcony'] : ['Bedroom', 'LivingRoom'];
  if (primary.kitchenEnabled) roomIds.push('Kitchen');
  const subtitles = { Bedroom: '好好休息', LivingRoom: '放鬆一下', Balcony: '花草與微風', Kitchen: '慢慢做料理' };
  // With two foxes, choosing a fox replaces "follow the fox": the camera follows whoever you are with.
  panel.innerHTML = `<p class="room-eyebrow">ROOMS OF OUR LITTLE HOME</p>
    <div class="room-heading"><h2>小小的家</h2><span class="room-location" role="status"></span>
      <button class="room-collapse" type="button" aria-controls="room-body"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div>
    ${named ? `<nav class="fox-switch" aria-label="陪伴哪一隻">${foxes.all.map((each, index) =>
      `<button type="button" data-fox="${index}" aria-pressed="false"><span class="fox-dot" style="--coat:${each.coat}"></span>${each.name ?? '狐狸'}</button>`).join('')}</nav>` : ''}
    <div class="room-body" id="room-body">
    <nav class="room-views" aria-label="選擇小屋視角" data-garden="${primary.gardenEnabled}" data-kitchen="${primary.kitchenEnabled}" data-named="${named}">
      ${named ? '' : '<button type="button" data-view="follow" aria-pressed="true">跟隨狐狸</button>'}<button type="button" data-view="overview" aria-pressed="false">全屋</button>
      ${roomIds.map(room => `<button type="button" data-view="${room}" aria-pressed="false">${homeRooms[room].label} <small>${subtitles[room]}</small></button>`).join('')}
    </nav><button class="room-invite" type="button"></button><div class="room-travel-links">${roomIds.map(room => `<button class="room-travel" data-room="${room}" type="button">去${homeRooms[room].label} →</button>`).join('')}</div><p class="room-hint">走進另一間房，鏡頭也輕輕跟上。</p>
    </div>`;
  host.querySelector('.life-ui')!.append(panel);
  const location = panel.querySelector<HTMLElement>('.room-location')!;
  const collapse = panel.querySelector<HTMLButtonElement>('.room-collapse')!;
  const invite = panel.querySelector<HTMLButtonElement>('.room-invite')!;
  const travels = [...panel.querySelectorAll<HTMLButtonElement>('.room-travel')];
  const hint = panel.querySelector<HTMLElement>('.room-hint')!;
  const buttons = [...panel.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const chips = [...panel.querySelectorAll<HTMLButtonElement>('[data-fox]')];
  const text = (node: HTMLElement, value: string) => { if (node.textContent !== value) node.textContent = value; };
  const disclosure = createPanelDisclosure(host, panel, collapse, panel.querySelector<HTMLElement>('.room-body')!,
    'rooms', { open: '展開房間面板', close: '收合房間面板' }, ROOM_PANEL_KEY);
  function update() {
    text(location, `${label()}在${homeRooms[roomAt(fox().root.position)].label}`);
    for (const button of buttons) {
      const pressed = String(button.dataset.view === view.mode);
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
    }
    chips.forEach((chip, index) => {
      const pressed = String(foxes.all[index] === fox());
      if (chip.getAttribute('aria-pressed') !== pressed) chip.setAttribute('aria-pressed', pressed);
      chip.dataset.following = String(foxes.all[index] === fox() && view.mode === 'follow');
    });
    invite.hidden = view.mode === 'overview';
    text(invite, `邀請${named ? label() : '牠'}來${homeRooms[view.room].label} ↗`);
    invite.setAttribute('aria-disabled', String(fox().source === 'Player Command'));
    for (const travel of travels) {
      travel.hidden = travel.dataset.room === roomAt(fox().root.position);
      travel.setAttribute('aria-disabled', String(fox().source === 'Player Command'));
    }
    text(hint, view.mode === 'follow' ? '走進另一間房，鏡頭也輕輕跟上。' : view.mode === 'overview'
      ? primary.kitchenEnabled ? '四個空間，各有各的小日常。' : primary.gardenEnabled ? '三個空間，慢慢長大的家。' : '兩間房，一個慢慢生活的小家。'
      : named ? `正在看這間房；點${foxes.all.map(each => each.name).join('或')}恢復跟拍。` : '正在看這間房；選「跟隨狐狸」恢復跟拍。');
  }
  const click = (event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button?.dataset.fox) { select(foxes.all[Number(button.dataset.fox)]!); disclosure.closeOnPhone(); }
    else if (button?.dataset.view) { view.focus(button.dataset.view as HomeViewMode); disclosure.closeOnPhone(); }
    else if (button === invite) { if (visit(view.room)) disclosure.closeOnPhone(); }
    else if (button?.dataset.room) { if (visit(button.dataset.room as RoomId)) disclosure.closeOnPhone(); }
    update();
  };
  panel.addEventListener('click', click); update();
  return { update, dispose() { disclosure.dispose(); panel.removeEventListener('click', click); panel.remove(); } };
}
