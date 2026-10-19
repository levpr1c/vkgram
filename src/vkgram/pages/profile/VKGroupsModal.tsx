import {createMemo, createSignal, For, Show} from 'solid-js';
import type {Chat, User} from '@layer';
import {usePeers} from '@stores/peers';
import {AvatarNewTsx} from '@components/avatarNew';
import getPeerActiveUsernames from '@appManagers/utils/peers/getPeerActiveUsernames';
import peerTitle from '@/vkgram/utils/peerTitle';
import VKModal from '@/vkgram/components/VKModal';
import VKSearchField from '@/vkgram/components/VKSearchField';
import {openVKChat} from '@/vkgram/pages/messages/openChat';

/**
 * «Показать все» of the profile's «Группы» block in a `VKModal`: the whole
 * list the block previews (`useSubscribedGroups`, passed by the caller as
 * peer ids), with a local search over the titles and usernames. A click on a
 * row opens the group's chat — the same thing a row of the block does.
 */
export default function VKGroupsModal(props: {
  peerIds: PeerId[],
  onClose: () => void
}) {
  const peers = usePeers();
  const [query, setQuery] = createSignal('');

  const peerOf = (peerId: PeerId) => peers[peerId] as User.user | Chat.chat | Chat.channel;
  const usernamesOf = (peerId: PeerId) => getPeerActiveUsernames(peerOf(peerId));

  const filtered = createMemo(() => {
    const q = query().trim().toLowerCase();
    if(!q) return props.peerIds;
    return props.peerIds.filter((peerId) => {
      const haystack = [peerTitle(peerOf(peerId)), ...usernamesOf(peerId)]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });

  // the chat is where a group lives (in VKgram's «Сообщения»), the window is done with
  const open = (peerId: PeerId) => {
    props.onClose();
    openVKChat(peerId);
  };

  return (
    <VKModal title={`Группы ${props.peerIds.length}`} onClose={props.onClose} closeOnBackdrop>
      <div class="vk-modal-body vk-picker-body">
        <VKSearchField value={query()} placeholder="Поиск групп" onInput={setQuery} />

        <Show
          when={filtered().length}
          fallback={<p class="vk-page-text vk-page-text-secondary">Ничего не найдено.</p>}
        >
          <ul class="vk-picker-list vk-groups-modal-list">
            <For each={filtered()}>
              {(peerId) => (
                <li>
                  <button type="button" class="vk-picker-row" onClick={() => open(peerId)}>
                    <AvatarNewTsx peerId={peerId} size={40} />
                    <span class="vk-picker-info">
                      <span class="vk-picker-title">{peerTitle(peerOf(peerId))}</span>
                      <Show when={usernamesOf(peerId)[0]}>
                        <span class="vk-page-text-secondary">@{usernamesOf(peerId)[0]}</span>
                      </Show>
                    </span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </VKModal>
  );
}
