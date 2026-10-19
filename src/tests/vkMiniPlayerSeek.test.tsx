import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render} from 'solid-js/web';
import VKMiniPlayer from '@/vkgram/components/VKMiniPlayer';

// стенд вместо Web K'овского контроллера: настоящий тянет worker, rootScope и менеджеров
const controller = vi.hoisted(() => {
  const listeners: Record<string, Set<() => void>> = {};
  const media = {
    currentTime: 0,
    duration: 0,
    paused: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  let doc: any;
  return {
    media,
    setDoc(value: any) { doc = value; },
    addEventListener: vi.fn((name: string, fn: () => void) => {
      (listeners[name] ??= new Set()).add(fn);
    }),
    removeEventListener: vi.fn((name: string, fn: () => void) => {
      listeners[name]?.delete(fn);
    }),
    getPlayingDetails: vi.fn(() => doc ? {doc, media} : undefined),
    toggle: vi.fn(),
    stop: vi.fn(),
    previous: vi.fn(),
    next: vi.fn()
  };
});

vi.mock('@components/appMediaPlaybackController', () => ({default: controller}));

// в jsdom нет захвата указателя
if(!(Element.prototype as any).setPointerCapture) {
  (Element.prototype as any).setPointerCapture = vi.fn();
}

/** играет «бретелька 8bit демо.mp3» (2 минуты); позицию расставляет тест */
const playTrack = (currentTime: number) => {
  controller.media.currentTime = currentTime;
  controller.media.duration = 120;
  controller.media.paused = false;
  controller.setDoc({id: 1, file_name: 'бретелька 8bit демо.mp3', duration: 120});
};

const mount = (variant: 'header' | 'drawer' = 'header') => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const dispose = render(() => <VKMiniPlayer variant={variant} />, div);
  return {div, dispose};
};

/** линия ползунка: как будто отрисована на 200px от левого края */
const grabSeek = (div: HTMLElement) => {
  const seek = div.querySelector<HTMLElement>('.vk-miniplayer-seek');
  expect(seek).toBeTruthy();
  seek!.getBoundingClientRect = () => ({left: 0, top: 0, width: 200, height: 2} as DOMRect);
  return seek!;
};

describe('Ползунок мини-плеера', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    controller.media.currentTime = 0;
    controller.media.duration = 0;
    controller.media.paused = true;
    controller.setDoc(null);
  });

  it('пока ничего не играет, плеер не нарисован', () => {
    const {div, dispose} = mount();
    expect(div.querySelector('.vk-miniplayer')).toBeNull();
    dispose();
  });

  it('линия показывает позицию: четверть трека — четверть заливки', () => {
    playTrack(30);
    const {div, dispose} = mount();

    expect(div.textContent).toContain('бретелька 8bit демо.mp3');
    const seek = div.querySelector<HTMLElement>('.vk-miniplayer-seek')!;
    expect(seek.getAttribute('role')).toBe('slider');
    expect(seek.getAttribute('aria-valuenow')).toBe('30');
    expect(seek.getAttribute('aria-valuemax')).toBe('120');
    expect(seek.querySelector<HTMLElement>('.vk-miniplayer-fill')!.style.width).toBe('25%');
    dispose();
  });

  it('клик по линии перематывает на это место трека', () => {
    playTrack(0);
    const {div, dispose} = mount();
    const seek = grabSeek(div);

    seek.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, clientX: 150}));
    seek.dispatchEvent(new MouseEvent('pointerup', {bubbles: true}));

    expect(controller.media.currentTime).toBe(90);
    dispose();
  });

  it('пока тянешь, ползунок следует за указателем, но плеер не дёргается; отпустил — перемотка', () => {
    playTrack(0);
    const {div, dispose} = mount();
    const seek = grabSeek(div);

    seek.dispatchEvent(new MouseEvent('pointerdown', {bubbles: true, clientX: 150}));
    const move = new MouseEvent('pointermove', {bubbles: true, clientX: 100});
    Object.defineProperty(move, 'buttons', {value: 1});
    seek.dispatchEvent(move);

    // в середине протяжки позиция плеера ещё на месте, линия уже у указателя
    expect(controller.media.currentTime).toBe(0);
    expect(seek.querySelector<HTMLElement>('.vk-miniplayer-fill')!.style.width).toBe('50%');

    seek.dispatchEvent(new MouseEvent('pointerup', {bubbles: true}));
    expect(controller.media.currentTime).toBe(60);
    dispose();
  });

  it('стрелки на сфокусированной линии двигают позицию на 5 секунд', () => {
    playTrack(30);
    const {div, dispose} = mount();
    const seek = grabSeek(div);

    seek.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true, cancelable: true}));
    expect(controller.media.currentTime).toBe(35);

    seek.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, cancelable: true}));
    expect(controller.media.currentTime).toBe(30);
    dispose();
  });

  it('в боковом меню (drawer) линия есть так же', () => {
    playTrack(0);
    const {div, dispose} = mount('drawer');

    expect(div.querySelector('.vk-miniplayer.is-drawer .vk-miniplayer-seek')).toBeTruthy();
    dispose();
  });
});
