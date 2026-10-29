export const SNAP = 84;
const MARGIN = 10;
const KEY = 'inkwell2-ui';
const mods = new Map();
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { saved = {}; }

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isVertical = edge => edge === 'left' || edge === 'right';

function area() {
  return { x0: MARGIN, y0: MARGIN, x1: innerWidth - MARGIN, y1: innerHeight - MARGIN };
}

function place(m) {
  const n = m.node, a = area(), w = n.offsetWidth, h = n.offsetHeight;
  const at = m.at;
  n.classList.toggle('v', at.edge ? isVertical(at.edge) : false);
  n.dataset.edge = at.edge || 'float';
  let x, y;
  if (at.edge === 'top') { x = a.x0 + at.t * (a.x1 - a.x0 - w); y = a.y0; }
  else if (at.edge === 'bottom') { x = a.x0 + at.t * (a.x1 - a.x0 - w); y = a.y1 - h; }
  else if (at.edge === 'left') { x = a.x0; y = a.y0 + at.t * (a.y1 - a.y0 - h); }
  else if (at.edge === 'right') { x = a.x1 - w; y = a.y0 + at.t * (a.y1 - a.y0 - h); }
  else { x = a.x0 + at.fx * Math.max(0, a.x1 - a.x0 - w); y = a.y0 + at.fy * Math.max(0, a.y1 - a.y0 - h); }
  n.style.left = x + 'px';
  n.style.top = y + 'px';
}

function save() {
  const out = {};
  mods.forEach((m, id) => { out[id] = m.at; });
  try { localStorage.setItem(KEY, JSON.stringify(out)); } catch { }
}

export function register(id, node, fallback) {
  const at = saved[id] || { ...fallback };
  const m = { id, node, fallback, at };
  mods.set(id, m);
  node.dataset.module = id;
  node.classList.add('mod');
  place(m);
  return m;
}

export function relayout() { mods.forEach(place); }
addEventListener('resize', relayout);

export function resetLayout() {
  mods.forEach(m => { m.at = { ...m.fallback }; });
  try { localStorage.removeItem(KEY); } catch { }
  relayout();
}

function nearestEdge(node, x, y) {
  const a = area(), w = node.offsetWidth, h = node.offsetHeight;
  const thickness = Math.min(w, h) / 2;
  const d = [
    ['top', y - a.y0],
    ['bottom', a.y1 - (y + h)],
    ['left', x - a.x0],
    ['right', a.x1 - (x + w)]
  ].sort((p, q) => p[1] - q[1])[0];
  return d[1] - thickness < SNAP ? d[0] : null;
}

function dropAt(m, edge) {
  const n = m.node, a = area(), w = n.offsetWidth, h = n.offsetHeight;
  const x = parseFloat(n.style.left), y = parseFloat(n.style.top);
  if (edge) {
    const vertical = isVertical(edge);
    const range = vertical ? a.y1 - a.y0 - h : a.x1 - a.x0 - w;
    const pos = vertical ? y - a.y0 : x - a.x0;
    m.at = { edge, t: range > 0 ? +clamp(pos / range, 0, 1).toFixed(3) : 0.5 };
  } else {
    const rx = Math.max(1, a.x1 - a.x0 - w), ry = Math.max(1, a.y1 - a.y0 - h);
    m.at = { edge: null, fx: +clamp((x - a.x0) / rx, 0, 1).toFixed(3), fy: +clamp((y - a.y0) / ry, 0, 1).toFixed(3) };
  }
  place(m);
  save();
}

export function attach(m, handle, options = {}) {
  let drag = null;
  handle.style.touchAction = 'none';
  handle.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    handle.setPointerCapture(e.pointerId);
    const r = m.node.getBoundingClientRect();
    drag = { sx: e.clientX, sy: e.clientY, left: r.left, top: r.top, moved: false, edge: null };
  });
  handle.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      drag.moved = true;
      m.node.classList.add('dragging');
    }
    const x = drag.left + e.clientX - drag.sx, y = drag.top + e.clientY - drag.sy;
    drag.edge = nearestEdge(m.node, x, y);
    m.node.style.left = x + 'px';
    m.node.style.top = y + 'px';
    m.node.dataset.edge = drag.edge || 'float';
    options.onHint && options.onHint(drag.edge);
  });
  const finish = tap => () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    m.node.classList.remove('dragging');
    options.onHint && options.onHint(null);
    if (d.moved) dropAt(m, d.edge);
    else if (tap && options.onTap) options.onTap();
  };
  handle.addEventListener('pointerup', finish(true));
  handle.addEventListener('pointercancel', finish(false));
}
