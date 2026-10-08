/* US CODE — homepage film: silent looping preview + full-screen player with sound.
   The film is started inside the click handler so browsers allow sound on the first tap. */
(() => {
  if (window.__uscodeFilm) return;
  window.__uscodeFilm = true;

  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tryPlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  let opener = null;

  function config() {
    const c = document.querySelector('[data-film-config]');
    return { start: c ? parseFloat(c.dataset.start) || 0 : 10, end: c ? parseFloat(c.dataset.end) || 0 : 17.5 };
  }
  const previews = () => [...document.querySelectorAll('[data-film-preview]')];

  // Silent preview: loop start..end only, never with sound.
  function bindPreview(v) {
    if (v.dataset.filmBound) return;
    v.dataset.filmBound = '1';
    const { start, end } = config();
    v.muted = true;
    v.defaultMuted = true;
    v.loop = false;
    const toStart = () => { try { v.currentTime = start; } catch (_) {} };
    v.addEventListener('loadedmetadata', toStart);
    v.addEventListener('timeupdate', () => {
      if (end > start && (v.currentTime >= end - 0.1 || v.currentTime < start - 0.1)) toStart();
    });
    v.addEventListener('ended', () => { toStart(); if (!reduce() && !isOpen()) tryPlay(v); });
    v.addEventListener('volumechange', () => { if (!v.muted) v.muted = true; });
    if (v.readyState >= 1) toStart();
    if (!reduce()) tryPlay(v);
  }

  // One dialog per page, even if the hero section is added twice.
  function dialog() {
    const all = [...document.querySelectorAll('[data-film-dialog]')];
    all.slice(1).forEach((d) => { if (!d.open) d.remove(); });
    return all[0] || null;
  }
  const isOpen = () => { const d = document.querySelector('[data-film-dialog]'); return !!(d && d.open); };

  function open(trigger) {
    const d = dialog();
    if (!d) return;
    const v = d.querySelector('[data-film-video]');
    opener = trigger;
    previews().forEach((p) => p.pause());
    if (!d.open) d.showModal();
    document.documentElement.classList.add('film-lock');
    if (!v) return;
    // Same user gesture: unmuted play is allowed on iOS, Android and desktop.
    try { v.currentTime = 0; } catch (_) {}
    v.muted = false;
    v.volume = 1;
    const p = v.play();
    // If the browser still refuses, leave it paused with native controls showing; don't retry muted.
    if (p && p.catch) p.catch(() => {});
  }

  function onClose(e) {
    const d = e.currentTarget;
    const v = d.querySelector('[data-film-video]');
    if (v) v.pause();
    document.documentElement.classList.remove('film-lock');
    if (opener && opener.isConnected) opener.focus();
    opener = null;
    if (!reduce()) previews().forEach(tryPlay);
  }

  function bindDialog(d) {
    if (!d || d.dataset.filmBound) return;
    d.dataset.filmBound = '1';
    d.addEventListener('close', onClose);
    d.addEventListener('click', (e) => {
      // Close button, or a click on the backdrop / empty stage around the video.
      if (e.target.closest('[data-film-close]') || e.target === d || e.target.hasAttribute('data-film-stage')) d.close();
    });
    // 'ended': hold on the last frame, keep the dialog open.
  }

  function init() {
    previews().forEach(bindPreview);
    bindDialog(dialog());
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-film-open]');
    if (t) { e.preventDefault(); open(t); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('shopify:section:load', init);
  document.addEventListener('shopify:section:unload', () => document.documentElement.classList.remove('film-lock'));
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.addEventListener) mq.addEventListener('change', () => previews().forEach((v) => (reduce() ? v.pause() : !isOpen() && tryPlay(v))));
})();
