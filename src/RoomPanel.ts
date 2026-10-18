import type { Character } from './Character.ts';
import type { createHomeView, HomeViewMode } from './HomeView.ts';
import { homeRooms, roomAt, type RoomId } from './HomeNavigation.ts';

export function createRoomPanel(host: HTMLElement, character: Character, view: ReturnType<typeof createHomeView>,
  visit: (room: RoomId) => void) {
  const panel = document.createElement('section'); panel.className = 'room-panel'; panel.setAttribute('aria-label', '小屋空間');
  panel.innerHTML = `<p class="room-eyebrow">ROOMS OF OUR LITTLE HOME</p>
    <div class="room-heading"><h2>小小的家</h2><span class="room-location" role="status"></span></div>
    <nav class="room-views" aria-label="選擇小屋視角">
      <button type="button" data-view="follow" aria-pressed="true">跟隨狐狸</button><button type="button" data-view="overview" aria-pressed="false">全屋</button>
      <button type="button" data-view="Bedroom" aria-pressed="false">臥室 <small>好好休息</small></button><button type="button" data-view="LivingRoom" aria-pressed="false">客廳 <small>放鬆一下</small></button>
    </nav><button class="room-invite" type="button"></button><button class="room-travel" type="button"></button><p class="room-hint">走進另一間房，鏡頭也輕輕跟上。</p>`;
  host.querySelector('.life-ui')!.append(panel);
  const location = panel.querySelector<HTMLElement>('.room-location')!;
  const invite = panel.querySelector<HTMLButtonElement>('.room-invite')!;
  const travel = panel.querySelector<HTMLButtonElement>('.room-travel')!;
  const hint = panel.querySelector<HTMLElement>('.room-hint')!;
  const buttons = [...panel.querySelectorAll<HTMLButtonElement>('[data-view]')];
  const text = (node: HTMLElement, value: string) => { if (node.textContent !== value) node.textContent = value; };
  function update() {
    text(location, `狐狸在${homeRooms[roomAt(character.root.position)].label}`);
    for (const button of buttons) {
      const pressed = String(button.dataset.view === view.mode);
      if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
    }
    invite.hidden = view.mode === 'overview';
    text(invite, `邀請牠來${homeRooms[view.room].label} ↗`);
    invite.setAttribute('aria-disabled', String(character.source === 'Player Command'));
    text(travel, roomAt(character.root.position) === 'Bedroom' ? '去客廳 →' : '← 回臥室');
    travel.setAttribute('aria-disabled', String(character.source === 'Player Command'));
    text(hint, view.mode === 'follow' ? '走進另一間房，鏡頭也輕輕跟上。' : view.mode === 'overview'
      ? '兩間房，一個慢慢生活的小家。' : '正在看這間房；選「跟隨狐狸」恢復跟拍。');
  }
  const click = (event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (button?.dataset.view) { view.focus(button.dataset.view as HomeViewMode); update(); }
    else if (button === invite) visit(view.room);
    else if (button === travel) visit(roomAt(character.root.position) === 'Bedroom' ? 'LivingRoom' : 'Bedroom');
  };
  panel.addEventListener('click', click); update();
  return { update, dispose() { panel.removeEventListener('click', click); panel.remove(); } };
}
