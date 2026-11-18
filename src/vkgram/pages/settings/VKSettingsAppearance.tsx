import {createUniqueId, For, Show} from 'solid-js';
import {useAppSettings} from '@stores/appSettings';
import themeController from '@helpers/themeController';
import type {AppTheme} from '@config/state';

/**
 * «Оформление» — the theme picker in VKgram's own settings page. It drives the same
 * `settings.theme` radio as Web K's General settings (`sidebarLeft/tabs/generalSettings.tsx`),
 * so both screens stay in sync, but it is reachable from the VK sidebar, which never
 * exposes Web K's tab list.
 *
 * Windows 98 is not only a palette: the theme's name puts `skin-serverhub` on <html>, which
 * `scss/partials/_skinServerHub.scss` turns into bevels, square corners and the system font.
 */

type ThemeOption = {
  value: AppTheme['name'],
  title: string,
  note?: string
};

const THEMES: ThemeOption[] = [
  {
    value: 'serverhub',
    title: 'Server Hub',
    note: 'серые окна, объёмные рамки, системный шрифт; без обоев — чат на плоском фоне'
  },
  {value: 'day', title: 'Классическая', note: 'зелёные исходящие сообщения Telegram'},
  {value: 'light', title: 'Светлая', note: 'синие исходящие сообщения'},
  {value: 'night', title: 'Ночная'},
  {value: 'tinted', title: 'Тёмно-синяя', note: 'фон подстраивается под цвет акцента'},
  {value: 'system', title: 'Как в системе', note: 'светлая или ночная — по настройке устройства'}
];

export default function VKSettingsAppearance() {
  const name = createUniqueId();
  const [appSettings] = useAppSettings();

  return (
    <>
      <fieldset class="vk-settings-fieldset">
        <legend class="vk-settings-legend">Тема оформления</legend>
        <For each={THEMES}>
          {(theme) => (
            <label class="vk-settings-radio">
              <input
                type="radio"
                name={name}
                checked={appSettings.theme === theme.value}
                onChange={(e) => e.currentTarget.checked && themeController.switchTheme(theme.value)}
              />
              {theme.title}
              <Show when={theme.note}>
                <span class="vk-page-text-secondary"> — {theme.note}</span>
              </Show>
            </label>
          )}
        </For>
      </fieldset>
      <p class="vk-page-text vk-page-text-secondary">
        Тема применяется сразу ко всему клиенту и запоминается в этом браузере. Обои и акценты
        настраиваются отдельно, в настройках фона чата.
      </p>
    </>
  );
}
