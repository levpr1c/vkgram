import {createEffect, createMemo, createSignal, For, onCleanup, Show} from 'solid-js';
import type {ForumTopic} from '@layer';
import rootScope from '@lib/rootScope';
import {GENERAL_TOPIC_ID} from '@appManagers/constants';
import {usePeers} from '@stores/peers';
import {toast} from '@components/toast';
import VKIcon from '@/vkgram/components/VKIcons';
import VKModal from '@/vkgram/components/VKModal';
import VKPeerAvatar from '@/vkgram/components/VKPeerAvatar';
import peerTitle from '@/vkgram/utils/peerTitle';
import pluralRu from '@/vkgram/utils/pluralRu';
import {openVKModal} from '@/vkgram/modals';
import createDialogPages from '@/vkgram/hooks/createDialogPages';
import createForumTopics, {isForumPeer} from '@/vkgram/hooks/createForumTopics';

// the avatars of the recent strip, as in the search window
const STRIP_AVATAR_SIZE = 48;
const STRIP_LIMIT = 12;

type Target = {peerId: PeerId, threadId?: number};

/** a topic row of an expanded forum; `live` is absent only for the always-there «Общие» */
type TopicRow = {id: number, title: string, live?: ForumTopic.forumTopic};

/**
 * «Переслать» в стиле VKgram — то, что в Web K делает попап пересылки: выбор
 * чатов из списка диалогов (с поиском и подгрузкой), полоса недавних чатов как
 * в окне поиска, темы у групп-форумов, необязательный комментарий и отправка
 * во все выбранные чаты сразу. Отправляет сама через менеджеры Web K; открывать
 * чат и вставлять черновик пересылки, как попап Web K при одиночном выборе, не
 * пытается — в «Сообщениях» VKgram такого черновика нет.
 */
export default function VKForwardModal(props: {
  // what is being forwarded: the mids of each source chat
  peerIdMids: {[fromPeerId: PeerId]: number[]},
  onClose: () => void
}) {
  const peers = usePeers();
  const [query, setQuery] = createSignal('');
  const [comment, setComment] = createSignal('');
  const [sending, setSending] = createSignal(false);
  const [selected, setSelected] = createSignal<Map<string, Target>>(new Map());
  const [recentIds, setRecentIds] = createSignal<PeerId[]>();
  const [expandedForum, setExpandedForum] = createSignal<PeerId>();

  // the strip of the frequent chats: Telegram's top correspondents, as in the search window
  let stripAlive = true;
  onCleanup(() => stripAlive = false);
  rootScope.managers.appUsersManager.getTopPeers('correspondents').then((topPeers) => {
    if(stripAlive) setRecentIds(topPeers.map((topPeer) => topPeer.id).slice(0, STRIP_LIMIT));
  }, (err) => {
    console.error('VKgram: failed to load the frequent chats', err);
    if(stripAlive) setRecentIds([]);
  });

  // the topics of the one forum the user has expanded; `createForumTopics` skips an undefined peer
  const forum = createForumTopics(() => expandedForum());

  const queryLower = () => query().trim().toLowerCase();
  const {dialogs, loading, loadPage, canLoadMore, dispose} = createDialogPages(queryLower);
  onCleanup(dispose);

  const titleOf = (peerId: PeerId) => peerId === rootScope.myId ? 'Избранное' : peerTitle(peers[peerId]) ?? '';

  const filtered = createMemo(() => {
    const q = queryLower();
    const list = dialogs();
    if(!q) return list;
    return list.filter((dialog) => titleOf(dialog.peerId).toLowerCase().includes(q));
  });

  // «Общие» is always forwardable even when its topic dialog is not in the storage yet
  const topicRows = createMemo<TopicRow[]>(() => {
    if(!expandedForum()) return [];
    const list = forum.sortedTopics();
    const rows = list.map((topic) => ({id: topic.id, title: topic.title, live: topic}));
    return list.some((topic) => topic.id === GENERAL_TOPIC_ID) ?
      rows :
      [{id: GENERAL_TOPIC_ID, title: 'Общие'}, ...rows];
  });

  const toggle = (target: Target) => {
    setSelected((prev) => {
      const key = `${target.peerId}_${target.threadId ?? 0}`;
      const next = new Map(prev);
      if(next.has(key)) next.delete(key);
      else next.set(key, target);
      return next;
    });
  };
  const isPicked = (target: Target) => selected().has(`${target.peerId}_${target.threadId ?? 0}`);

  // the name of a target for the toast: «Избранное», a peer's title or a topic's title
  const targetName = (target: Target) => {
    if(target.threadId !== undefined) {
      return topicRows().find((row) => row.id === target.threadId)?.title || peerTitle(peers[target.peerId]) || 'тему';
    }
    return titleOf(target.peerId) || 'чат';
  };

  const send = async() => {
    const targets = [...selected().values()];
    if(!targets.length || sending()) return;

    setSending(true);
    const text = comment().trim();
    const succeeded: Target[] = [];
    for(const target of targets) {
      try {
        // a comment goes first as its own message, the way Web K's forward flow sends it
        if(text) {
          await rootScope.managers.appMessagesManager.sendText({
            peerId: target.peerId,
            threadId: target.threadId,
            text,
            entities: []
          });
        }

        for(const fromPeerId of Object.keys(props.peerIdMids)) {
          await rootScope.managers.appMessagesManager.forwardMessages({
            peerId: target.peerId,
            threadId: target.threadId,
            fromPeerId: fromPeerId.toPeerId(),
            mids: props.peerIdMids[fromPeerId as any as number]
          });
        }

        succeeded.push(target);
      } catch(err) {
        console.error('VKgram: forwarding failed', target, err);
        toast(`Не удалось переслать в ${targetName(target)}`);
      }
    }

    if(succeeded.length) {
      toast(resultToast(succeeded.map((target) => targetName(target))));
      props.onClose();
      return;
    }

    setSending(false);
  };

  const renderCheck = (picked: boolean) => (
    <span class="vk-chats-picker-check" classList={{'is-checked': picked}} aria-hidden="true">
      <Show when={picked}>
        <VKIcon name="select" size={16} />
      </Show>
    </span>
  );

  return (
    <VKModal title="Переслать" width={420} onClose={props.onClose} closeDisabled={sending()}>
      <div class="vk-modal-body vk-forward">
        <input
          type="text"
          class="vk-search"
          placeholder="Поиск"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />

        {/* the recent chats of an empty query: the same strip the search window has */}
        <Show when={!queryLower() && recentIds() && recentIds().length}>
          <div class="vk-search-strip-block vk-forward-strip-block">
            <ul class="vk-search-strip vk-forward-strip" aria-label="Недавние чаты">
              <For each={recentIds()}>
                {(peerId) => (
                  <li>
                    <button
                      type="button"
                      class="vk-search-strip-item vk-forward-strip-item"
                      classList={{'is-picked': isPicked({peerId})}}
                      title={titleOf(peerId)}
                      aria-pressed={isPicked({peerId})}
                      onClick={() => toggle({peerId})}
                    >
                      <span class="vk-forward-strip-avatar">
                        <VKPeerAvatar peerId={peerId} size={STRIP_AVATAR_SIZE} />
                        <Show when={isPicked({peerId})}>
                          <span class="vk-forward-strip-check" aria-hidden="true">
                            <VKIcon name="select" size={10} />
                          </span>
                        </Show>
                      </span>
                      <span class="vk-search-strip-name">{titleOf(peerId)}</span>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>

        <Show when={selected().size}>
          <p class="vk-page-text vk-page-text-secondary vk-forward-count">
            Выбрано: {selected().size}
          </p>
        </Show>

        <ul class="vk-peer-list vk-picker-list vk-chats-picker-list vk-forward-list">
          <For each={filtered()}>
            {(dialog) => {
              const isForum = () => isForumPeer(peers[dialog.peerId]);
              const isExpanded = () => isForum() && expandedForum() === dialog.peerId;
              return (
                <li>
                  <button
                    type="button"
                    class="vk-picker-row vk-peer-row-clickable"
                    classList={{'is-current': isPicked({peerId: dialog.peerId}), 'is-expanded': isExpanded()}}
                    aria-pressed={!isForum() && isPicked({peerId: dialog.peerId})}
                    aria-expanded={isForum() ? isExpanded() : undefined}
                    onClick={() => isForum() ?
                      setExpandedForum(isExpanded() ? undefined : dialog.peerId) :
                      toggle({peerId: dialog.peerId})}
                  >
                    <VKPeerAvatar peerId={dialog.peerId} size={40} />
                    <span class="vk-picker-info">
                      <span class="vk-picker-title">{titleOf(dialog.peerId)}</span>
                    </span>
                    <Show
                      when={isForum()}
                      fallback={renderCheck(isPicked({peerId: dialog.peerId}))}
                    >
                      <VKIcon name="chevron" size={12} class="vk-forward-chevron" />
                    </Show>
                  </button>
                  <Show when={isExpanded()}>
                    <ul class="vk-forward-topics">
                      <Show
                        when={forum.ready()}
                        fallback={<li class="vk-forward-topics-hint">Загрузка тем…</li>}
                      >
                        <For each={topicRows()}>
                          {(row) => {
                            const target = {peerId: dialog.peerId, threadId: row.id};
                            return (
                              <li>
                                <button
                                  type="button"
                                  class="vk-picker-row vk-peer-row-clickable vk-forward-topic"
                                  classList={{'is-current': isPicked(target)}}
                                  aria-pressed={isPicked(target)}
                                  onClick={() => toggle(target)}
                                >
                                  <TopicIcon topic={row} />
                                  <span class="vk-picker-info">
                                    <span class="vk-picker-title">{row.title}</span>
                                  </span>
                                  {renderCheck(isPicked(target))}
                                </button>
                              </li>
                            );
                          }}
                        </For>
                      </Show>
                    </ul>
                  </Show>
                </li>
              );
            }}
          </For>
        </ul>

        <Show when={canLoadMore()}>
          <Show
            when={!loading()}
            fallback={<p class="vk-page-text vk-page-text-secondary vk-forward-more">Загрузка…</p>}
          >
            <button type="button" class="vk-link-button vk-forward-more" onClick={loadPage}>
              Показать ещё
            </button>
          </Show>
        </Show>

        <div class="vk-field-row vk-forward-comment">
          <label for="vk-forward-comment-input">Комментарий</label>
          <input
            id="vk-forward-comment-input"
            class="vk-input"
            type="text"
            placeholder="Необязательно"
            value={comment()}
            autocomplete="off"
            disabled={sending()}
            onInput={(e) => setComment(e.currentTarget.value)}
            onKeyDown={(e) => {
              if(e.key === 'Enter' && !e.isComposing) void send();
            }}
          />
        </div>
      </div>
      <div class="vk-modal-foot">
        <button
          type="button"
          class="vk-button vk-button-secondary"
          disabled={sending()}
          onClick={props.onClose}
        >
          Отмена
        </button>
        <button
          type="button"
          class="vk-button"
          disabled={!selected().size || sending()}
          onClick={() => void send()}
        >
          {sending() ? 'Пересылаем…' : 'Переслать'}
        </button>
      </div>
    </VKModal>
  );
}

function makeBold(text: string) {
  const b = document.createElement('b');
  b.textContent = text;
  return b;
}

/** «Переслано в Аню», «…в Аню, Бориса», «…в 5 чатов» */
function resultToast(names: string[]) {
  const frag = document.createDocumentFragment();
  frag.append('Переслано в ');
  if(names.length === 1) {
    frag.append(makeBold(names[0]));
  } else if(names.length <= 3) {
    names.forEach((name, i) => {
      if(i) frag.append(', ');
      frag.append(makeBold(name));
    });
  } else {
    frag.append(`${names.length} ${pluralRu(names.length, 'чат', 'чата', 'чатов')}`);
  }
  return frag;
}

/**
 * The colored circle of a topic, Web K's own wrapper (`wrapTopicIcon`) — lazy,
 * as everywhere: the wrapper's module is heavy. A fallback «Общие» without a
 * live topic draws a quiet grey circle.
 */
function TopicIcon(props: {topic: TopicRow}) {
  let iconHost: HTMLSpanElement;
  createEffect(() => {
    const topic = props.topic.live;
    if(!topic || !iconHost) return;
    void import('@components/wrappers/messageActionTextNewUnsafe')
    .then(({wrapTopicIcon}) => wrapTopicIcon({topic}))
    .then((icon) => {
      iconHost.replaceChildren(icon as Node);
    });
  });

  return (
    <Show
      when={props.topic.live}
      fallback={(
        <span class="vk-forward-topic-fallback" aria-hidden="true">
          <VKIcon name="messages" size={13} />
        </span>
      )}
    >
      <span ref={iconHost} class="vk-forward-topic-live" />
    </Show>
  );
}

/** opens the forward window from plain code — the one «Переслать» of the whole VKgram */
export function openVKForwardPopup(peerIdMids: {[fromPeerId: PeerId]: number[]}) {
  openVKModal((p) => <VKForwardModal peerIdMids={peerIdMids} onClose={p.onClose} />);
}
