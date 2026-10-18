// dev page for the forward window: loads vk-base.scss only, no app
import './src/vkgram/styles/vk-base.scss';

// ночная тема — переключателем (как в остальных харнессах)
document.getElementById('night-toggle')?.addEventListener('click', () => {
  document.documentElement.classList.toggle('night');
});

// живой минимум: клик по строке/кругу выбирает, клик по форуму раскрывает темы,
// счётчик и кнопка «Переслать» следят за выбором
const modal = document.querySelector<HTMLElement>('.vk-modal')!;

const setPicked = (button: HTMLElement, picked: boolean) => {
  button.classList.toggle('is-current', picked);
  button.classList.toggle('is-picked', picked);
  button.setAttribute('aria-pressed', String(picked));

  const check = button.querySelector<HTMLElement>('.vk-chats-picker-check');
  check?.classList.toggle('is-checked', picked);
  check?.replaceChildren(...picked ? [document.querySelector<HTMLTemplateElement>('#vk-check-template')!.content.cloneNode(true) as Node] : []);

  const stripCheck = button.querySelector<HTMLElement>('.vk-forward-strip-check');
  stripCheck?.toggleAttribute('hidden', !picked);
};

const recount = () => {
  const count = modal.querySelectorAll('.vk-picker-row.is-current, .vk-forward-strip-item.is-picked').length;
  const counter = modal.querySelector<HTMLElement>('.vk-forward-count')!;
  counter.textContent = `Выбрано: ${count}`;
  counter.toggleAttribute('hidden', count === 0);
  (modal.querySelector<HTMLButtonElement>('.vk-modal-foot .vk-button:not(.vk-button-secondary)')!).disabled = count === 0;
};

for(const button of Array.from(modal.querySelectorAll<HTMLButtonElement>('.vk-forward-strip-item'))) {
  const avatar = button.querySelector('.vk-forward-strip-avatar')!;
  if(!avatar.querySelector('.vk-forward-strip-check')) {
    const check = document.createElement('span');
    check.className = 'vk-forward-strip-check';
    check.hidden = true;
    check.setAttribute('aria-hidden', 'true');
    avatar.append(check);
  }

  button.addEventListener('click', () => {
    setPicked(button, !button.classList.contains('is-picked'));
    recount();
  });
}

for(const button of Array.from(modal.querySelectorAll<HTMLButtonElement>('.vk-picker-row'))) {
  const isForumRow = !!button.querySelector('.vk-forward-chevron');
  if(isForumRow) {
    button.addEventListener('click', () => {
      const expanded = button.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', String(expanded));
      button.closest('li')!.querySelector('.vk-forward-topics')!.toggleAttribute('hidden', !expanded);
    });
    continue;
  }

  button.addEventListener('click', () => {
    setPicked(button, !button.classList.contains('is-current'));
    recount();
  });
}

recount();
