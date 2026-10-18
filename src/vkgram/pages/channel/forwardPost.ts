import type {Message} from '@layer';
import rootScope from '@lib/rootScope';

/**
 * «Переслать» for a post (an album is several messages): VKgram's own window
 * (`VKForwardModal`) — the recent chats strip of the search window, the list of
 * dialogs with the search, the topics of a forum and an optional comment.
 * VKgram only says what to forward; the window sends it itself.
 */

// a channel with «Ограничить сохранение контента» (and the like) cannot be forwarded: Web K says so
export async function canForwardPost(messages: Message.message[]) {
  const results = await Promise.all(messages.map((message) => rootScope.managers.appMessagesManager.canForward(message)));
  return results.every(Boolean);
}

export async function openForwardPopup(messages: Message.message[]) {
  const byPeer: {[fromPeerId: PeerId]: number[]} = {};
  for(const message of messages) {
    (byPeer[message.peerId] ??= []).push(message.mid);
  }

  const {openVKForwardPopup} = await import('@/vkgram/components/VKForwardModal');
  openVKForwardPopup(byPeer);
}
