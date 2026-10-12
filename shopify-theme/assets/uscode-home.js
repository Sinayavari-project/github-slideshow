/* US CODE — home page behaviour: hero video, sticky bar, tier dots, size guide, gifting ideas, memory preview, verify. */
(() => {
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(root) {
    if (!root || root.dataset.uhReady) return;
    root.dataset.uhReady = '1';

    // hero inset video: muted loop. Nothing downloads until it is on screen; no autoplay
    // for reduced motion or data saver (the poster stays).
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    root.querySelectorAll('[data-uh-autoplay]').forEach((v) => {
      v.muted = true;
      if (reduce() || saveData) { v.pause(); return; }
      if (!('IntersectionObserver' in window)) { v.play().catch(() => {}); return; }
      new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); });
      }, { rootMargin: '100px' }).observe(v);
    });

    // sticky bar once the hero buttons scroll away
    const sticky = root.querySelector('[data-uh-sticky]');
    const anchor = root.querySelector('[data-uh-sticky-anchor]');
    if (sticky && anchor) {
      let queued = false;
      const check = () => {
        queued = false;
        const on = anchor.getBoundingClientRect().bottom < 0;
        if (on === sticky.classList.contains('is-on')) return;
        sticky.classList.toggle('is-on', on);
        sticky.inert = !on;
      };
      window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(check); } }, { passive: true });
      check();
    }

    // tier carousel dots (phones)
    const track = root.querySelector('[data-uh-tiers]');
    if (track) {
      const cards = [...track.children];
      const dots = [...root.querySelectorAll('[data-uh-dot]')];
      const center = (i) => cards[i].offsetLeft - (track.clientWidth - cards[i].clientWidth) / 2;
      const paint = () => {
        const mid = track.scrollLeft + track.clientWidth / 2;
        let best = 0, d = Infinity;
        cards.forEach((c, i) => { const dd = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid); if (dd < d) { d = dd; best = i; } });
        dots.forEach((b, i) => b.setAttribute('aria-current', String(i === best)));
      };
      dots.forEach((b, i) => b.addEventListener('click', () => track.scrollTo({ left: center(i), behavior: reduce() ? 'auto' : 'smooth' })));
      track.addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
      const feat = cards.findIndex((c) => c.classList.contains('is-feat'));
      if (feat > 0 && track.scrollWidth > track.clientWidth) track.scrollLeft = center(feat);
      paint();
    }

    // size guide
    const guide = root.querySelector('[data-uh-guide]');
    if (guide) {
      root.querySelectorAll('[data-uh-guide-open]').forEach((b) => b.addEventListener('click', () => guide.showModal()));
      guide.querySelector('[data-uh-guide-close]').addEventListener('click', () => guide.close());
      guide.addEventListener('click', (e) => {
        const r = guide.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) guide.close();
      });
    }

    // gifting occasions
    const chips = [...root.querySelectorAll('[data-uh-occ]')];
    if (chips.length) {
      const lbl = root.querySelector('[data-uh-idea-label]');
      const txt = root.querySelector('[data-uh-idea-text]');
      chips.forEach((c) => c.addEventListener('click', () => {
        chips.forEach((o) => o.setAttribute('aria-pressed', String(o === c)));
        lbl.textContent = c.dataset.label;
        txt.textContent = c.dataset.idea;
      }));
    }

    // memory preview: play the video in place
    root.querySelectorAll('[data-uh-play]').forEach((btn) => btn.addEventListener('click', () => {
      const media = btn.closest('.uh-mp-media');
      const tpl = media.querySelector('template');
      if (!tpl) return;
      media.replaceChildren(tpl.content.cloneNode(true));
      const v = media.querySelector('video');
      if (v) { v.focus(); v.play().catch(() => {}); }
    }));

    // verify a piece: the form posts the number to the Verify page (a plain GET, works without JS);
    // on that page the lookup form finds the print's own page and opens it
    root.querySelectorAll('[data-uh-verify]').forEach((form) => {
      const input = form.querySelector('input');
      input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 3); });
      if (!form.hasAttribute('data-uh-lookup')) return;
      const status = form.parentElement.querySelector('[data-uh-lookup-status]');
      const base = form.dataset.base || '/pages/verify/';
      const suffix = form.dataset.suffix || '';
      const lookup = async (raw) => {
        const n = raw.replace(/\D/g, '').slice(0, 3).padStart(3, '0');
        status.textContent = `Checking ${n}…`;
        for (const handle of [n, n + suffix]) {
          try {
            const res = await fetch(base + handle, { method: 'HEAD', credentials: 'same-origin' });
            if (res.ok) { window.location.href = base + handle; return; }
          } catch (_) {}
        }
        status.textContent = `No piece numbered ${n} is on record. Check the number on your tag, or tap the chest logo.`;
      };
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!input.value) { input.focus(); return; }
        const url = new URL(window.location.href);
        url.searchParams.set('number', input.value);
        window.history.replaceState(window.history.state, '', url.toString());
        lookup(input.value);
      });
      const asked = new URLSearchParams(window.location.search).get('number');
      if (asked) { input.value = asked.replace(/\D/g, '').slice(0, 3); if (input.value) lookup(input.value); }
    });
  }

  const boot = (scope = document) => scope.querySelectorAll('.uh').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot());
  else boot();
  document.addEventListener('shopify:section:load', (e) => boot(e.target));
})();
