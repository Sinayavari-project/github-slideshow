/* US CODE — collection and shop all: live filters, sort, density, drawer, quick add. */
(() => {
  if (window.__uscodeCollection) return;
  window.__uscodeCollection = true;

  const DENS_KEY = 'uscode:grid-cols';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };

  function applyDensity(root) {
    const grid = root.querySelector('[data-grid]');
    const opts = (root.dataset.densOptions || '').split(',');
    let cols = store.get(DENS_KEY);
    if (!opts.includes(cols)) cols = root.dataset.densDefault;
    if (grid) grid.dataset.cols = cols;
    root.querySelectorAll('[data-dens]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dens === cols)));
  }

  function setDrawer(root, open, returnFocus) {
    const panel = root.querySelector('[data-filters]');
    const backdrop = root.querySelector('.uscode-col__backdrop');
    const btn = root.querySelector('[data-drawer-open]');
    if (!panel) return;
    panel.classList.toggle('is-open', open);
    if (backdrop) backdrop.hidden = !open;
    if (btn) btn.setAttribute('aria-expanded', String(open));
    root.dataset.drawer = open ? 'open' : '';
    if (open) {
      const first = panel.querySelector('button, summary, input:not([disabled]), a[href]');
      if (first) first.focus();
    } else if (returnFocus && btn) {
      btn.focus();
    }
  }

  function formUrl(root) {
    const form = root.querySelector('[data-filter-form]');
    const params = new URLSearchParams();
    if (form) {
      for (const [k, v] of new FormData(form)) if (v !== '') params.append(k, v);
    }
    const sort = root.querySelector('[data-sort]');
    if (sort) {
      params.delete('sort_by');
      if (sort.value !== sort.dataset.default) params.set('sort_by', sort.value);
    }
    const q = params.toString();
    return root.dataset.collectionUrl + (q ? `?${q}` : '');
  }

  let controller = null;
  let pendingUrl = '';
  async function render(root, url, push) {
    const results = root.querySelector('[data-results]');
    // Enter in a price field fires change and submit; keep the first request
    if (controller && url === pendingUrl) return;
    if (controller) controller.abort();
    pendingUrl = url;
    controller = new AbortController();
    const u = new URL(url, location.href);
    u.searchParams.set('section_id', root.dataset.sectionId);
    results.setAttribute('aria-busy', 'true');

    // keep what the shopper had open and focused
    const openKeys = new Set([...root.querySelectorAll('[data-filter-key]')].filter((d) => d.open).map((d) => d.dataset.filterKey));
    const closedKeys = new Set([...root.querySelectorAll('[data-filter-key]')].filter((d) => !d.open).map((d) => d.dataset.filterKey));
    const drawerOpen = root.dataset.drawer === 'open';
    const focusId = document.activeElement && root.contains(document.activeElement) ? document.activeElement.id : '';

    try {
      const res = await fetch(u, { signal: controller.signal });
      if (!res.ok) throw new Error(res.status);
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const fresh = doc.querySelector('[data-results]');
      if (!fresh) throw new Error('no results');
      results.replaceWith(fresh);
      fresh.querySelectorAll('[data-filter-key]').forEach((d) => {
        if (openKeys.has(d.dataset.filterKey)) d.open = true;
        else if (closedKeys.has(d.dataset.filterKey) && !d.querySelector('input:checked')) d.open = false;
      });
      applyDensity(root);
      if (drawerOpen) {
        root.querySelector('[data-filters]').classList.add('is-open');
        root.querySelector('.uscode-col__backdrop').hidden = false;
        root.querySelector('[data-drawer-open]').setAttribute('aria-expanded', 'true');
      }
      const back = focusId && document.getElementById(focusId);
      if (back) back.focus();
      const clean = new URL(url, location.href);
      clean.searchParams.delete('section_id');
      history[push ? 'pushState' : 'replaceState']({ uscodeCollection: true }, '', clean.pathname + clean.search);
    } catch (err) {
      if (err.name === 'AbortError') return;
      location.href = url;
    } finally {
      if (pendingUrl === url) { controller = null; pendingUrl = ''; }
    }
  }

  let toastTimer;
  function toast(root, text, isError) {
    const el = root.querySelector('[data-toast]');
    if (!el) return;
    el.querySelector('[data-toast-text]').textContent = text;
    el.classList.toggle('is-error', !!isError);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  async function syncCartCount() {
    try {
      const cart = await (await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`)).json();
      const count = cart.item_count;
      document.querySelectorAll('cart-icon').forEach((icon) => {
        if (typeof icon.renderCartBubble === 'function') icon.renderCartBubble(count);
      });
      document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = count; });
      try { sessionStorage.setItem('cart-count', JSON.stringify({ value: String(count), timestamp: Date.now() })); } catch (_) {}
    } catch (_) {}
  }

  async function quickAdd(root, btn) {
    if (btn.getAttribute('aria-busy') === 'true') return;
    btn.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch(`${root.dataset.cartAddUrl}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: Number(btn.dataset.variantId), quantity: 1 }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.description || data.message || 'Could not add that piece.');
      const label = btn.dataset.variantLabel;
      toast(root, `Added — ${btn.dataset.productTitle}${label ? `, ${label}` : ''}`);
      syncCartCount();
    } catch (err) {
      toast(root, err.message || 'Could not add that piece.', true);
    } finally {
      btn.removeAttribute('aria-busy');
    }
  }

  function init(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = '1';
    applyDensity(root);

    root.addEventListener('change', (e) => {
      if (e.target.closest('[data-filter-form]') || e.target.matches('[data-sort]')) {
        render(root, formUrl(root), false);
      }
    });
    root.addEventListener('submit', (e) => {
      if (!e.target.matches('[data-filter-form]')) return;
      e.preventDefault();
      render(root, formUrl(root), false);
    });
    root.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-filter-link]');
      if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        render(root, link.href, true);
        return;
      }
      const dens = e.target.closest('[data-dens]');
      if (dens) {
        store.set(DENS_KEY, dens.dataset.dens);
        applyDensity(root);
        return;
      }
      if (e.target.closest('[data-drawer-open]')) { setDrawer(root, true); return; }
      if (e.target.closest('[data-drawer-close]')) { setDrawer(root, false, true); return; }
      const add = e.target.closest('[data-quick-add] button[data-variant-id]');
      if (add && !add.disabled) quickAdd(root, add);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.dataset.drawer === 'open') setDrawer(root, false, true);
    });
    if (!history.state) history.replaceState({ uscodeCollection: true }, '', location.href);
  }

  const boot = (scope = document) => scope.querySelectorAll('[data-uscode-collection]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot());
  else boot();
  document.addEventListener('shopify:section:load', (e) => boot(e.target));
  window.addEventListener('popstate', (e) => {
    if (!e.state || !e.state.uscodeCollection) return;
    const root = document.querySelector('[data-uscode-collection]');
    if (root) render(root, location.href, false);
  });
})();
