/* US CODE — product page: gallery, full screen, options, size guide, add to cart, sticky bar. */
(() => {
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function money(cents, format) {
    const amount = (cents / 100).toFixed(2);
    const withCommas = amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const label = format
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100).toString())
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, amount.replace('.', ','))
      .replace(/\{\{\s*amount\s*\}\}/, withCommas);
    return label.replace(/[.,]00(?!\d)/, '');
  }

  function gallery(root) {
    const gal = root.querySelector('[data-gallery]');
    if (!gal) return { goToMedia() {} };
    const track = gal.querySelector('[data-track]');
    const slides = [...gal.querySelectorAll('[data-slide]')];
    const thumbs = [...gal.querySelectorAll('[data-thumb]')];
    const segs = [...gal.querySelectorAll('.uscode-pdp__progress span')];
    const counter = gal.querySelector('[data-counter]');
    const prev = gal.querySelector('[data-prev]');
    const next = gal.querySelector('[data-next]');
    const openBtn = gal.querySelector('[data-full-open]');
    const closeBtn = gal.querySelector('[data-full-close]');
    let idx = 0;
    let returnFocus = null;

    function paint(i) {
      idx = i;
      if (counter) counter.textContent = `${i + 1} / ${slides.length}`;
      thumbs.forEach((t, n) => t.setAttribute('aria-current', String(n === i)));
      segs.forEach((s, n) => s.classList.toggle('is-on', n === i));
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
      const t = thumbs[i];
      if (t && t.parentElement.scrollWidth > t.parentElement.clientWidth) {
        t.parentElement.scrollLeft = t.offsetLeft - t.parentElement.clientWidth / 2 + t.clientWidth / 2;
      }
    }
    function goTo(i, instant) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      if (Math.abs(track.scrollLeft - i * track.clientWidth) > 1) {
        steering = true;
        clearTimeout(settleTimer);
        settleTimer = setTimeout(settle, 700);
      }
      track.scrollTo({ left: i * track.clientWidth, behavior: instant || reduceMotion() ? 'auto' : 'smooth' });
      paint(i);
    }
    // while a button-driven scroll animates, keep the target index instead of the in-between ones
    let raf = 0;
    let settleTimer = 0;
    let steering = false;
    const settle = () => { steering = false; };
    track.addEventListener('scroll', () => {
      if (steering) { clearTimeout(settleTimer); settleTimer = setTimeout(settle, 120); return; }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        if (i !== idx && slides[i]) paint(i);
      });
    }, { passive: true });
    track.addEventListener('scrollend', () => { clearTimeout(settleTimer); settle(); });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(idx - 1); }
    });
    thumbs.forEach((t) => t.addEventListener('click', () => goTo(Number(t.dataset.thumb))));
    if (prev) prev.addEventListener('click', () => goTo(idx - 1));
    if (next) next.addEventListener('click', () => goTo(idx + 1));

    function setFull(on) {
      if (on === gal.classList.contains('is-full')) return;
      const keep = idx;
      if (on) returnFocus = document.activeElement;
      gal.classList.toggle('is-full', on);
      document.documentElement.classList.toggle('uscode-pdp-lock', on);
      if (on) { gal.setAttribute('role', 'dialog'); gal.setAttribute('aria-modal', 'true'); }
      else { gal.setAttribute('role', 'region'); gal.removeAttribute('aria-modal'); }
      requestAnimationFrame(() => { goTo(keep, true); });
      if (on) closeBtn.focus();
      else if (returnFocus && returnFocus.focus) returnFocus.focus();
    }
    if (openBtn) openBtn.addEventListener('click', () => setFull(true));
    closeBtn.addEventListener('click', () => setFull(false));
    slides.forEach((s) => s.addEventListener('click', () => { if (slides.length && s.querySelector('img')) setFull(true); }));
    gal.addEventListener('keydown', (e) => {
      if (!gal.classList.contains('is-full')) return;
      if (e.key === 'Escape') { e.preventDefault(); setFull(false); return; }
      if (e.key === 'ArrowRight' && e.target !== track) goTo(idx + 1);
      if (e.key === 'ArrowLeft' && e.target !== track) goTo(idx - 1);
      if (e.key === 'Tab') {
        const f = [...gal.querySelectorAll('button:not([disabled]), [tabindex="0"]')].filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', () => goTo(idx, true));

    const start = Number(gal.dataset.index) || 0;
    if (start) requestAnimationFrame(() => goTo(start, true));
    else paint(0);

    return {
      goToMedia(id) {
        const i = slides.findIndex((s) => s.dataset.mediaId === String(id));
        if (i >= 0) goTo(i);
      },
    };
  }

  function init(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    const variants = JSON.parse(root.querySelector('[data-variants]').textContent || '[]');
    const format = JSON.parse(root.querySelector('[data-money-format]').textContent || '"${{amount}}"');
    const form = root.querySelector('[data-product-form]');
    const idInput = root.querySelector('[data-variant-id]');
    const atc = root.querySelector('[data-atc]');
    const atcLabel = root.querySelector('[data-atc-label]');
    const sizeIndex = Number(root.dataset.sizeIndex);
    const tierIndex = Number(root.dataset.tierIndex);
    const uploadTier = root.dataset.uploadTier;
    const sizeGroup = sizeIndex >= 0 ? root.querySelector(`[data-option-group="${sizeIndex}"]`) : null;
    const sizeError = root.querySelector('[data-size-error]');
    const upload = root.querySelector('[data-upload]');
    const uploadInput = root.querySelector('[data-upload-input]');
    const uploadError = root.querySelector('[data-upload-error]');
    const soldNote = root.querySelector('[data-soldout-note]');
    const sticky = root.querySelector('[data-sticky]');
    const stickyBtn = root.querySelector('[data-sticky-atc]');
    const stickyMeta = root.querySelector('[data-sticky-meta]');
    const toastEl = root.querySelector('[data-toast]');
    const left = root.dataset.left;
    const gal = gallery(root);
    const optionCount = variants.length ? variants[0].options.length : 0;

    const inputsFor = (i) => [...root.querySelectorAll(`[data-option="${i}"]`)];
    function selected() {
      const picked = [];
      for (let i = 0; i < optionCount; i++) {
        const els = inputsFor(i);
        const fixed = els.find((el) => el.type === 'hidden');
        const checked = els.find((el) => el.checked);
        picked[i] = fixed ? fixed.value : checked ? checked.value : null;
      }
      return picked;
    }
    const matches = (v, picked, skip) => v.options.every((o, i) => i === skip || picked[i] == null || picked[i] === o);

    let lastMedia = null;
    function update(fromUser) {
      if (!form || !variants.length) return;
      const picked = selected();

      // sizes that can't be bought with the other choices
      const soldSizes = [];
      for (let i = 0; i < optionCount; i++) {
        inputsFor(i).forEach((el) => {
          if (el.type !== 'radio') return;
          const ok = variants.some((v) => v.available && v.options[i] === el.value && matches(v, picked, i));
          if (i === sizeIndex) {
            el.disabled = !ok;
            if (!ok) soldSizes.push(el.value);
            if (!ok && el.checked) { el.checked = false; picked[i] = null; }
          }
          const label = root.querySelector(`label[for="${el.id}"]`);
          if (label && i === sizeIndex) label.setAttribute('aria-label', ok ? el.value : `${el.value}, sold out`);
        });
        const out = root.querySelector(`[data-option-value="${i}"]`);
        if (out) out.textContent = picked[i] || '';
      }
      if (soldNote) {
        soldNote.textContent = soldSizes.length ? `${soldSizes.join(', ')} sold out.` : '';
      }

      const needSize = sizeIndex >= 0 && picked[sizeIndex] == null;
      const candidates = variants.filter((v) => matches(v, picked));
      const variant = needSize ? null : candidates[0] || null;
      const priceFrom = candidates.filter((v) => v.available).concat(candidates)[0];
      const shown = variant || priceFrom;
      const anyAvailable = candidates.some((v) => v.available);

      root.querySelectorAll('[data-price]').forEach((el) => { if (shown) el.textContent = money(shown.price, format); });
      const cmp = root.querySelector('[data-compare]');
      if (cmp && shown) {
        cmp.hidden = !(shown.compare_at_price > shown.price);
        cmp.textContent = money(shown.compare_at_price, format);
      }

      const price = shown ? money(shown.price, format) : '';
      if (!anyAvailable || (variant && !variant.available)) {
        atc.disabled = true;
        atcLabel.textContent = 'Sold out';
      } else if (needSize) {
        atc.disabled = false;
        atcLabel.textContent = `Select a size — ${price}`;
      } else {
        atc.disabled = false;
        atcLabel.textContent = `Add to cart — ${price}`;
      }
      if (variant) idInput.value = variant.id;

      if (tierIndex >= 0) {
        root.querySelectorAll('[data-tier-desc]').forEach((p) => { p.hidden = p.dataset.tierDesc !== picked[tierIndex]; });
      }
      if (upload) {
        const on = tierIndex >= 0 && picked[tierIndex] === uploadTier;
        upload.hidden = !on;
        uploadInput.disabled = !on;
        if (!on && uploadError) uploadError.hidden = true;
      }
      if (!needSize && sizeGroup) {
        sizeGroup.classList.remove('is-needed');
        if (sizeError) sizeError.hidden = true;
        atc.removeAttribute('aria-describedby');
      }

      if (stickyMeta) {
        const bits = [];
        if (tierIndex >= 0 && picked[tierIndex]) bits.push(picked[tierIndex]);
        if (sizeIndex >= 0) bits.push(picked[sizeIndex] ? `Size ${picked[sizeIndex]}` : 'Choose size');
        if (left) bits.push(`${left} left`);
        stickyMeta.textContent = bits.join(' · ');
      }
      if (stickyBtn) {
        stickyBtn.textContent = atc.disabled ? 'Sold out' : needSize ? 'Select size' : 'Add to cart';
        stickyBtn.disabled = atc.disabled;
      }

      if (fromUser && variant) {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState(window.history.state, '', url.toString());
        if (variant.media_id && variant.media_id !== lastMedia) {
          lastMedia = variant.media_id;
          gal.goToMedia(variant.media_id);
        }
      }
    }

    let toastTimer;
    function toast(text, isError) {
      toastEl.querySelector('[data-toast-text]').textContent = text;
      toastEl.classList.toggle('is-error', !!isError);
      toastEl.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
    }

    async function syncCart() {
      try {
        const cart = await (await fetch(`${(window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/'}cart.js`)).json();
        document.querySelectorAll('cart-icon').forEach((icon) => { if (typeof icon.renderCartBubble === 'function') icon.renderCartBubble(cart.item_count); });
        document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = cart.item_count; });
        try { sessionStorage.setItem('cart-count', JSON.stringify({ value: String(cart.item_count), timestamp: Date.now() })); } catch (_) {}
      } catch (_) {}
    }

    async function add() {
      if (atc.disabled || atc.getAttribute('aria-busy') === 'true') return;
      const picked = selected();
      if (sizeIndex >= 0 && picked[sizeIndex] == null) {
        sizeGroup.classList.add('is-needed');
        sizeError.hidden = false;
        atc.setAttribute('aria-describedby', sizeError.id);
        const first = sizeGroup.querySelector('input:not(:disabled)');
        const top = sizeGroup.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top, behavior: reduceMotion() ? 'auto' : 'smooth' });
        if (first) first.focus({ preventScroll: true });
        return;
      }
      if (upload && !upload.hidden && !uploadInput.files.length) {
        uploadError.hidden = false;
        uploadInput.focus();
        return;
      }
      atc.setAttribute('aria-busy', 'true');
      try {
        const body = new FormData(form);
        [...body.keys()].forEach((k) => { if (k.startsWith('uscode-option-')) body.delete(k); });
        const res = await fetch(`${root.dataset.cartAddUrl}.js`, { method: 'POST', headers: { Accept: 'application/json' }, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.description || data.message || 'Could not add that piece.');
        const parts = [root.dataset.productTitle];
        if (sizeIndex >= 0) parts.push(picked[sizeIndex]);
        picked.forEach((v, i) => { if (i !== sizeIndex && v && inputsFor(i).some((el) => el.type === 'radio')) parts.push(v); });
        toast(`Added — ${parts.join(', ')}`);
        syncCart();
      } catch (err) {
        toast(err.message || 'Could not add that piece.', true);
      } finally {
        atc.removeAttribute('aria-busy');
      }
    }

    if (form) {
      form.addEventListener('change', (e) => { if (e.target.matches('[data-option]')) update(true); if (e.target === uploadInput && uploadError) uploadError.hidden = true; });
      form.addEventListener('submit', (e) => { e.preventDefault(); add(); });
    }
    if (stickyBtn) stickyBtn.addEventListener('click', add);

    root.querySelectorAll('[data-choose]').forEach((btn) => btn.addEventListener('click', () => {
      const target = inputsFor(tierIndex).find((el) => el.value === btn.dataset.choose);
      if (target) { target.checked = true; update(true); }
      root.querySelector('#uscode-buy').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }));
    root.querySelectorAll('[data-to-top]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      root.querySelector('#uscode-buy').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    }));

    const guide = root.querySelector('[data-guide]');
    const guideBtn = root.querySelector('[data-guide-open]');
    if (guide && guideBtn) {
      guideBtn.addEventListener('click', () => guide.showModal());
      guide.querySelector('[data-guide-close]').addEventListener('click', () => guide.close());
      guide.addEventListener('click', (e) => {
        const r = guide.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) guide.close();
      });
    }

    if (sticky) {
      // a scroll check rather than an observer: a fast jump past the button never intersects
      let queued = false;
      const check = () => {
        queued = false;
        const on = atc.getBoundingClientRect().bottom < 0;
        if (on === sticky.classList.contains('is-on')) return;
        sticky.classList.toggle('is-on', on);
        sticky.inert = !on;
      };
      window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(check); } }, { passive: true });
      check();
    }

    update(false);
  }

  const boot = (scope = document) => scope.querySelectorAll('[data-uscode-pdp]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot());
  else boot();
  document.addEventListener('shopify:section:load', (e) => boot(e.target));
})();
