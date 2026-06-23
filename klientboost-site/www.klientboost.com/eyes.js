/* ------------------------------------------------------------------
   Hero "manila folder" animated eyes  (vanilla JS, no dependencies)
   ------------------------------------------------------------------
   Recreates the klientboost.com hero effect: the folder mascot's eyes
   blink on their own and the pupils look around / follow the cursor.

   How it works
   ------------
   The folder illustration is an <img> of an SVG whose coordinate system
   is 1015 x 340.835 user units. We lay our own <svg> on top of that
   image using the SAME viewBox, so we can position the eyes in the
   illustration's native coordinates and they line up perfectly at any
   size. The two eyes of the folder sit at roughly:
        left  eye  -> (463, 200)
        right eye  -> (551, 200)

   Resilience
   ----------
   This page is a static mirror of a Gatsby site. React still hydrates,
   re-renders the hero (its captions animate), and in doing so wipes any
   DOM we appended. So instead of attaching once, we keep watching and
   re-attach the overlay whenever it gets removed. The mouse / blink /
   wander handlers are wired only once and always act on the current
   overlay, so re-attaching is cheap and never stacks listeners.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  // --- Eye geometry, in the folder SVG's coordinate units --------------
  var VIEWBOX = { w: 1015, h: 340.835 };
  var EYES = [
    { cx: 463, cy: 200 }, // viewer's left
    { cx: 551, cy: 200 }, // viewer's right
  ];
  var WHITE_R = 31;   // radius of the white of the eye
  var PUPIL_R = 14;   // radius of the dark pupil
  var TRAVEL = WHITE_R - PUPIL_R - 3; // how far a pupil may slide from center
  var OUTLINE = '#515979'; // matches the illustration's outline colour
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SELECTOR = '.ManilaFolderHero-module--illustration--7c447 img';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = null;          // current overlay: { svg, pupils }
  var lastMouseMove = 0;
  var center = { x: VIEWBOX.w / 2, y: VIEWBOX.h / 2 };
  var globalsWired = false;

  function el(name, attrs) {
    var node = document.createElementNS(SVGNS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function build(folderImg) {
    var parent = folderImg.parentNode;
    // The overlay needs a positioned ancestor to pin against.
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    var svg = el('svg', {
      class: 'kb-eyes-overlay',
      viewBox: '0 0 ' + VIEWBOX.w + ' ' + VIEWBOX.h,
      preserveAspectRatio: 'xMidYMid meet',
      'aria-hidden': 'true',
    });

    var pupils = []; // {node, eye} so we can move them every frame

    EYES.forEach(function (eye) {
      // Group that we scaleY to blink.
      var g = el('g', { class: 'kb-eye' });

      g.appendChild(el('circle', {
        cx: eye.cx, cy: eye.cy, r: WHITE_R,
        fill: '#ffffff', stroke: OUTLINE, 'stroke-width': 5,
      }));

      var pupil = el('circle', {
        class: 'kb-pupil',
        cx: eye.cx, cy: eye.cy, r: PUPIL_R,
        fill: OUTLINE,
      });
      // tiny catch-light so it reads like the original sparkle
      var shine = el('circle', {
        cx: eye.cx - 4, cy: eye.cy - 5, r: 3.2,
        fill: '#ffffff', opacity: 0.9,
      });

      g.appendChild(pupil);
      g.appendChild(shine);
      svg.appendChild(g);

      pupils.push({ node: pupil, shine: shine, eye: eye, g: g });
    });

    parent.appendChild(svg);
    return { svg: svg, pupils: pupils };
  }

  // --- Pupil aiming -----------------------------------------------------
  // target is a point in SVG units that the eyes "look at".
  function aim(st, targetX, targetY) {
    if (!st) return;
    st.pupils.forEach(function (p) {
      var dx = targetX - p.eye.cx;
      var dy = targetY - p.eye.cy;
      var dist = Math.hypot(dx, dy) || 1;
      var f = Math.min(1, TRAVEL / dist); // clamp inside the white
      var ox = dx * f;
      var oy = dy * f;
      p.node.setAttribute('transform', 'translate(' + ox + ',' + oy + ')');
      // the shine drifts a touch with the pupil for life-likeness
      p.shine.setAttribute('transform', 'translate(' + ox * 0.7 + ',' + oy * 0.7 + ')');
    });
  }

  // Convert a clientX/clientY mouse point into the current SVG's units.
  function toSvg(clientX, clientY) {
    if (!state) return null;
    var ctm = state.svg.getScreenCTM();
    if (!ctm) return null;
    var pt = state.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(ctm.inverse());
  }

  function blinkOnce(cb) {
    if (!state) return;
    state.pupils.forEach(function (p) { p.g.classList.add('kb-blink'); });
    setTimeout(function () {
      if (state) state.pupils.forEach(function (p) { p.g.classList.remove('kb-blink'); });
      if (cb) setTimeout(cb, 130);
    }, 110);
  }

  // Wire the cursor-follow / wander / blink behaviours exactly once. They
  // always read the module-level `state`, so they keep working after the
  // overlay is rebuilt.
  function wireGlobals() {
    if (globalsWired) return;
    globalsWired = true;

    // 1) Follow the cursor when it is moving.
    window.addEventListener('mousemove', function (e) {
      var p = toSvg(e.clientX, e.clientY);
      if (!p) return;
      lastMouseMove = Date.now();
      aim(state, p.x, p.y);
    }, { passive: true });

    if (reduce) return;

    // 2) When idle, look around on its own.
    (function wander() {
      if (Date.now() - lastMouseMove > 1600) {
        var tx = center.x + (Math.random() * 2 - 1) * 260;
        var ty = center.y + (Math.random() * 2 - 1) * 90;
        aim(state, tx, ty);
      }
      setTimeout(wander, 1400 + Math.random() * 2200);
    })();

    // 3) Blink at random, occasionally a quick double-blink.
    (function blinkLoop() {
      blinkOnce(Math.random() < 0.25 ? function () { blinkOnce(); } : null);
      setTimeout(blinkLoop, 2400 + Math.random() * 4200);
    })();
  }

  // (Re)attach the overlay if it is missing for the current folder image.
  function ensure() {
    var img = document.querySelector(SELECTOR);
    if (!img || !img.parentNode) return;
    // Still attached and living in the DOM? Nothing to do.
    if (state && state.svg.isConnected && img.parentNode.contains(state.svg)) return;
    state = build(img);
    aim(state, center.x, center.y); // start looking straight ahead
    wireGlobals();
  }

  // --- Boot -------------------------------------------------------------
  function boot() {
    ensure();
    // Re-check whenever the DOM changes (Gatsby hydration / caption
    // re-renders may have removed our overlay). Cheap: ensure() bails out
    // immediately while the overlay is still present.
    var obs = new MutationObserver(function () { ensure(); });
    obs.observe(document.body, { childList: true, subtree: true });
    // Belt and suspenders for late hydration: retry after load, then for
    // a short window in case the hero mounts/re-renders slightly later.
    window.addEventListener('load', ensure);
    var tries = 0;
    var iv = setInterval(function () {
      ensure();
      if (++tries > 40) clearInterval(iv); // ~16s of safety net
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
