/* ============================================================
   FLOR COLECTIVA — El tiempo que imaginamos
   - Escucha el envío del formulario 3 y agrega un pétalo con las 3 respuestas.
   - Se dibuja dentro de <div id="flor-colectiva"> (pantalla #cierre).
   - Guarda/carga respuestas mediante FlorTiempo.store (ver abajo).
   ============================================================ */
(() => {
  const FUTURE = ["Como una sucesión de etapas y momentos.", "Como algo que se construye día a día.",
    "Como un conjunto de experiencias que espero vivir.", "Como algo incierto que no puedo anticipar.", "Nunca me había detenido a pensarlo."];
  const CHANGE = ["El pasado comenzó a tener otro significado.", "El presente adquirió mayor importancia.",
    "El futuro dejó de parecerme tan predecible.", "Comencé a cuestionar el orden en que suceden las cosas.", "No he notado un cambio."];

  const OPTS = { blend: 'multiply', cy: 0.5, fit: 0.40 }; // blend: 'source-over' si el fondo es claro
  const GOLD = Math.PI * (3 - Math.sqrt(5));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => () => (seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0, seed = (seed ^ (seed >>> 13)) >>> 0, seed / 4294967296);

  /* Pregunta 1 -> forma | Pregunta 2 -> curvatura y tono */
  const SHAPES = [
    { w: .20, round: 0,  notch: 0, len: 1.00, veins: 3 },
    { w: .30, round: .6, notch: 0, len: .95,  veins: 4 },
    { w: .38, round: 1,  notch: 0, len: .90,  veins: 5 },
    { w: .24, round: .2, notch: 1, len: 1.05, veins: 2 },
    { w: .15, round: .3, notch: 0, len: .70,  veins: 1 },
  ];
  const MOODS = [
    { bend: -.28, hue: 336 }, { bend: 0, hue: 38 }, { bend: .06, hue: 354 },
    { bend: .30, hue: 346, wave: 1 }, { bend: 0, hue: 22, dim: .6 }, // paleta: rosa, durazno, rosa claro, rosa fuerte, tierra
  ];

  /* ---------- Almacenamiento ----------
     Por defecto usa localStorage (solo el navegador de cada persona).
     Para una flor realmente colectiva, reemplaza load/save por tu base de datos:
       FlorTiempo.store = {
         load: async () => (await fetch('TU_URL')).json(),            // -> [{q1,q2,text}, ...]
         save: async a => fetch('TU_URL', {method:'POST', body: JSON.stringify(a)})
       };                                                              */
  const KEY = 'flor-tiempo-v1';
  const localStore = {
    load: async () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } },
    save: async a => { try { const l = JSON.parse(localStorage.getItem(KEY)) || []; l.push(a); localStorage.setItem(KEY, JSON.stringify(l)); } catch {} },
  };

  let cv, ctx, box, W, H, DPR, scale = 1, petals = [], hover = -1, visible = false, running = false;

  function makePetal(a, i, instant) {
    const s = SHAPES[a.q1], m = MOODS[a.q2], r = rng(hash(a.text + '|' + a.q1 + a.q2 + '|' + i));
    const words = a.text.trim() ? a.text.trim().split(/\s+/).length : 0, rich = Math.min(1, words / 12);
    return { i, a, s, m, born: instant ? -1e9 : null, angle: i * GOLD,
      len: (62 + 20 * Math.sqrt(i)) * s.len * (.9 + r() * .2 + rich * .15),
      hue: m.hue + (r() - .5) * 16, sat: 62 + rich * 18 + r() * 10, alpha: (.5 + rich * .2) * (m.dim || 1),
      phase: r() * 6.28, seed: r(), veins: s.veins + (words > 4 ? 1 : 0), dots: Math.min(9, a.text.length / 6 | 0) };
  }

  function path(p, L, bend, wave) {
    const w = p.s.w * L, P = (x, y) => [x, y + bend * L * (x / L) ** 2 + (wave ? Math.sin(x / L * 5) * L * .05 : 0)];
    const k = p.s.round ? .92 : .62, c1 = P(.15 * L, -w * 1.5), c2 = P(k * L, -w * (.6 + p.s.round * .9));
    const tip = p.s.notch ? P(L, -w * .35) : P(L, 0);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], tip[0], tip[1]);
    if (p.s.notch) { const n = P(L * .9, 0), t2 = P(L, w * .35); ctx.quadraticCurveTo(n[0], n[1], t2[0], t2[1]); }
    const d2 = P(k * L, w * (.6 + p.s.round * .9)), d1 = P(.15 * L, w * 1.5);
    ctx.bezierCurveTo(d2[0], d2[1], d1[0], d1[1], 0, 0); ctx.closePath();
    return P;
  }

  function drawPetal(p, t) {
    const g = reduce ? 1 : Math.min(1, (t - p.born) / 2600), e = 1 - Math.pow(1 - g, 3);
    if (e <= 0) return;
    const sway = reduce ? 0 : Math.sin(t * .0005 + p.phase) * .035 + Math.sin(t * .0002 + p.seed * 9) * .02, L = p.len * e;
    ctx.save(); ctx.rotate(p.angle + sway); ctx.translate(10 + 2 * Math.sqrt(p.i), 0);
    const P = path(p, L, p.m.bend * (.7 + .3 * e), p.m.wave);
    const gr = ctx.createLinearGradient(0, 0, L, 0);
    gr.addColorStop(0, `hsla(${p.hue + 10},${p.sat}%,88%,${p.alpha * e})`);
    gr.addColorStop(1, `hsla(${p.hue},${p.sat}%,68%,${p.alpha * e * .85})`);
    ctx.fillStyle = gr; ctx.fill();
    ctx.lineWidth = .8 / scale; ctx.strokeStyle = `hsla(${p.hue},${p.sat}%,60%,${.35 * e})`; ctx.stroke();
    ctx.lineWidth = .5 / scale; ctx.strokeStyle = `rgba(88,59,56,${.16 * e})`;
    for (let v = 0; v < p.veins; v++) {
      const o = p.veins === 1 ? 0 : (v / (p.veins - 1) - .5) * p.s.w * L * 1.1, a = P(L * .12, o * .1), b = P(L * .78, o);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.fillStyle = `rgba(88,59,56,${.4 * e})`;
    for (let d = 0; d < p.dots; d++) { const q = P(L * (.3 + .55 * d / 9), 0); ctx.beginPath(); ctx.arc(q[0], q[1], 1.2 / scale + .6, 0, 6.28); ctx.fill(); }
    ctx.restore();
  }

  function frame(t) {
    if (!visible) { running = false; return; }
    petals.forEach(p => { if (p.born === null) p.born = t; }); // el pétalo nuevo empieza a crecer al verse la pantalla
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
    const extent = petals.reduce((m, p) => Math.max(m, p.len * 1.08 + 20), 120);
    scale += (Math.min(W, H) * OPTS.fit / extent - scale) * .04;
    ctx.translate(W / 2, H * OPTS.cy); ctx.scale(scale, scale);
    ctx.globalCompositeOperation = OPTS.blend; petals.forEach(p => drawPetal(p, t)); ctx.globalCompositeOperation = 'source-over';
    petals.forEach(p => {
      const rr = 3.2 * Math.sqrt(p.i + 1), a = p.i * GOLD, e = Math.min(1, (t - p.born) / 1200);
      ctx.fillStyle = p.i === hover ? `rgba(88,59,56,${e})` : `hsla(${p.hue},60%,52%,${.8 * e})`;
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, p.i === hover ? 3 : 1.6, 0, 6.28); ctx.fill();
    });
    requestAnimationFrame(frame);
  }
  const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  function resize() {
    const r = box.getBoundingClientRect(); DPR = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = W * DPR; cv.height = H * DPR;
  }

  function setupHover(tip) {
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left - W / 2) / scale, y = (e.clientY - r.top - H * OPTS.cy) / scale;
      const ang = Math.atan2(y, x), rad = Math.hypot(x, y); let best = -1, bd = 1e9;
      petals.forEach(p => {
        const da = 3.1416 - Math.abs(((ang - p.angle) % 6.2832 + 9.4248) % 6.2832 - 3.1416), d = da * 60 + Math.abs(rad - p.len * .55) * .2;
        if (da < .22 && rad < p.len + 20 && d < bd) { bd = d; best = p.i; }
      });
      hover = best;
      if (best >= 0 && petals[best].a.text) {
        tip.textContent = '“' + petals[best].a.text + '”';
        tip.style.left = Math.min(e.clientX - r.left + 14, W - 250) + 'px'; tip.style.top = e.clientY - r.top + 14 + 'px'; tip.style.opacity = 1;
      } else tip.style.opacity = 0;
    });
    cv.addEventListener('pointerleave', () => { hover = -1; tip.style.opacity = 0; });
  }

  const F = window.FlorTiempo = {
    store: localStore, options: OPTS,
    add(a, instant) { petals.push(makePetal(a, petals.length, instant)); if (visible) start(); },
    async init() {
      box = document.getElementById('flor-colectiva'); if (!box) return;
      cv = document.createElement('canvas'); cv.setAttribute('aria-label', 'Flor formada por las respuestas de la comunidad');
      cv.style.cssText = 'width:100%;height:100%;display:block';
      const tip = document.createElement('div'); tip.className = 'flor-tip';
      box.append(cv, tip); ctx = cv.getContext('2d'); resize(); setupHover(tip);
      new ResizeObserver(resize).observe(box);
      const screen = box.closest('.screen'), sync = () => { visible = screen.classList.contains('screen--active'); if (visible) start(); };
      new MutationObserver(sync).observe(screen, { attributes: true, attributeFilter: ['class'] }); sync();
      try { (await F.store.load()).forEach(a => F.add(a, true)); } catch (e) { console.warn('No se pudo cargar la flor', e); }
    },
  };

  /* Al enviar la pregunta 3 (fase de captura: corre antes que tu app.js) */
  document.addEventListener('submit', e => {
    if (e.target.id !== 'remain-form') return;
    const pick = (name, list) => { const c = document.querySelector(`input[name="${name}"]:checked`); const i = c ? list.indexOf(c.value) : -1; return i < 0 ? 4 : i; };
    const a = { q1: pick('future', FUTURE), q2: pick('time-change', CHANGE), text: (document.getElementById('remain-answer').value || '').trim() };
    F.add(a, false);
    Promise.resolve(F.store.save(a)).catch(err => console.warn('No se pudo guardar', err));
  }, true);

  document.addEventListener('DOMContentLoaded', () => F.init());
})();
