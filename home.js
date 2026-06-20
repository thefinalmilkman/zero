'use strict';
// home.js — the Living Workshop hero. A slow, alive flow-field of light, from scratch, zero deps.
// Calm by design; LOD-scaled; pauses when hidden/off-screen; respects prefers-reduced-motion.
(function () {
  const c = document.getElementById('hero'); if (!c) { window.__ready = true; return; }
  const ctx = c.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  let W = 0, H = 0, parts = [], raf = null, running = false, frames = 0, t = 0;

  function size() { const r = c.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); c.width = W * DPR; c.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = '#0b0d10'; ctx.fillRect(0, 0, W, H); }
  function seed() { const n = Math.min(560, Math.max(90, Math.floor(W * H / 2700))); parts = []; for (let i = 0; i < n; i++) { const x = Math.random() * W, y = Math.random() * H; parts.push({ x, y, px: x, py: y, h: 156 + Math.random() * 50 }); } }
  // smooth evolving flow field from summed sines (no noise lib)
  function flow(x, y, tt) { return Math.sin(x * 0.0021 + tt * 0.00031) + Math.sin(y * 0.0026 - tt * 0.00041) + Math.sin((x + y) * 0.0015 + tt * 0.00052); }
  function step() {
    t += 16;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(11,13,16,0.055)'; ctx.fillRect(0, 0, W, H);   // gentle fade -> longer flowing trails
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1.35;
    for (const p of parts) {
      const a = flow(p.x, p.y, t) * 2.0;
      p.px = p.x; p.py = p.y;
      p.x += Math.cos(a) * 0.9; p.y += Math.sin(a) * 0.9;
      let wrapped = false;
      if (p.x < 0) { p.x += W; wrapped = true; } else if (p.x > W) { p.x -= W; wrapped = true; }
      if (p.y < 0) { p.y += H; wrapped = true; } else if (p.y > H) { p.y -= H; wrapped = true; }
      if (!wrapped) { ctx.strokeStyle = 'hsla(' + p.h + ',84%,64%,0.27)'; ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    }
    frames++; window.__heroFrames = frames;
  }
  function loop() { step(); raf = requestAnimationFrame(loop); }
  function start() { if (running || reduce) return; running = true; window.__heroPaused = false; raf = requestAnimationFrame(loop); }
  function stop() { running = false; window.__heroPaused = true; if (raf) cancelAnimationFrame(raf); raf = null; }

  size(); seed();
  if (reduce) { for (let k = 0; k < 160; k++) step(); window.__heroReduced = true; }   // one developed static field
  else start();

  addEventListener('resize', () => { size(); seed(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach(e => e.isIntersecting ? start() : stop()), { threshold: 0.03 }).observe(c);

  window.__ready = true;
})();
