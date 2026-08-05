(function(){'use strict';

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints>0;
const LOW_POWER = (navigator.deviceMemory && navigator.deviceMemory < 1.5) || window.matchMedia('(prefers-reduced-motion: reduce)').matches || IS_TOUCH;

/* --- Canvas Aurora + Particles System (multi-layered) --- */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas && canvas.getContext && canvas.getContext('2d');
let W = innerWidth, H = innerHeight, DPR = devicePixelRatio || 1;
let particles = [], maxParticles = LOW_POWER? 24 : 120;
let pointer = {x:-9999,y:-9999,active:false};
let t0 = performance.now();

function resize(){ W = innerWidth; H = innerHeight; if (!canvas) return; canvas.width = Math.max(1, Math.floor(W * DPR)); canvas.height = Math.max(1, Math.floor(H * DPR)); canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; if (ctx) ctx.setTransform(DPR,0,0,DPR,0,0); }
window.addEventListener('resize', resize, {passive:true}); resize();

function rand(min,max){return min + Math.random()*(max-min)}
function createParticle(i){ return {x: rand(0,W), y: rand(H*0.1, H), vx: rand(-0.25,0.25), vy: rand(-0.05,-0.3), r: rand(1.5,6)*(i%6===0?3:1), hue: rand(300,350), life: rand(6,26), age:0, alpha: rand(0.06,0.28), steam: Math.random()>0.82}; }

for(let i=0;i<maxParticles;i++) particles.push(createParticle(i));

/* simple 2D noise-ish field for aurora blobs */
function auroraLayer(time, id){ const base = 0.0003*(id+1); const x = Math.sin(time*base*1.2 + id*1.7)*0.5 + 0.5; const y = Math.cos(time*base*0.9 + id*2.1)*0.5 + 0.5; const grd = ctx.createLinearGradient(W*x, H*(0.05+0.02*id), W*(1-x), H*(0.45+0.02*id)); grd.addColorStop(0, `hsla(${300+id*10},92%,55%,${0.08/(id+1)})`); grd.addColorStop(0.45, `hsla(${320+id*6},88%,45%,${0.05/(id+1)})`); grd.addColorStop(1, `rgba(8,7,13,0)`); ctx.fillStyle = grd; ctx.globalCompositeOperation = 'lighter'; ctx.fillRect(-40, H*0.06*id, W+80, H*0.8*(0.5/(id+0.8))); ctx.globalCompositeOperation = 'source-over'; }

function drawParticles(){ // particles + faint connection lines
  if (!ctx) return;
  ctx.save();
  for(let i=particles.length-1;i>=0;i--){ const p = particles[i]; p.age += 1/60; p.x += p.vx + Math.sin((p.x+p.y)*0.002 + t0*0.00005)*(p.steam?0.6:0.12); p.y += p.vy + Math.cos((p.x+p.y)*0.001 + t0*0.00003)*(p.steam?0.3:0.06); p.vx *= 0.999; p.vy *= 0.999; if (p.y < -80 || p.age > p.life) particles[i] = createParticle(i);
    // draw glow
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*3.4);
    g.addColorStop(0, `hsla(${p.hue},88%,62%,${p.alpha})`);
    g.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = g; ctx.fillRect(p.x - p.r*3.4, p.y - p.r*3.4, p.r*6.8, p.r*6.8);
  }

  // connections
  if (pointer.active){ ctx.strokeStyle = 'rgba(180,150,255,0.06)'; ctx.lineWidth = 1; for(let i=0;i<particles.length;i++){ const a = particles[i]; const dx = a.x - pointer.x, dy = a.y - pointer.y; const d = Math.hypot(dx,dy); if (d < 160){ ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x + (Math.random()-0.5)*8, pointer.y + (Math.random()-0.5)*8); ctx.stroke(); } }}
  ctx.restore();
}

let raf = null;
function loop(now){ t0 = now; if (!ctx) return; ctx.clearRect(0,0,W,H);
  // base aurora layers (3) - subtle and slow
  if (!LOW_POWER && !REDUCE){ auroraLayer(now,0); auroraLayer(now,1); auroraLayer(now,2); }
  // subtle vignette
  const vg = ctx.createRadialGradient(W*0.7, H*0.12, 0, W/2, H/2, Math.max(W,H)); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.18)'); ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
  // particle layer
  drawParticles();
  raf = requestAnimationFrame(loop);
}
if (!REDUCE && ctx) raf = requestAnimationFrame(loop);

/* mouse events for pointer interactions and spotlight */
const spotlight = document.getElementById('mouse-spotlight');
window.addEventListener('mousemove', (e)=>{ pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; if (spotlight){ spotlight.style.left = e.clientX + 'px'; spotlight.style.top = e.clientY + 'px'; spotlight.style.opacity = 1; spotlight.style.transform = 'translate3d(-50%,-50%,0) scale(1)'; }
});
window.addEventListener('mouseleave', ()=>{ pointer.active = false; if (spotlight) spotlight.style.opacity = 0; });

/* parallax floating decorations */
const layers = Array.from(document.querySelectorAll('.parallax-layer'));
let lastMouse = {x:W/2,y:H/2};
function updateParallax(){ layers.forEach(l=>{ const depth = parseFloat(l.dataset.depth||0.08); const dx = (pointer.x - W/2) * depth; const dy = (pointer.y - H/2) * depth; l.style.transform = `translate3d(${dx}px,${dy}px,0) translateZ(0)`; }); requestAnimationFrame(updateParallax); }
if (!LOW_POWER) requestAnimationFrame(updateParallax);

/* watermark is CSS animated; ensure horizontal repeat coverage */
(function ensureWatermark(){ const el = document.getElementById('watermark-marquee'); if (!el) return; // duplicate content to avoid gaps
  el.textContent = el.textContent + ' — ' + el.textContent; })();

/* HUD grid injection (non-invasive) */
(function injectHud(){ if (document.getElementById('hud-grid')) return; const g = document.createElement('div'); g.id = 'hud-grid'; document.body.appendChild(g); })();

/* add sci-fi corner brackets to each .glass card (DOM augmentation) */
(function decorateCards(){ const cards = document.querySelectorAll('.glass'); cards.forEach(card=>{ if (card.querySelector('.corner-bracket')) return; const b = document.createElement('span'); b.className = 'corner-bracket'; b.style.position='absolute'; b.style.pointerEvents='none'; b.style.inset='8px'; b.style.border='none'; b.style.zIndex='14'; card.appendChild(b); }); })();

/* performance / visibility: pause heavy loop when not visible */
document.addEventListener('visibilitychange', ()=>{ if (document.hidden){ if (raf) cancelAnimationFrame(raf); raf = null; } else { if (!raf && ctx && !REDUCE) raf = requestAnimationFrame(loop); } });

/* gracefully stop for reduced motion or touch devices */
if (REDUCE || IS_TOUCH){ const s = document.getElementById('mouse-spotlight'); if (s) s.style.display='none'; }

/* cleanup on unload */ window.addEventListener('unload', ()=>{ if (raf) cancelAnimationFrame(raf); });

})();
