import {Accessor, createSignal} from 'solid-js';

type Args = {
  // the position the player reports (createPlaybackTime)
  time: Accessor<number>,
  // moves the player and at once reports the position back (createPlaybackTime)
  seekTo: (seconds: number) => void,
  // the length of the track, seconds
  duration: () => number,
  // is dragging possible at all: the slider of «Аудиозаписей» sleeps while nothing plays
  enabled?: () => boolean
};

/**
 * Протяжка ползунка позиции: пока указатель зажат, ползунок следует за ним точно, а плеер не
 * трогается вовсе — позиция уходит в него один раз, при отпускании. Seek на каждое движение
 * (и «timeupdate»/«seeked» от каждого промежуточного места) дёргает и звук, и заливку.
 */
export default function createTrackScrub(args: Args) {
  const [scrub, setScrub] = createSignal<number>();

  const positionFrom = (event: PointerEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    return ratio * args.duration();
  };

  const finish = () => {
    const value = scrub();
    if(value !== undefined) args.seekTo(value);
    setScrub(undefined);
  };

  return {
    // что показывает ползунок: указатель, пока тянешь; позицию плеера — в остальное время
    shownTime: () => scrub() ?? args.time(),
    onPointerDown: (event: PointerEvent) => {
      if((args.enabled && !args.enabled()) || !args.duration()) return;
      // захват держит протяжку, когда указатель уходит с самой линии
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      setScrub(positionFrom(event));
    },
    onPointerMove: (event: PointerEvent) => {
      if(scrub() !== undefined && event.buttons & 1) setScrub(positionFrom(event));
    },
    // отпускание и срыв (ушло касание) — на обоих позиция коммитится один раз
    onPointerFinish: () => finish()
  };
}
