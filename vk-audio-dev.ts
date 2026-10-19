// dev page for the mobile «Друзья» tabs: loads vk-base.scss only, no app
import './src/vkgram/styles/vk-base.scss';

document.getElementById('night-toggle')?.addEventListener('click', () => {
  document.documentElement.classList.toggle('night');
});

const show = (id: string, showIt: boolean) => {
  const layer = document.getElementById(id);
  if(layer) layer.hidden = !showIt;
};

document.getElementById('show-add')?.addEventListener('click', () => show('add-layer', true));
document.getElementById('show-customize')?.addEventListener('click', () => show('customize-layer', true));

for(const id of ['add-layer', 'customize-layer']) {
  document.getElementById(id)?.querySelector('.vk-modal-close')?.addEventListener('click', () => show(id, false));
}

// the tabs of the strips and of the window: a click moves the active one (the real
// behavior — arrows, toggling — is covered by the component tests)
for(const list of document.querySelectorAll('.vk-tabs-list')) {
  list.addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement).closest('.vk-tab');
    if(!tab) return;
    for(const other of list.querySelectorAll('.vk-tab')) {
      other.classList.toggle('is-active', other === tab);
      other.setAttribute('aria-selected', other === tab ? 'true' : 'false');
    }
  });
}

// реплика плеера: часы идут, линия ползёт, клик и протяжка по ней перематывают,
// «пауза» останавливает; настоящий перематывает сам компонент (покрыто тестами)
{
  const total = 124; // «бретелька 8bit демо.mp3», 2:04
  let current = 18;
  let paused = false;
  const players = [...document.querySelectorAll<HTMLElement>('.vk-miniplayer')];

  if(players.length) {
    const fmt = (seconds: number) => {
      const whole = Math.max(0, Math.floor(seconds));
      return String(Math.floor(whole / 60)).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0');
    };

    const draw = () => {
      const progress = (current / total) * 100 + '%';
      for(const player of players) {
        const seek = player.querySelector<HTMLElement>('.vk-miniplayer-seek');
        if(!seek) continue;
        seek.style.setProperty('--vk-miniplayer-progress', progress);
        (seek.querySelector<HTMLElement>('.vk-miniplayer-fill')).style.width = progress;
        seek.setAttribute('aria-valuenow', String(Math.round(current)));
        const meta = player.querySelector<HTMLElement>('.vk-miniplayer-meta');
        if(meta) meta.textContent = fmt(current);
        const pause = player.querySelector<HTMLElement>('.vk-miniplayer-toggle .is-pause');
        const play = player.querySelector<HTMLElement>('.vk-miniplayer-toggle .is-play');
        if(pause && play) {
          pause.hidden = paused;
          play.hidden = !paused;
        }
      }
    };

    const seekTo = (player: HTMLElement, clientX: number) => {
      const seek = player.querySelector<HTMLElement>('.vk-miniplayer-seek');
      if(!seek) return;
      const rect = seek.getBoundingClientRect();
      current = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * total;
      draw();
    };

    for(const player of players) {
      const seek = player.querySelector<HTMLElement>('.vk-miniplayer-seek');
      // захват держит протяжку, когда указатель уходит с самой линии, — как у настоящего ползунка
      seek?.addEventListener('pointerdown', (e) => {
        seek.setPointerCapture((e as PointerEvent).pointerId);
        seekTo(player, e.clientX);
      });
      seek?.addEventListener('pointermove', (e) => {
        if(e.buttons & 1) seekTo(player, e.clientX);
      });
      player.querySelector('.vk-miniplayer-toggle')?.addEventListener('click', () => {
        paused = !paused;
        draw();
      });
    }

    window.setInterval(() => {
      if(paused) return;
      current = (current + 0.5) % total;
      draw();
    }, 500);

    draw();
  }
}
