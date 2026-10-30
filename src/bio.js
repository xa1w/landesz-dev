import gsap from 'gsap';
import { createScene } from './scene.js';

/* backdrop: the same chrome form as the main site, centred and larger */
const { heroObj, uniforms } = createScene(document.getElementById('bg'), [], null);
heroObj.position.set(0, 0, 0);
heroObj.scale.setScalar(window.innerWidth < 720 ? 1.3 : 1.9);
uniforms.uAmp.value = 0.3;

/* local time */
const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
const tick = () => document.querySelectorAll('[data-time]').forEach((el) => (el.textContent = fmt.format(new Date())));
tick();
setInterval(tick, 15000);

/* typing bio */
const phrases = ['i build websites', 'and i take photos', 'developer & photographer', 'lyon, fr'];
const typeEl = document.querySelector('[data-type]');
let pi = 0, ci = 0, del = false;
function type() {
  const word = phrases[pi];
  ci += del ? -1 : 1;
  typeEl.textContent = word.slice(0, ci);
  let wait = del ? 45 : 85;
  if (!del && ci === word.length) { wait = 1800; del = true; }
  else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; wait = 350; }
  setTimeout(type, wait);
}
type();

/* discord presence via Lanyard: set data-discord-id on .presence to go live */
const presence = document.querySelector('.presence');
const discordId = presence.dataset.discordId;
if (discordId) {
  const dot = document.querySelector('[data-dot]');
  const text = document.querySelector('[data-presence]');
  const poll = async () => {
    try {
      const { data } = await (await fetch(`https://api.lanyard.rest/v1/users/${discordId}`)).json();
      dot.dataset.status = data.discord_status;
      const act = data.activities?.find((a) => a.type !== 4);
      text.textContent = act ? `${act.name}${act.details ? ' · ' + act.details : ''}` : (data.discord_status === 'offline' ? 'offline' : 'currently doing nothing');
    } catch { /* keep the static text */ }
  };
  poll();
  setInterval(poll, 30000);
}

/* player: works as soon as public/music/track.mp3 exists */
const player = document.querySelector('[data-player]');
const audio = player.querySelector('[data-audio]');
const cur = player.querySelector('[data-cur]');
const dur = player.querySelector('[data-dur]');
const prog = player.querySelector('[data-prog]');
const title = player.querySelector('[data-track]');
const icoPlay = player.querySelector('[data-ico-play]');
const icoPause = player.querySelector('[data-ico-pause]');
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
player.classList.add('is-empty');
audio.addEventListener('loadedmetadata', () => {
  player.classList.remove('is-empty');
  title.textContent = decodeURIComponent(audio.src.split('/').pop().replace(/\.[a-z0-9]+$/i, '')).replace(/[-_]/g, ' ');
  dur.textContent = mmss(audio.duration);
  const cover = new Image();
  cover.onload = () => player.querySelector('[data-cover]').replaceChildren(cover);
  cover.src = '/music/cover.jpg';
});
audio.addEventListener('timeupdate', () => {
  cur.textContent = mmss(audio.currentTime);
  prog.style.width = `${(audio.currentTime / audio.duration) * 100 || 0}%`;
});
const setIcons = () => { icoPlay.hidden = !audio.paused; icoPause.hidden = audio.paused; };
audio.addEventListener('play', setIcons);
audio.addEventListener('pause', setIcons);
player.querySelector('[data-toggle]').addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
player.querySelector('[data-back]').addEventListener('click', () => (audio.currentTime = Math.max(0, audio.currentTime - 10)));
player.querySelector('[data-fwd]').addEventListener('click', () => (audio.currentTime = Math.min(audio.duration, audio.currentTime + 10)));
player.querySelector('[data-seek]').addEventListener('click', (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
});

/* enter: dismiss the splash, start the music if there is any, reveal the cards */
const enter = document.querySelector('[data-enter]');
gsap.set('.card', { y: 28, opacity: 0 });
const go = () => {
  enter.removeEventListener('click', go);
  gsap.to(enter, { autoAlpha: 0, duration: 0.7, ease: 'power2.out', onComplete: () => enter.remove() });
  gsap.to('.card', { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.15 });
  if (!player.classList.contains('is-empty')) audio.play().catch(() => {});
};
enter.addEventListener('click', go);
