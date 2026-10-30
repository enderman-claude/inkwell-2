import { bind } from '../ui/keys.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ROT = Math.PI / 12;
const norm = a => Math.atan2(Math.sin(a), Math.cos(a));

export function createView({ stage, board, W: w0, H: h0 }) {
  let W = w0, H = h0;
  const v = { x: 0, y: 0, k: 1, r: 0 };
  const apply = () => { board.style.transform = `translate(${v.x}px,${v.y}px) rotate(${v.r}rad) scale(${v.k})`; };
  const set = nv => { Object.assign(v, nv); apply(); };
  const rect = () => stage.getBoundingClientRect();

  function fit() {
    const r = rect(), k = Math.min(r.width / W, r.height / H) * .94;
    set({ k, r: 0, x: (r.width - W * k) / 2, y: (r.height - H * k) / 2 });
  }
  function pt(cx, cy) {
    const r = rect(), dx = cx - r.left - v.x, dy = cy - r.top - v.y, c = Math.cos(v.r), s = Math.sin(v.r);
    return [(dx * c + dy * s) / v.k, (-dx * s + dy * c) / v.k];
  }
  function anchor(p, sx, sy, k, rot) {
    const r = rect(), c = Math.cos(rot), s = Math.sin(rot);
    set({ k, r: rot, x: sx - r.left - k * (c * p[0] - s * p[1]), y: sy - r.top - k * (s * p[0] + c * p[1]) });
  }
  const zoomAt = (cx, cy, k) => anchor(pt(cx, cy), cx, cy, clamp(k, .1, 16), v.r);
  const mid = () => { const r = rect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const zoom100 = () => zoomAt(...mid(), 1);
  const rotateTo = rot => { const [cx, cy] = mid(); anchor(pt(cx, cy), cx, cy, v.k, norm(rot)); };
  const rotateBy = d => rotateTo(v.r + d);
  const resetRot = () => rotateTo(0);

  const touches = new Map();
  let pan = null, g = null, space = false;

  stage.addEventListener('pointerdown', e => {
    stage.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (touches.size >= 2) {
        const [a, b] = [...touches.values()];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        g = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, a: Math.atan2(b[1] - a[1], b[0] - a[0]), mx, my, p: pt(mx, my), v: { ...v } };
        pan = null;
        return;
      }
    }
    if (e.button === 1 || space || e.pointerType === 'touch') pan = { x: e.clientX, y: e.clientY, v: { ...v } };
  });

  stage.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (g && touches.size >= 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const da = norm(Math.atan2(b[1] - a[1], b[0] - a[0]) - g.a);
        let rot = norm(g.v.r + da);
        if (Math.abs(rot) < .06) rot = 0;
        anchor(g.p, mx, my, clamp(g.v.k * d / g.d, .1, 16), rot);
        return;
      }
    }
    if (pan) set({ ...pan.v, x: pan.v.x + e.clientX - pan.x, y: pan.v.y + e.clientY - pan.y });
  });

  const release = e => {
    if (e.pointerType === 'touch') {
      touches.delete(e.pointerId);
      if (touches.size < 2) g = null;
    }
    pan = null;
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('contextmenu', e => e.preventDefault());

  stage.addEventListener('wheel', e => {
    e.preventDefault();
    if (e.altKey) anchor(pt(e.clientX, e.clientY), e.clientX, e.clientY, v.k, norm(v.r - e.deltaY * .002));
    else zoomAt(e.clientX, e.clientY, v.k * Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)));
  }, { passive: false });

  bind('space', 'view.pan', () => { space = true; }, { up: () => { space = false; }, allowInDialog: false });
  bind('0', 'view.fit', () => fit());
  bind('z', 'view.actual-size', () => zoom100());
  bind('r', 'view.rotate-cw', () => rotateBy(ROT));
  bind('shift+r', 'view.rotate-ccw', () => rotateBy(-ROT));
  addEventListener('resize', () => apply());

  const setSize = (w, h) => { W = w; H = h; };
  return { fit, zoom100, rotateBy, resetRot, zoomAt, pt, state: v, apply, setSize };
}
