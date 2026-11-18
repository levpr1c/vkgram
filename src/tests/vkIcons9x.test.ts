import {afterEach, describe, expect, it, vi} from 'vitest';
import {render} from 'solid-js/web';
import {ICONS_9X} from '@/vkgram/assets/icons9x';
import VKIcon, {ICONS} from '@/vkgram/components/VKIcons';
import type {VKIconName} from '@/vkgram/components/VKIcons';

// the icon set talks to theme changes through rootScope: keep the listener so a
// test can announce a theme switch the way the theme layer does
const {handlers} = vi.hoisted(() => ({
  handlers: new Map<string, () => void>()
}));

vi.mock('@lib/rootScope', () => ({
  default: {
    myId: 1,
    managers: {},
    addEventListener: (event: string, cb: () => void) => handlers.set(event, cb),
    removeEventListener: vi.fn()
  }
}));

const dispose: (() => void)[] = [];

afterEach(() => {
  while(dispose.length) dispose.pop()?.();
  document.body.innerHTML = '';
  document.documentElement.classList.remove('skin-serverhub');
  handlers.get('theme_changed')?.();
});

const mount = (name: VKIconName, size?: number) => {
  const root = document.createElement('div');
  document.body.append(root);
  dispose.push(render(() => VKIcon({name, size}), root));
  return root;
};

const setSkin = (on: boolean) => {
  document.documentElement.classList.toggle('skin-serverhub', on);
  handlers.get('theme_changed')?.();
};

describe('ICONS_9X', () => {
  it('maps only names the line icon set knows', () => {
    const names = Object.keys(ICONS_9X);
    expect(names.length).toBeGreaterThan(0);
    for(const name of names) {
      // ICONS is a full record of VKIconName, so its keys are exactly the union
      expect(Object.keys(ICONS)).toContain(name);
      expect(ICONS_9X[name as VKIconName]).toMatch(/\.ico/);
    }
  });

  it('draws a mapped name as a pixel icon while the Windows skin is on', () => {
    setSkin(true);
    const root = mount('profile');

    const img = root.querySelector('img');
    expect(img).toBeTruthy();
    expect(root.querySelector('svg')).toBeNull();
    expect(img!.getAttribute('src')).toBe(ICONS_9X.profile);
    expect(img!.getAttribute('width')).toBe('16');
    expect(img!.getAttribute('height')).toBe('16');
    expect(img!.getAttribute('alt')).toBe('');
    expect(img!.getAttribute('aria-hidden')).toBe('true');
    expect(img!.getAttribute('style')).toContain('image-rendering');
  });

  it('keeps a name with no Win9x counterpart on its line glyph', () => {
    setSkin(true);
    const root = mount('gift');

    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('svg')).toBeTruthy();
  });

  it('falls back to the line glyph when the skin is off', () => {
    setSkin(false);
    const root = mount('profile');

    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('svg')).toBeTruthy();
  });
});
