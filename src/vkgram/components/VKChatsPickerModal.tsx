import {createMemo, createSignal, For, onCleanup, Show} from 'solid-js';
import type {User, Chat} from '@layer';
import {usePeers} from '@stores/peers';
import {AvatarNewTsx} from '@components/avatarNew';
import VKIcon from '@/vkgram/components/VKIcons';
import VKModal from '@/vkgram/components/VKModal';
import createDialogPages from '@/vkgram/hooks/createDialogPages';

type AnyPeer = User.user | Exclude<Chat, Chat.chatEmpty>;

const peerTitle = (peer: AnyPeer | undefined) => {
  if(!peer) return '';
  if(peer._ === 'user') {
    return [peer.first_name, peer.last_name].filter(Boolean).join(' ') || peer.username || '';
  }
  return peer.title;
};

/**
 * A chat multi-picker in a `VKModal`: the dialogs of the main list
 * (`dialogsStorage.getDialogs`, the same storage Web K's folder editor reads),
 * paged, with a local search over the loaded pages. Reports the chosen peer
 * ids — nothing is written here; the caller decides what to do with them.
 */
export default function VKChatsPickerModal(props: {
  title: string,
  // pre-checked peer ids
  selected?: PeerId[],
  onDone: (peerIds: PeerId[]) => void,
  onClose: () => void
}) {
  const peers = usePeers();
  const [query, setQuery] = createSignal('');
  const [chosen, setChosen] = createSignal<Set<PeerId>>(new Set(props.selected ?? []));

  const queryLower = () => query().trim().toLowerCase();
  const {dialogs, loading, loadPage, canLoadMore, dispose} = createDialogPages(queryLower);
  onCleanup(dispose);

  const titleOf = (peerId: PeerId) => {
    const peer = peers[peerId] as AnyPeer | undefined;
    if(!peer) return '';
    if(peer._ === 'user') {
      return [peer.first_name, peer.last_name].filter(Boolean).join(' ') || peer.username || '';
    }
    return peer.title;
  };

  const filtered = createMemo(() => {
    const q = queryLower();
    const list = dialogs();
    if(!q) return list;
    return list.filter((dialog) => titleOf(dialog.peerId).toLowerCase().includes(q));
  });

  const toggle = (peerId: PeerId) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if(next.has(peerId)) next.delete(peerId);
      else next.add(peerId);
      return next;
    });
  };

  const done = () => props.onDone([...chosen()]);

  return (
    <VKModal title={props.title} width={420} onClose={props.onClose}>
      <div class="vk-modal-body vk-chats-picker">
        <input
          type="text"
          class="vk-search"
          placeholder="Поиск"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <Show when={chosen().size}>
          <p class="vk-page-text vk-page-text-secondary vk-chats-picker-count">
            Выбрано: {chosen().size}
          </p>
        </Show>
        <ul class="vk-peer-list vk-picker-list vk-chats-picker-list">
          <For each={filtered()}>
            {(dialog) => (
              <li>
                <button
                  type="button"
                  class="vk-picker-row vk-peer-row-clickable"
                  classList={{'is-current': chosen().has(dialog.peerId)}}
                  onClick={() => toggle(dialog.peerId)}
                >
                  <AvatarNewTsx peerId={dialog.peerId} size={40} />
                  <span class="vk-picker-info">
                    <span class="vk-picker-title">{titleOf(dialog.peerId)}</span>
                  </span>
                  <span class="vk-chats-picker-check" classList={{'is-checked': chosen().has(dialog.peerId)}}>
                    <Show when={chosen().has(dialog.peerId)}>
                      <VKIcon name="select" size={16} />
                    </Show>
                  </span>
                </button>
              </li>
            )}
          </For>
        </ul>
        <Show when={canLoadMore()}>
          <Show
            when={!loading()}
            fallback={<p class="vk-page-text vk-page-text-secondary vk-chats-picker-more">Загрузка…</p>}
          >
            <button type="button" class="vk-link-button vk-chats-picker-more" onClick={loadPage}>
              Показать ещё
            </button>
          </Show>
        </Show>
      </div>
      <div class="vk-modal-foot">
        <button type="button" class="vk-button vk-button-secondary" onClick={props.onClose}>Отмена</button>
        <button type="button" class="vk-button" onClick={done}>Готово</button>
      </div>
    </VKModal>
  );
}
