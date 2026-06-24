/* ------------------------------------------------------------------
   Team "FaceGrid" — sticker-cutout team photos
   ------------------------------------------------------------------
   Desktop: one seamless right-to-left marquee lane.
   Mobile : TWO stacked lanes, the faces split between them, both
            looping right-to-left.

   Each lane holds two identical halves and animates 0 -> -50% so it
   loops with no jump. The grid is React-controlled in the original
   Gatsby site (renders empty here, and React re-renders would wipe
   injected markup), so this is self-healing like eyes.js and also
   rebuilds when the viewport crosses the mobile breakpoint.

   Content is hard-coded by us (no user input), so innerHTML is safe.
   Add team members to the FACES array.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var FACES = [
    { src: 'durdona-images/team/durdona-sticker.webp', alt: 'Durdona' },
    { src: 'durdona-images/team/elbek-sticker.webp', alt: 'Elbek' },
    { src: 'durdona-images/team/arofat-sticker.webp', alt: 'Arofat' },
    { src: 'durdona-images/team/muhammadaziz-sticker.webp', alt: 'Muhammadaziz' },
    // { src: 'durdona-images/team/NAME.webp', alt: 'Name' },
  ];

  var SPEED = 55;            // px/sec
  var MOBILE = '(max-width:640px)';

  function isMobile() { return window.matchMedia(MOBILE).matches; }

  function injectCSS() {
    if (document.getElementById('aura-faces-css')) return;
    var s = document.createElement('style');
    s.id = 'aura-faces-css';
    s.textContent =
      '@keyframes aura-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}' +
      '.aura-faces{overflow:hidden;width:100%}' +
      '.aura-faces-track{display:flex;align-items:flex-end;width:max-content;' +
        'will-change:transform;animation:aura-marquee var(--aura-marquee-dur,40s) linear infinite}' +
      '.aura-faces-track:hover{animation-play-state:paused}' +
      '@media (prefers-reduced-motion: reduce){.aura-faces-track{animation:none}}' +
      /* on mobile keep the two lanes as clear separate rows */
      '@media (max-width:640px){.FaceGrid-module--root--0d518 .FaceGrid-module--row--58df0:not(:first-of-type){margin-top:6px}}';
    document.head.appendChild(s);
  }

  function faceHTML(f) {
    return '<div class="FaceBox-module--button--0364b">' +
      '<img src="' + f.src + '" alt="' + f.alt + '" loading="lazy" ' +
      'style="display:block;width:200px;max-width:42vw;height:auto"></div>';
  }

  // build one scrolling lane (track) from a list of faces
  function laneRow(list) {
    var one = list.map(faceHTML).join('');
    var reps = Math.max(2, Math.ceil(8 / Math.max(1, list.length)));
    var half = '';
    for (var i = 0; i < reps; i++) half += one;
    return '<div class="FaceGrid-module--row--58df0 aura-faces">' +
             '<div class="aura-faces-track">' + half + half + '</div>' +
           '</div>';
  }

  function setDurations(grid) {
    var tracks = grid.querySelectorAll('.aura-faces-track');
    for (var i = 0; i < tracks.length; i++) {
      var laneWidth = tracks[i].scrollWidth / 2;
      var dur = Math.max(18, Math.round(laneWidth / SPEED));
      tracks[i].style.setProperty('--aura-marquee-dur', dur + 's');
    }
  }

  function build(grid) {
    injectCSS();
    if (isMobile()) {
      // split the faces into two lanes (interleaved), both scrolling
      var a = [], b = [];
      FACES.forEach(function (f, i) { (i % 2 === 0 ? a : b).push(f); });
      grid.innerHTML = laneRow(a) + laneRow(b);
      grid.setAttribute('data-aura-mode', 'mobile2');
    } else {
      grid.innerHTML = laneRow(FACES);
      grid.setAttribute('data-aura-mode', 'marquee');
    }
    setDurations(grid);
  }

  function ensure() {
    var grid = document.querySelector('.FaceGrid-module--root--0d518');
    if (!grid) return;
    var want = isMobile() ? 'mobile2' : 'marquee';
    if (grid.getAttribute('data-aura-mode') === want && grid.querySelector('.aura-faces')) return;
    build(grid);
  }

  function boot() {
    ensure();
    var obs = new MutationObserver(ensure);
    obs.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', ensure);
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(ensure, 200);
    });
    var n = 0;
    var iv = setInterval(function () { ensure(); if (++n > 30) clearInterval(iv); }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
