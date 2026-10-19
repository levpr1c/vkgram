import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {JSX} from 'solid-js';
import {render} from 'solid-js/web';
import '@helpers/peerIdPolyfill';
import {VKProfileGroups} from '@/vkgram/pages/profile/VKProfileSideBlocks';

vi.hoisted(() => {
  (globalThis as any).Worker = class WorkerStub {};
  (globalThis as any).SharedWorker = class SharedWorkerStub {};
});

const peersMock = vi.hoisted(() => ({} as Record<string, any>));
// диалоги «Групп» — их отдаёт замоканный хук, наполняется в каждом тесте
const groupsMock = vi.hoisted(() => [] as any[]);
const openChatMock = vi.hoisted(() => vi.fn());

vi.mock('@lib/rootScope', () => ({
  default: {
    myId: 1,
    managers: {},
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
}));

vi.mock('@stores/peers', () => ({
  usePeers: () => peersMock
}));

vi.mock('@/vkgram/hooks/useSubscribedChannels', () => ({
  default: () => ({channels: (): any[] => [], isReady: () => true, notifyVersion: () => 0}),
  useSubscribedGroups: () => ({groups: (): any[] => groupsMock, isReady: () => true, notifyVersion: () => 0})
}));

vi.mock('@/vkgram/pages/messages/openChat', () => ({
  openVKChat: openChatMock,
  openVKTopic: vi.fn()
}));

vi.mock('@components/avatarNew', () => ({
  AvatarNewTsx: () => <span class="avatar-mock" />
}));

// окно целиком не рендерим — слой VKModal (портал, фокус, scroll lock) не этому тесту проверять
vi.mock('@/vkgram/components/VKModal', () => ({
  default: (props: {title: string, children: JSX.Element}): JSX.Element => (
    <div class="vk-modal-mock" data-title={props.title}>{props.children}</div>
  )
}));

const GROUP_IDS = [1, 2, 3, 4, 5, 6].map((n) => (300 + n) as ChatId);

/** шесть групп: блок показывает пять, «Показать все» появляется только за этим порогом */
const fillGroups = () => {
  groupsMock.length = 0;
  GROUP_IDS.forEach((peerId, i) => {
    groupsMock.push({_: 'dialog', peerId, pFlags: {}});
    peersMock[peerId] = {_: 'chat', id: 300 + i + 1, title: `Группа номер ${i + 1}`, pFlags: {}};
  });
};

/** «Показать все» открыто, окно перед нами */
const openModal = (): HTMLElement => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const dispose = render(() => <VKProfileGroups />, div);

  const more = div.querySelector<HTMLButtonElement>('.vk-mini-more');
  expect(more).toBeTruthy();
  more!.click();

  const modal = document.querySelector<HTMLElement>('.vk-modal-mock');
  expect(modal).toBeTruthy();
  void dispose;
  return modal!;
};

describe('«Показать все» блока «Группы»', () => {
  beforeEach(() => {
    for(const key of Object.keys(peersMock)) delete peersMock[key];
    groupsMock.length = 0;
    openChatMock.mockClear();
    document.body.replaceChildren();
  });

  it('открывает окно со всеми группами, а не раздел-заглушку', () => {
    fillGroups();
    const modal = openModal();

    expect(modal.dataset.title).toBe(`Группы ${GROUP_IDS.length}`);
    const rows = [...modal.querySelectorAll('.vk-picker-title')].map((el) => el.textContent);
    expect(rows).toEqual(GROUP_IDS.map((_, i) => `Группа номер ${i + 1}`));
  });

  it('ищет по названию и умеет говорить, что ничего не найдено', () => {
    fillGroups();
    const modal = openModal();

    const input = modal.querySelector<HTMLInputElement>('input.vk-search');
    expect(input).toBeTruthy();
    input!.value = 'номер 3';
    input!.dispatchEvent(new Event('input', {bubbles: true}));

    let titles = [...modal.querySelectorAll('.vk-picker-title')].map((el) => el.textContent);
    expect(titles).toEqual(['Группа номер 3']);

    input!.value = 'несуществующая группа';
    input!.dispatchEvent(new Event('input', {bubbles: true}));
    expect(modal.querySelectorAll('.vk-picker-row').length).toBe(0);
    expect(modal.textContent).toContain('Ничего не найдено.');

    input!.value = '';
    input!.dispatchEvent(new Event('input', {bubbles: true}));
    titles = [...modal.querySelectorAll('.vk-picker-title')].map((el) => el.textContent);
    expect(titles.length).toBe(GROUP_IDS.length);
  });

  it('клик по группе закрывает окно и открывает её чат в «Сообщениях»', () => {
    fillGroups();
    const modal = openModal();

    (modal.querySelectorAll<HTMLButtonElement>('.vk-picker-row')[2]).click();

    expect(openChatMock).toHaveBeenCalledTimes(1);
    expect(openChatMock).toHaveBeenCalledWith(GROUP_IDS[2]);
    expect(document.querySelector('.vk-modal-mock')).toBeNull();
  });
});
