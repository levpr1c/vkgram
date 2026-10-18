import {createSignal} from 'solid-js';
import type {Dialog} from '@appManagers/appMessagesManager';
import rootScope from '@lib/rootScope';
import {FOLDER_ID_ALL} from '@appManagers/constants';
import getDialogIndex from '@appManagers/utils/dialogs/getDialogIndex';
import {isDialog} from '@appManagers/utils/dialogs/isDialog';

const PAGE_LIMIT = 100;

/**
 * Постраничная выдача диалогов основной папки — тот же источник, что читает
 * список чатов (`dialogsStorage.getDialogs`), страницами по сто, от меньшего
 * индекса страницы. Живёт, пока жив владелец; `canLoadMore` говорит, есть ли
 * ещё, `query` делает поиск по загруженным страницам глубже.
 */
export default function createDialogPages(query: () => string) {
  const [dialogs, setDialogs] = createSignal<Dialog[]>([]);
  const [loading, setLoading] = createSignal(true);

  let offsetIndex: number | undefined;
  let isEnd = false;
  let alive = true;
  const loadPage = async() => {
    if(!alive || isEnd) return;
    setLoading(true);
    try {
      const result = await rootScope.managers.dialogsStorage.getDialogs({
        filterId: FOLDER_ID_ALL,
        offsetIndex,
        limit: PAGE_LIMIT,
        skipMigrated: true
      });
      if(!alive) return;
      const page = result.dialogs.filter(isDialog) as Dialog[];
      setDialogs((prev) => {
        const seen = new Set(prev.map((dialog) => dialog.peerId));
        return prev.concat(page.filter((dialog) => !seen.has(dialog.peerId)));
      });
      // the next page starts at the smallest dialog index of this page, the way
      // the chat list itself pages through the folder
      const nextOffset = page.reduce((min, dialog) => {
        const index = getDialogIndex(dialog);
        return index !== undefined && index < min ? index : min;
      }, offsetIndex ?? Infinity);
      isEnd = !page.length || nextOffset === Infinity || nextOffset === offsetIndex ||
        (result.isEnd && page.length < PAGE_LIMIT);
      if(!isEnd) offsetIndex = nextOffset;
    } catch(err) {
      console.error('VKgram: getDialogs failed', err);
      isEnd = true;
    } finally {
      if(alive) setLoading(false);
    }
  };
  loadPage();
  return {
    dialogs,
    loading,
    loadPage,
    // a search that found nothing in the loaded pages may still find more deeper in the folder
    canLoadMore: () => !isEnd && (!!query() || loading() || dialogs().length > 0),
    dispose: () => { alive = false; }
  };
}
