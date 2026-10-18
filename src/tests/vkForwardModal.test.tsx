import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {JSX} from 'solid-js';
import {render} from 'solid-js/web';
import '@helpers/peerIdPolyfill';
import VKForwardModal from '@/vkgram/components/VKForwardModal';

vi.hoisted(() => {
  class IntersectionObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
  }
  (globalThis as any).IntersectionObserver = IntersectionObserverStub;
  (globalThis as any).Worker = class WorkerStub {};
  (globalThis as any).SharedWorker = class SharedWorkerStub {};
});

const peersMock = vi.hoisted(() => ({} as Record<string, any>));
const toastMock = vi.hoisted(() => vi.fn());
const managersMock = vi.hoisted(() => ({
  dialogsStorage: {
    getDialogs: vi.fn(),
    getForumTopicOrReload: vi.fn(),
    canManageTopic: vi.fn(async() => false)
  },
  appUsersManager: {
    getTopPeers: vi.fn()
  },
  appMessagesManager: {
    sendText: vi.fn(async() => undefined),
    forwardMessages: vi.fn(async() => undefined)
  },
  appNotificationsManager: {
    isPeerLocalMuted: vi.fn(async() => false)
  }
}));

vi.mock('@lib/rootScope', () => ({
  default: {
    myId: 1,
    managers: managersMock,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }
}));

vi.mock('@stores/peers', () => ({
  usePeers: () => peersMock
}));

vi.mock('@/vkgram/components/VKModal', () => ({
  default: (props: {title: string, children: JSX.Element}): JSX.Element => (
    <div class="vk-modal-mock" data-title={props.title}>{props.children}</div>
  )
}));

vi.mock('@/vkgram/components/VKPeerAvatar', () => ({
  default: (): null => null
}));

vi.mock('@components/toast', () => ({
  toast: toastMock,
  toastNew: vi.fn(),
  hideToast: vi.fn()
}));

// иконка темы едет ленивым импортом из тяжёлого графа Web K — в тесте заглушка
vi.mock('@components/wrappers/messageActionTextNewUnsafe', () => ({
  wrapTopicIcon: async(): Promise<HTMLElement> => document.createElement('span')
}));

const FORUM = -1000 as PeerId;
const CHAT = -1001 as PeerId;

const makeDialog = (peerId: PeerId, index: number) => ({
  _: 'dialog',
  peerId,
  top_message: index,
  read_inbox_max_id: 0,
  unread_count: 0,
  pFlags: {},
  index_0: index
});

const makeTopic = (id: number) => ({
  _: 'forumTopic',
  id,
  title: `Тема ${id}`,
  icon_color: 0x6fb9f0,
  top_message: id * 10,
  read_inbox_max_id: 0,
  unread_count: 0,
  pFlags: {},
  notify_settings: {},
  peerId: FORUM,
  index_0: id
});

const dispose: (() => void)[] = [];
beforeEach(() => {
  peersMock[2] = {_: 'user', first_name: 'Аня'};
  peersMock[3] = {_: 'user', first_name: 'Борис'};
  peersMock[FORUM] = {_: 'channel', id: -1000, title: 'Группа с темами', pFlags: {forum: true, megagroup: true}};
  peersMock[CHAT] = {_: 'channel', id: -1001, title: 'Просто группа', pFlags: {megagroup: true}};

  // одна страница диалогов; вторая (форум с темами) отдаётся по его собственному filterId
  managersMock.dialogsStorage.getDialogs.mockImplementation(async(options: {filterId: number}) => {
    if(options.filterId === FORUM) {
      return {dialogs: [makeTopic(11), makeTopic(12)], count: 2, isEnd: true, isTopEnd: true};
    }
    return {
      dialogs: [makeDialog(2, 40), makeDialog(3, 30), makeDialog(FORUM, 20), makeDialog(CHAT, 10)],
      count: 4,
      isEnd: true,
      isTopEnd: true
    };
  });
  managersMock.appUsersManager.getTopPeers.mockResolvedValue([{id: 2}, {id: 3}]);
});
afterEach(() => {
  while(dispose.length) dispose.pop()?.();
  document.body.innerHTML = '';
  for(const key of Object.keys(peersMock)) delete peersMock[key];
  vi.clearAllMocks();
});

const mount = (jsx: () => JSX.Element) => {
  const root = document.createElement('div');
  document.body.append(root);
  dispose.push(render(jsx, root));
  return root;
};

const settle = async() => {
  for(let i = 0; i < 5; ++i) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const rowTitles = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('.vk-forward-list .vk-picker-title')).map((el) => el.textContent);

const clickRow = (root: HTMLElement, title: string) => {
  const row = Array.from(root.querySelectorAll<HTMLButtonElement>('.vk-forward-list .vk-picker-row'))
    .find((el) => el.querySelector('.vk-picker-title')?.textContent === title);
  row!.click();
};

describe('VKForwardModal', () => {
  it('рисует список диалогов и полосу недавних, выбирает чаты по клику', async() => {
    const onClose = vi.fn();
    const root = mount(() => <VKForwardModal peerIdMids={{[5000 as PeerId]: [100]}} onClose={onClose} />);
    await settle();

    expect(root.querySelector<HTMLElement>('.vk-modal-mock')!.dataset.title).toBe('Переслать');
    expect(rowTitles(root)).toEqual(['Аня', 'Борис', 'Группа с темами', 'Просто группа']);

    // полоса недавних — те же чаты, что выдал getTopPeers
    const stripNames = Array.from(root.querySelectorAll<HTMLElement>('.vk-search-strip-name')).map((el) => el.textContent);
    expect(stripNames).toEqual(['Аня', 'Борис']);

    // кнопка без выбора неактивна
    const send = root.querySelector<HTMLButtonElement>('.vk-modal-foot .vk-button:not(.vk-button-secondary)')!;
    expect(send.disabled).toBe(true);

    // клик по строке и по кругу полосы выбирает; «Выбрано» считает оба
    clickRow(root, 'Аня');
    (Array.from(root.querySelectorAll<HTMLButtonElement>('.vk-forward-strip-item'))
      .find((el) => el.title === 'Борис')!).click();
    await settle();
    expect(root.querySelector<HTMLElement>('.vk-forward-count')!.textContent).toContain('2');
    expect(send.disabled).toBe(false);
  });

  it('ищет по названию и прячет полосу недавних при вводе', async() => {
    const root = mount(() => <VKForwardModal peerIdMids={{[5000 as PeerId]: [100]}} onClose={vi.fn()} />);
    await settle();

    const search = root.querySelector<HTMLInputElement>('.vk-search')!;
    search.value = 'группа';
    search.dispatchEvent(new Event('input', {bubbles: true}));
    await settle();

    expect(rowTitles(root)).toEqual(['Группа с темами', 'Просто группа']);
    expect(root.querySelector('.vk-forward-strip')).toBeNull();
  });

  it('отправляет пересылку в выбранные чаты с комментарием и закрывается', async() => {
    const onClose = vi.fn();
    const root = mount(() => <VKForwardModal peerIdMids={{[5000 as PeerId]: [100, 101]}} onClose={onClose} />);
    await settle();

    clickRow(root, 'Аня');
    clickRow(root, 'Просто группа');
    const comment = root.querySelector<HTMLInputElement>('#vk-forward-comment-input')!;
    comment.value = 'Взгляни';
    comment.dispatchEvent(new Event('input', {bubbles: true}));

    (root.querySelector<HTMLButtonElement>('.vk-modal-foot .vk-button:not(.vk-button-secondary)')!).click();
    await settle();

    // комментарий ушёл своим сообщением в каждый чат
    expect(managersMock.appMessagesManager.sendText).toHaveBeenCalledTimes(2);
    expect(managersMock.appMessagesManager.sendText).toHaveBeenCalledWith(expect.objectContaining({
      peerId: 2,
      text: 'Взгляни',
      entities: []
    }));
    // пересылка — из исходного чата в оба выбранных
    expect(managersMock.appMessagesManager.forwardMessages).toHaveBeenCalledTimes(2);
    expect(managersMock.appMessagesManager.forwardMessages).toHaveBeenCalledWith(expect.objectContaining({
      peerId: 2,
      fromPeerId: 5000,
      mids: [100, 101]
    }));
    expect(managersMock.appMessagesManager.forwardMessages).toHaveBeenCalledWith(expect.objectContaining({
      peerId: CHAT,
      fromPeerId: 5000,
      mids: [100, 101]
    }));

    // тост об успехе — с именами чатов жирным
    const toastContent = toastMock.mock.calls[0][0] as HTMLElement;
    expect(toastContent.textContent).toBe('Переслано в Аня, Просто группа');
    expect(toastContent.querySelector('b')!.textContent).toBe('Аня');

    expect(onClose).toHaveBeenCalled();
  });

  it('без комментария пересылает, не отправляя пустое сообщение', async() => {
    const root = mount(() => <VKForwardModal peerIdMids={{[5000 as PeerId]: [100]}} onClose={vi.fn()} />);
    await settle();

    clickRow(root, 'Борис');
    (root.querySelector<HTMLButtonElement>('.vk-modal-foot .vk-button:not(.vk-button-secondary)')!).click();
    await settle();

    expect(managersMock.appMessagesManager.sendText).not.toHaveBeenCalled();
    expect(managersMock.appMessagesManager.forwardMessages).toHaveBeenCalledWith(expect.objectContaining({
      peerId: 3
    }));
  });

  it('раскрывает темы форума и пересылает в выбранную тему', async() => {
    const root = mount(() => <VKForwardModal peerIdMids={{[5000 as PeerId]: [100]}} onClose={vi.fn()} />);
    await settle();

    // клик по форуму не выбирает его, а раскрывает темы
    const forumRow = Array.from(root.querySelectorAll<HTMLButtonElement>('.vk-forward-list .vk-picker-row'))
      .find((el) => el.querySelector('.vk-picker-title')?.textContent === 'Группа с темами')!;
    forumRow.click();
    await settle();

    expect(forumRow.getAttribute('aria-expanded')).toBe('true');
    const topicTitles = Array.from(root.querySelectorAll<HTMLElement>('.vk-forward-topic .vk-picker-title'))
      .map((el) => el.textContent);
    // «Общие» всегда пересылаема, даже когда её темы нет в хранилище; дальше — по активности
    expect(topicTitles).toEqual(['Общие', 'Тема 12', 'Тема 11']);

    (Array.from(root.querySelectorAll<HTMLButtonElement>('.vk-forward-topic'))
      .find((el) => el.querySelector('.vk-picker-title')?.textContent === 'Тема 12')!).click();
    await settle();
    expect(root.querySelector<HTMLElement>('.vk-forward-count')!.textContent).toContain('1');

    (root.querySelector<HTMLButtonElement>('.vk-modal-foot .vk-button:not(.vk-button-secondary)')!).click();
    await settle();

    expect(managersMock.appMessagesManager.forwardMessages).toHaveBeenCalledWith(expect.objectContaining({
      peerId: FORUM,
      threadId: 12
    }));
  });

  it('не закрывает окно, когда пересылка не удалась', async() => {
    const onClose = vi.fn();
    managersMock.appMessagesManager.forwardMessages.mockRejectedValueOnce(new Error('CHAT_WRITE_FORBIDDEN'));
    const root = mount(() => <VKForwardModal peerIdMids={{[5000 as PeerId]: [100]}} onClose={onClose} />);
    await settle();

    clickRow(root, 'Аня');
    (root.querySelector<HTMLButtonElement>('.vk-modal-foot .vk-button:not(.vk-button-secondary)')!).click();
    await settle();

    expect(toastMock).toHaveBeenCalledWith('Не удалось переслать в Аня');
    expect(onClose).not.toHaveBeenCalled();
    // кнопка вернулась из «Пересылаем…»
    expect(root.querySelector<HTMLElement>('.vk-modal-foot .vk-button:not(.vk-button-secondary)')!.textContent).toBe('Переслать');
  });
});
