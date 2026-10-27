/** Shared compact layout for phones and short landscape windows. */
export const COMPACT_VIEW = '(max-width: 650px), (max-height: 500px)';

export function createPanelDisclosure(host: HTMLElement, panel: HTMLElement, button: HTMLButtonElement,
  body: HTMLElement, name: 'rooms' | 'actions', labels: { open: string; close: string }, storageKey?: string) {
  const media = window.matchMedia(COMPACT_VIEW);
  const choices = new Map<boolean, boolean>();
  let collapsed = media.matches;
  function preference() {
    if (choices.has(media.matches)) return choices.get(media.matches)!;
    if (storageKey) try {
      // A desktop preference must not expand the phone's panels on its first visit.
      const value = localStorage.getItem(storageKey + (media.matches ? '.compact' : ''));
      if (value === 'collapsed' || value === 'open') return value === 'collapsed';
    } catch { /* Use the viewport default when storage is unavailable. */ }
    return media.matches;
  }
  function fold(next: boolean, remember = false) {
    if (next && body.contains(document.activeElement)) button.focus();
    collapsed = next;
    panel.dataset.collapsed = String(next);
    body.hidden = next;
    button.setAttribute('aria-expanded', String(!next));
    button.setAttribute('aria-label', next ? labels.open : labels.close);
    button.title = next ? labels.open : labels.close;
    if (name === 'actions') {
      button.querySelector('span')!.textContent = next ? '動作' : '收合';
      host.classList.toggle('actions-open', !next);
    }
    if (remember) {
      choices.set(media.matches, next);
      if (storageKey) try {
        localStorage.setItem(storageKey + (media.matches ? '.compact' : ''), next ? 'collapsed' : 'open');
      } catch { /* The choice still applies for this visit. */ }
    }
    if (!next && media.matches) host.dispatchEvent(new CustomEvent('home-panel-open', { detail: name }));
  }
  const toggle = () => fold(!collapsed, true);
  const otherOpened = (event: Event) => {
    if (media.matches && (event as CustomEvent).detail !== name) fold(true);
  };
  const resize = () => fold(preference());
  const escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !collapsed && panel.contains(document.activeElement)
      && !host.querySelector('dialog[open]')) { event.preventDefault(); button.focus(); fold(true); }
  };
  button.addEventListener('click', toggle);
  panel.addEventListener('keydown', escape);
  host.addEventListener('home-panel-open', otherOpened);
  media.addEventListener('change', resize);
  fold(preference());
  return {
    closeOnPhone() { if (media.matches) fold(true); },
    dispose() {
      button.removeEventListener('click', toggle); panel.removeEventListener('keydown', escape);
      host.removeEventListener('home-panel-open', otherOpened); media.removeEventListener('change', resize);
      if (name === 'actions') host.classList.remove('actions-open');
    },
  };
}
