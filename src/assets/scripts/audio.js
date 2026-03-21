
const PLAY_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M5 3l9 5-9 5V3z" fill="currentColor"/></svg>`;
const PAUSE_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor"/><rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor"/></svg>`;

function formatTime(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function setupPlayer(container) {
  const src = container.dataset.src;
  if (!src) return;

  const audio = new Audio();
  audio.preload = 'metadata';
  audio.src = src;

  const playBtn = container.querySelector('.audio-player__play');
  const progressEl = container.querySelector('.audio-player__progress');
  const barEl = container.querySelector('.audio-player__bar');
  const timeEl = container.querySelector('.audio-player__time');

  const setIcon = (isPlaying) => {
    playBtn.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    playBtn.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Воспроизвести');
  };

  playBtn.addEventListener('click', () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    document.querySelectorAll('.audio-player').forEach((p) => {
      if (p !== container && p._audio && !p._audio.paused) {
        p._audio.pause();
      }
    });
    audio.play().catch(() => {});
  });

  audio.addEventListener('play', () => setIcon(true));
  audio.addEventListener('pause', () => setIcon(false));

  audio.addEventListener('ended', () => {
    setIcon(false);
    barEl.style.width = '0%';
    if (isFinite(audio.duration)) {
      timeEl.textContent = `0:00 / ${formatTime(audio.duration)}`;
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    timeEl.textContent = `0:00 / ${formatTime(audio.duration)}`;
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    barEl.style.width = `${pct}%`;
    timeEl.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  });

  progressEl.addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = progressEl.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  });

  container._audio = audio;
}

export function initAudio() {
  document.querySelectorAll('.audio-player').forEach(setupPlayer);
}
