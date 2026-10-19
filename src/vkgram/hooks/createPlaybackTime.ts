import {Accessor, createEffect, createSignal, onCleanup} from 'solid-js';
import appMediaPlaybackController from '@components/appMediaPlaybackController';

/**
 * Current position (seconds) of the track Web K's global player is playing. `playing` is the
 * accessor of `createNowPlaying()`: it changes on every play / pause / track switch. While a
 * track is loaded the position is re-read twice a second; «timeupdate» и «seeked» доносят
 * перемотку сразу, не дожидаясь ближайшего тика.
 *
 * Returns `[time, seekTo]`: `seekTo` двигает позицию плеера и тут же отдаёт её дальше —
 * ползунок не ждёт, когда сядет «seeked», и не мигает между старой и новой позицией.
 */
export default function createPlaybackTime(playing: Accessor<{paused: boolean} | undefined>): [Accessor<number>, (seconds: number) => void] {
  const [time, setTime] = createSignal(0);
  const read = () => setTime(appMediaPlaybackController.getPlayingDetails()?.media?.currentTime ?? 0);

  const seekTo = (seconds: number) => {
    const media = appMediaPlaybackController.getPlayingDetails()?.media;
    if(!media) return;
    media.currentTime = Math.max(0, Math.min(media.duration || seconds, seconds));
    setTime(media.currentTime);
  };

  createEffect(() => {
    const state = playing();
    read();
    if(!state) return;

    const interval = window.setInterval(read, 500);
    onCleanup(() => window.clearInterval(interval));

    const media = appMediaPlaybackController.getPlayingDetails()?.media;
    if(media) {
      media.addEventListener('timeupdate', read);
      media.addEventListener('seeked', read);
      onCleanup(() => {
        media.removeEventListener('timeupdate', read);
        media.removeEventListener('seeked', read);
      });
    }
  });

  return [time, seekTo];
}
