import {Show} from 'solid-js';
import getAudioTitles from '@appManagers/utils/docs/getAudioTitles';
import appMediaPlaybackController from '@components/appMediaPlaybackController';
import createNowPlaying from '@/vkgram/hooks/createNowPlaying';
import createPlaybackTime from '@/vkgram/hooks/createPlaybackTime';
import createTrackScrub from '@/vkgram/hooks/createTrackScrub';
import {formatAudioTitles, formatTime} from '@/vkgram/utils/audio';
import VKIcon from '@/vkgram/components/VKIcons';

export type VKMiniPlayerProps = {
  // header: a compact dark-blue field in the top bar (desktop);
  // drawer: a light block at the top of the side menu (mobile)
  variant: 'header' | 'drawer'
};

/**
 * Mini player: previous / play-pause / next, the title of the track, «time • performer» and a
 * close button. Under it — a thin seek line across the player's whole width: a click or a drag
 * on it (← / → on it) moves the position, like the slider of «Аудиозаписей». While dragging the
 * line follows the pointer and the position commits once, on release. Not drawn while nothing
 * plays. There is no player of its own — it only drives Web K's global one
 * (`appMediaPlaybackController`); «✕» stops it.
 */
export default function VKMiniPlayer(props: VKMiniPlayerProps) {
  const playing = createNowPlaying();
  const [time, seekTo] = createPlaybackTime(playing);

  const titles = () => playing() && getAudioTitles(playing().doc);
  const title = () => titles()?.title || formatAudioTitles(playing().doc);
  const performer = () => titles()?.performer;

  const duration = () => appMediaPlaybackController.getPlayingDetails()?.media?.duration || playing()?.doc?.duration || 0;
  const scrub = createTrackScrub({time, seekTo, duration});
  const progress = () => duration() ? Math.min(1, scrub.shownTime() / duration()) : 0;

  return (
    <Show when={playing()}>
      <div
        class="vk-miniplayer"
        classList={{'is-drawer': props.variant === 'drawer'}}
        role="group"
        aria-label="Плеер"
      >
        <div class="vk-miniplayer-controls">
          <button
            type="button"
            class="vk-miniplayer-button"
            aria-label="Предыдущий трек"
            onClick={() => appMediaPlaybackController.previous()}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M2 2.5h1.8v11H2zM14 2.5v11L5.6 8z" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            class="vk-miniplayer-button"
            aria-label={playing().paused ? 'Продолжить' : 'Пауза'}
            onClick={() => appMediaPlaybackController.toggle()}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <Show
                when={playing().paused}
                fallback={<path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor" />}
              >
                <path d="M4 2.2v11.6L13.5 8z" fill="currentColor" />
              </Show>
            </svg>
          </button>
          <button
            type="button"
            class="vk-miniplayer-button"
            aria-label="Следующий трек"
            onClick={() => appMediaPlaybackController.next()}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M14 2.5h-1.8v11H14zM2 2.5v11L10.4 8z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div class="vk-miniplayer-info">
          <span class="vk-miniplayer-title" title={title()}>{title()}</span>
          <span class="vk-miniplayer-meta">
            {formatTime(scrub.shownTime())}
            <Show when={performer()}>{' • '}{performer()}</Show>
          </span>
        </div>

        <button
          type="button"
          class="vk-miniplayer-button vk-miniplayer-close"
          aria-label="Закрыть плеер"
          onClick={() => appMediaPlaybackController.stop()}
        >
          <VKIcon name="close" size={14} />
        </button>

        {/* ползунок: тонкая линия по нижнему краю плеера во всю его ширину */}
        <div
          class="vk-miniplayer-seek"
          role="slider"
          aria-label="Позиция"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration())}
          aria-valuenow={Math.round(scrub.shownTime())}
          style={{'--vk-miniplayer-progress': progress() * 100 + '%'}}
          onPointerDown={scrub.onPointerDown}
          onPointerMove={scrub.onPointerMove}
          onPointerUp={scrub.onPointerFinish}
          onPointerCancel={scrub.onPointerFinish}
          onKeyDown={(event) => {
            if(event.key === 'ArrowRight') {
              event.preventDefault();
              seekTo(time() + 5);
            } else if(event.key === 'ArrowLeft') {
              event.preventDefault();
              seekTo(time() - 5);
            }
          }}
        >
          <span class="vk-miniplayer-fill" style={{width: progress() * 100 + '%'}} />
        </div>
      </div>
    </Show>
  );
}
