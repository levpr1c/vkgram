import rootScope from '@lib/rootScope';
import {createRoot, createSignal} from 'solid-js';

/**
 * Whether the Windows 95/98 skin is on. The theme layer keeps the class on
 * <html> (`themeController._setTheme`) and announces every change with
 * `theme_changed`, so one signal serves every icon instead of a listener per
 * component.
 */
const serverHubSkin = createRoot(() => {
  const [active, setActive] = createSignal(
    typeof document !== 'undefined' && document.documentElement.classList.contains('skin-serverhub')
  );

  // tests that stub rootScope with only the fields they need have no event bus
  rootScope.addEventListener?.('theme_changed', () => {
    setActive(document.documentElement.classList.contains('skin-serverhub'));
  });

  return active;
});

export default function useServerHubSkin() {
  return serverHubSkin;
}
