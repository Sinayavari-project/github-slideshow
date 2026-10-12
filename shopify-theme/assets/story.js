(function () {
  function init(root) {
    if (!root || root.dataset.storyReady) return;
    root.dataset.storyReady = 'true';
    var trigger = root.querySelector('[data-story-trigger]');
    var dialog = root.querySelector('[data-story-dialog]');
    var slot = root.querySelector('[data-story-slot]');
    var source = root.querySelector('[data-story-video]');
    if (!trigger || !dialog || !slot || !source) return;
    var video = null;

    function loadVideo() {
      if (video) return video;
      slot.appendChild(source.content.cloneNode(true));
      video = slot.querySelector('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('controls', '');
      video.preload = 'none';
      var lazy = video.getAttribute('data-src');
      if (lazy) video.src = lazy;
      return video;
    }

    trigger.addEventListener('click', function () {
      var v = loadVideo();
      dialog.showModal();
      v.focus();
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });

    root.querySelector('[data-story-close]').addEventListener('click', function () { dialog.close(); });

    dialog.addEventListener('click', function (e) {
      if (e.target !== dialog) return;
      var r = dialog.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) dialog.close();
    });

    dialog.addEventListener('close', function () {
      if (video) { video.pause(); video.currentTime = 0; }
      trigger.focus();
    });
  }

  function initAll() { document.querySelectorAll('[data-story-tap]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll); else initAll();
  document.addEventListener('shopify:section:load', function (e) { init(e.target.querySelector('[data-story-tap]')); });
})();
