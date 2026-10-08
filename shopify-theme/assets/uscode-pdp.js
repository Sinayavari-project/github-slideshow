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
    const uploadAll = root.dataset.uploadAll === 'true';
    const photoRequired = (picked) => !!uploadTier && tierIndex >= 0 && picked[tierIndex] === uploadTier;
    const sizeIdxs = (root.dataset.sizeIndexes || '').split(',').filter((x) => x !== '').map(Number);
    if (!sizeIdxs.length && sizeIndex >= 0) sizeIdxs.push(sizeIndex);
    const groupOf = (i) => root.querySelector(`[data-option-group="${i}"]`);
    const errorOf = (i) => root.querySelector(`[data-size-error="${i}"]`);
    const missingSize = (picked) => { const i = sizeIdxs.find((k) => picked[k] == null); return i === undefined ? -1 : i; };
    const upload = root.querySelector('[data-upload]');
    const uploadInput = root.querySelector('[data-upload-input]');
    const uploadError = root.querySelector('[data-upload-error]');
    const soldNote = root.querySelector('[data-soldout-note]');
    const sticky = root.querySelector('[data-sticky]');
    const stickyBtn = root.querySelector('[data-sticky-atc]');
    const stickyMeta = root.querySelector('[data-sticky-meta]');
    const toastEl = root.querySelector('[data-toast]');
    const lineStep = root.querySelector('[data-line-step]');
    const lineOwn = root.querySelector('[data-line-own]');
    const lineInput = root.querySelector('[data-line-input]');
    const lineConfirm = root.querySelector('[data-line-confirm]');
    const atcHint = root.querySelector('[data-atc-hint]');
    const photoInputs = [...root.querySelectorAll('[data-photo-input]')];
    const slotOf = (input) => input.closest('[data-photo-slot]');
    let photoOk = false;
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

    const HINTS = { size: sizeIdxs.length > 1 ? 'Choose both sizes to continue.' : 'Choose your size to continue.', line: 'Write your line to continue.', confirm: 'Confirm your line to continue.', photo: 'Add your eye photo to continue.' };
    const STICKY = { size: 'Select size', line: 'Write your line', confirm: 'Confirm your line', photo: 'Add eye photo' };
    const lineType = () => { const r = lineStep && lineStep.querySelector('input[name="uscode-line"]:checked'); return r ? r.dataset.lineType : 'set'; };
    function needed(needSize) {
      if (needSize) return 'size';
      if (lineStep) {
        if (lineType() === 'custom' && !lineInput.value.trim()) return 'line';
        if (!lineConfirm.checked) return 'confirm';
      }
      if (upload && !upload.hidden && !photoOk && photoRequired(selected())) return 'photo';
      return '';
    }

    // the printed line: set list, write your own, or none
    function syncLine(untick) {
      if (!lineStep) return;
      const type = lineType();
      const radio = lineStep.querySelector('input[name="uscode-line"]:checked');
      const max = Number(lineStep.dataset.max) || 36;
      if (lineOwn) lineOwn.hidden = type !== 'custom';
      let text = '';
      if (type === 'custom') {
        const clean = lineInput.value.replace(/[^\p{L}\p{N} .,!?'’&-]/gu, '').slice(0, max);
        if (clean !== lineInput.value) lineInput.value = clean;
        root.querySelector('[data-line-count]').textContent = `${clean.length}/${max}`;
        text = clean.replace(/\s+/g, ' ').trim().toUpperCase();
      } else if (type === 'set' && radio) {
        text = radio.value.toUpperCase();
      }
      root.querySelector('[data-line-value]').value = type === 'none' ? '—' : text;
      root.querySelector('[data-line-type-value]').value = type;
      root.querySelector('[data-line-confirm-text]').textContent = type === 'none'
        ? 'Print no line — eyes only. I understand this can’t be changed after printing.'
        : `Print “${text || '…'}” exactly as shown. I understand the line can’t be changed after printing.`;
      if (untick) lineConfirm.checked = false;
    }

    // eye photo: JPG/PNG, checked for width before it can be added
    function clearPhoto(input, msg) {
      const slot = slotOf(input);
      if (input === uploadInput) photoOk = false;
      input.value = '';
      slot.querySelector('[data-upload-drop]').hidden = false;
      slot.querySelector('[data-upload-filled]').hidden = true;
      slot.querySelector('[data-upload-thumb]').textContent = '';
      if (uploadError) { uploadError.textContent = msg || 'Add your photo to continue.'; uploadError.hidden = !msg; }
    }
    function checkPhoto(input) {
      const file = input.files[0];
      if (!file) { clearPhoto(input); update(false); return; }
      if (!/^image\/(jpeg|png)$/.test(file.type)) { clearPhoto(input, 'Use a JPG or PNG photo.'); update(false); return; }
      const min = Number(input.dataset.minWidth) || 0;
      const slot = slotOf(input);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth < min) {
          URL.revokeObjectURL(url);
          clearPhoto(input, `That photo is ${img.naturalWidth}px wide. Use one at least ${min}px wide.`);
        } else {
          if (input === uploadInput) photoOk = true;
          img.alt = '';
          const th = slot.querySelector('[data-upload-thumb]');
          th.textContent = '';
          th.appendChild(img);
          slot.querySelector('[data-upload-name]').textContent = file.name;
          slot.querySelector('[data-upload-meta]').textContent = `${img.naturalWidth} × ${img.naturalHeight}px · ${(file.size / 1048576).toFixed(1)} MB`;
          slot.querySelector('[data-upload-drop]').hidden = true;
          slot.querySelector('[data-upload-filled]').hidden = false;
          uploadError.hidden = true;
        }
        update(false);
      };
      img.onerror = () => { URL.revokeObjectURL(url); clearPhoto(input, 'We couldn’t read that photo. Try another JPG or PNG.'); update(false); };
      img.src = url;
    }

    function scrollToEl(el, focusEl) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top, behavior: reduceMotion() ? 'auto' : 'smooth' });
      if (focusEl) focusEl.focus({ preventScroll: true });
    }

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
          if (sizeIdxs.includes(i)) {
            el.disabled = !ok;
            if (!ok && !soldSizes.includes(el.value)) soldSizes.push(el.value);
            if (!ok && el.checked) { el.checked = false; picked[i] = null; }
          }
          const label = root.querySelector(`label[for="${el.id}"]`);
          if (label && sizeIdxs.includes(i)) label.setAttribute('aria-label', ok ? el.value : `${el.value}, sold out`);
        });
        const out = root.querySelector(`[data-option-value="${i}"]`);
        if (out) out.textContent = picked[i] || '';
      }
      if (soldNote) {
        soldNote.textContent = soldSizes.length ? `${soldSizes.join(', ')} sold out.` : '';
      }

      const needSize = missingSize(picked) >= 0;
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
        atcLabel.textContent = `${sizeIdxs.length > 1 ? 'Select sizes' : 'Select a size'} — ${price}`;
      } else {
        atc.disabled = false;
        atcLabel.textContent = `Add to cart — ${price}`;
      }
      if (variant) idInput.value = variant.id;
      const soldOut = atc.disabled;
      const missing = lineStep ? needed(needSize) : '';
      if (lineStep) {
        if (missing) atc.disabled = true;
        if (atcHint) {
          const onUpload = upload && photoRequired(picked);
          atcHint.textContent = soldOut ? '' : HINTS[missing] || (onUpload ? atcHint.dataset.shipUpload : atcHint.dataset.ship) || '';
          atcHint.classList.toggle('is-todo', !!missing);
          if (atcHint.textContent) atc.setAttribute('aria-describedby', atcHint.id); else atc.removeAttribute('aria-describedby');
        }
      }

      if (tierIndex >= 0) {
        root.querySelectorAll('[data-tier-desc]').forEach((p) => { p.hidden = p.dataset.tierDesc !== picked[tierIndex]; });
      }
      if (upload) {
        const on = uploadAll || photoRequired(picked);
        upload.hidden = !on;
        const req = upload.querySelector('[data-upload-req]');
        if (req && uploadAll) req.textContent = photoRequired(picked) ? req.dataset.reqText : req.dataset.optText;
        if (uploadError && !photoRequired(picked) && uploadError.textContent === 'Add your photo to continue.') uploadError.hidden = true;
        photoInputs.forEach((el) => { el.disabled = !on; });
        if (!on && uploadError) uploadError.hidden = true;
      }
      if (lineStep && upload && atcHint && !soldOut) {
        // photo step visibility can change the hint after the tier switch
        const m = needed(needSize);
        atc.disabled = !!m;
        if (m) atcHint.textContent = HINTS[m];
        atcHint.classList.toggle('is-todo', !!m);
      }
      sizeIdxs.forEach((i) => {
        if (picked[i] == null) return;
        groupOf(i).classList.remove('is-needed');
        if (errorOf(i)) errorOf(i).hidden = true;
      });
      if (!needSize && !lineStep) atc.removeAttribute('aria-describedby');

      if (stickyMeta) {
        const bits = [];
        if (tierIndex >= 0 && picked[tierIndex]) bits.push(picked[tierIndex]);
        if (sizeIdxs.length === 1) bits.push(picked[sizeIdxs[0]] ? `Size ${picked[sizeIdxs[0]]}` : 'Choose size');
        else if (sizeIdxs.length) bits.push(needSize ? 'Choose sizes' : `Sizes ${sizeIdxs.map((i) => picked[i]).join(' / ')}`);
        if (left) bits.push(`${left} left`);
        stickyMeta.textContent = bits.join(' · ');
      }
      if (stickyBtn) {
        if (lineStep) {
          const m = needed(needSize);
          stickyBtn.textContent = soldOut ? 'Sold out' : STICKY[m] || 'Add to cart';
          stickyBtn.disabled = soldOut;
        } else {
          stickyBtn.textContent = atc.disabled ? 'Sold out' : needSize ? (sizeIdxs.length > 1 ? 'Select sizes' : 'Select size') : 'Add to cart';
          stickyBtn.disabled = atc.disabled;
        }
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
      const miss = missingSize(picked);
      if (miss >= 0) {
        const sizeGroup = groupOf(miss), sizeError = errorOf(miss);
        sizeGroup.classList.add('is-needed');
        sizeError.hidden = false;
        atc.setAttribute('aria-describedby', sizeError.id);
        const first = sizeGroup.querySelector('input:not(:disabled)');
        const top = sizeGroup.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top, behavior: reduceMotion() ? 'auto' : 'smooth' });
        if (first) first.focus({ preventScroll: true });
        return;
      }
      if (upload && !upload.hidden && !photoOk && photoRequired(picked)) {
        uploadError.hidden = false;
        uploadInput.focus();
        return;
      }
      if (lineStep && needed(false)) return;
      atc.setAttribute('aria-busy', 'true');
      try {
        const body = new FormData(form);
        [...body.keys()].forEach((k) => { if (k.startsWith('uscode-option-') || k === 'uscode-line') body.delete(k); });
        [...body.entries()].forEach(([k, v]) => { if (v instanceof File && !v.name) body.delete(k); });
        const res = await fetch(`${root.dataset.cartAddUrl}.js`, { method: 'POST', headers: { Accept: 'application/json' }, body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.description || data.message || 'Could not add that piece.');
        const parts = [root.dataset.productTitle];
        sizeIdxs.forEach((i) => parts.push(picked[i]));
        picked.forEach((v, i) => { if (!sizeIdxs.includes(i) && v && inputsFor(i).some((el) => el.type === 'radio')) parts.push(v); });
        toast(`Added — ${parts.join(', ')}`);
        syncCart();
      } catch (err) {
        toast(err.message || 'Could not add that piece.', true);
      } finally {
        atc.removeAttribute('aria-busy');
      }
    }

    if (form) {
      form.addEventListener('change', (e) => {
        if (e.target.matches('[data-option]')) update(true);
        if (e.target.name === 'uscode-line') { syncLine(true); update(false); if (lineType() === 'custom') lineInput.focus(); }
        if (e.target === lineConfirm) update(false);
        if (e.target.matches('[data-photo-input]')) checkPhoto(e.target);
      });
      if (lineInput) lineInput.addEventListener('input', () => { syncLine(true); update(false); });
      form.addEventListener('submit', (e) => { e.preventDefault(); add(); });
    }
    if (stickyBtn) stickyBtn.addEventListener('click', () => {
      const miss = missingSize(selected());
      const m = lineStep ? needed(miss >= 0) : '';
      if (!m) { add(); return; }
      if (m === 'size') { const g = groupOf(miss); scrollToEl(g, g.querySelector('input:not(:disabled)')); return; }
      if (m === 'photo') { scrollToEl(upload, uploadInput); return; }
      scrollToEl(lineStep, m === 'line' ? lineInput : m === 'confirm' ? lineConfirm : lineStep.querySelector('input[name="uscode-line"]:checked'));
    });
    root.querySelectorAll('[data-upload-remove]').forEach((btn) => btn.addEventListener('click', () => {
      const input = btn.closest('[data-photo-slot]').querySelector('[data-photo-input]');
      clearPhoto(input); update(false); input.focus();
    }));

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

    syncLine(false);
    update(false);
  }

  const boot = (scope = document) => scope.querySelectorAll('[data-uscode-pdp]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot());
  else boot();
  document.addEventListener('shopify:section:load', (e) => boot(e.target));
})();
