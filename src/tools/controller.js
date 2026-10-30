import { createSelection, clipToSelection } from '../core/selection.js';
import { createOverlay } from '../canvas/overlay.js';
import { bind } from '../ui/keys.js';

const HANDLE = 10;

function copyCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

function alphaBounds(canvas) {
  const { width: W, height: H } = canvas;
  const d = canvas.getContext('2d').getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 0) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export function createTools({ store, doc, history, view, stage, board, toBoard }) {
  let sel = null;
  let overlay = null;
  let drag = null;
  let poly = null;
  let tf = null;
  let prevTool = 'brush';
  const accent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#5C7A99';
  const paper = () => getComputedStyle(document.documentElement).getPropertyValue('--panel').trim() || '#fff';

  function rebuild() {
    if (sel && sel.W === doc.W && sel.H === doc.H) return;
    sel = createSelection(doc.W, doc.H);
    if (overlay) overlay.canvas.remove();
    overlay = createOverlay(board, doc.W, doc.H);
    sel.subscribe(() => drawSelection());
    drawSelection();
  }
  doc.subscribe(() => rebuild());
  rebuild();

  function setTool(t) { store.set({ tool: t }); }
  function drawSelection() { if (overlay) overlay.drawSelection(sel.mask, sel.bounds(), accent()); }

  /* Selection changes are undoable like everything else. */
  function undoableSelection(change) {
    const before = sel.snapshot();
    change();
    const after = sel.snapshot();
    history.push({ undo: () => sel.restore(before), redo: () => sel.restore(after) });
  }

  function commitShape(kind, a, b, mode) {
    undoableSelection(() => {
      if (kind === 'rect') sel.rect(a[0], a[1], b[0], b[1], mode);
      if (kind === 'ellipse') sel.ellipse(a[0], a[1], b[0], b[1], mode);
    });
  }

  /* ---------- Selection tool ---------- */
  function selectDown(e) {
    const [x, y] = toBoard(e.clientX, e.clientY);
    const st = store.get();
    const mode = st.selMode;
    if (st.selTool === 'wand') {
      const layer = doc.activeLayer();
      undoableSelection(() => sel.wand(layer.canvas, Math.floor(x), Math.floor(y), 24, mode));
      return;
    }
    if (st.selTool === 'poly') {
      if (!poly) poly = [];
      poly.push([x, y]);
      drawPoly(x, y);
      return;
    }
    drag = { kind: st.selTool, a: [x, y], b: [x, y], mode, points: [[x, y]], id: e.pointerId };
    stage.setPointerCapture(e.pointerId);
  }

  function drawPoly(hx, hy) {
    overlay.clear();
    const ctx = overlay.canvas.getContext('2d');
    const s = Math.max(1, overlay.canvas.width / overlay.canvas.getBoundingClientRect().width);
    ctx.save();
    ctx.strokeStyle = accent(); ctx.lineWidth = s;
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (hx !== undefined) ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.restore();
  }

  function closePoly() {
    if (poly && poly.length >= 3) {
      const pts = poly;
      undoableSelection(() => sel.polygon(pts, store.get().selMode));
    }
    poly = null;
    drawSelection();
  }

  function selectMove(e) {
    if (poly) { const [x, y] = toBoard(e.clientX, e.clientY); drawPoly(x, y); return; }
    if (!drag || e.pointerId !== drag.id) return;
    const [x, y] = toBoard(e.clientX, e.clientY);
    drag.b = [x, y];
    if (drag.kind === 'lasso') drag.points.push([x, y]);
    overlay.clear();
    const ctx = overlay.canvas.getContext('2d');
    const s = Math.max(1, overlay.canvas.width / overlay.canvas.getBoundingClientRect().width);
    ctx.save();
    ctx.strokeStyle = accent(); ctx.lineWidth = s; ctx.setLineDash([6 * s, 4 * s]);
    ctx.beginPath();
    if (drag.kind === 'rect') ctx.rect(Math.min(drag.a[0], x), Math.min(drag.a[1], y), Math.abs(x - drag.a[0]), Math.abs(y - drag.a[1]));
    if (drag.kind === 'ellipse') ctx.ellipse((drag.a[0] + x) / 2, (drag.a[1] + y) / 2, Math.abs(x - drag.a[0]) / 2, Math.abs(y - drag.a[1]) / 2, 0, 0, Math.PI * 2);
    if (drag.kind === 'lasso') drag.points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
    ctx.restore();
  }

  function selectUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.kind === 'rect' || d.kind === 'ellipse') commitShape(d.kind, d.a, d.b, d.mode);
    if (d.kind === 'lasso') {
      const pts = d.points;
      if (pts.length >= 3) undoableSelection(() => sel.polygon(pts, d.mode));
    }
    drawSelection();
  }

  /* ---------- Transform tool ---------- */
  function renderTf() {
    const { layer, src, box } = tf;
    const ctx = layer.canvas.getContext('2d');
    ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    ctx.save();
    ctx.translate(box.cx, box.cy);
    ctx.rotate(box.rot);
    ctx.scale(box.sx * box.fx, box.sy * box.fy);
    ctx.drawImage(src, -box.sw / 2, -box.sh / 2);
    ctx.restore();
    drawBox();
  }

  function localToBoard(lx, ly) {
    const { box } = tf;
    const c = Math.cos(box.rot), s = Math.sin(box.rot);
    const x = lx * box.sx * box.fx, y = ly * box.sy * box.fy;
    return [box.cx + x * c - y * s, box.cy + x * s + y * c];
  }

  function handles() {
    const { box } = tf;
    const hw = box.sw / 2, hh = box.sh / 2;
    const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => localToBoard(x, y));
    const top = localToBoard(0, -hh), rotAt = localToBoard(0, -hh - 28 / Math.max(box.sx, 0.01));
    return { corners, top, rotAt };
  }

  function drawBox() {
    if (!tf) return;
    const h = handles();
    const s = Math.max(1, overlay.canvas.width / overlay.canvas.getBoundingClientRect().width);
    overlay.drawBox(h.corners, { from: h.top, at: h.rotAt }, HANDLE * s / s, accent(), paper());
  }

  function insideBox(x, y) {
    const { corners } = handles();
    let inside = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const [xi, yi] = corners[i], [xj, yj] = corners[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function startTransform(layer, useSelection) {
    if (tf) cancelTransform();
    const before = copyCanvas(layer.canvas);
    let src, box;
    const b = useSelection && sel.isActive() ? sel.bounds() : alphaBounds(layer.canvas);
    if (!b) return false;
    src = document.createElement('canvas');
    src.width = b.w; src.height = b.h;
    const sc = src.getContext('2d');
    sc.drawImage(layer.canvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    if (useSelection && sel.isActive()) {
      sc.globalCompositeOperation = 'destination-in';
      sc.drawImage(sel.mask, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
      const lc = layer.canvas.getContext('2d');
      lc.save();
      lc.globalCompositeOperation = 'destination-out';
      lc.drawImage(sel.mask, 0, 0);
      lc.restore();
    } else {
      layer.canvas.getContext('2d').clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    }
    box = { cx: b.x + b.w / 2, cy: b.y + b.h / 2, sw: b.w, sh: b.h, sx: 1, sy: 1, rot: 0, fx: 1, fy: 1 };
    tf = { layer, before, src, box, selBefore: sel.snapshot(), changed: false };
    if (store.get().tool !== 'transform') prevTool = store.get().tool;
    setTool('transform');
    renderTf();
    return true;
  }

  function applyTransform() {
    if (!tf) return;
    const { layer, before, selBefore } = tf;
    if (!tf.changed) { cancelTransform(); return; }
    if (sel.isActive()) sel.clear();
    const after = copyCanvas(layer.canvas);
    const selAfter = sel.snapshot();
    history.push({
      undo: () => { const c = layer.canvas.getContext('2d'); c.clearRect(0, 0, after.width, after.height); c.drawImage(before, 0, 0); sel.restore(selBefore); doc.emit(); },
      redo: () => { const c = layer.canvas.getContext('2d'); c.clearRect(0, 0, after.width, after.height); c.drawImage(after, 0, 0); sel.restore(selAfter); doc.emit(); }
    });
    tf = null;
    overlay.clear();
    setTool(prevTool === 'transform' ? 'brush' : prevTool);
    doc.emit();
  }

  function cancelTransform() {
    if (!tf) return;
    const c = tf.layer.canvas.getContext('2d');
    c.clearRect(0, 0, tf.layer.canvas.width, tf.layer.canvas.height);
    c.drawImage(tf.before, 0, 0);
    tf = null;
    overlay.clear();
    setTool(prevTool === 'transform' ? 'brush' : prevTool);
    doc.emit();
  }

  let mode = null, start = null;
  function transformDown(e) {
    if (!tf) return;
    const [x, y] = toBoard(e.clientX, e.clientY);
    const h = handles();
    const r = 12 * (overlay.canvas.width / overlay.canvas.getBoundingClientRect().width);
    const near = (p) => Math.hypot(p[0] - x, p[1] - y) <= r;
    if (near(h.rotAt)) mode = 'rotate';
    else if (h.corners.some(near)) mode = 'scale';
    else if (insideBox(x, y)) mode = 'move';
    else return;
    start = { x, y, cx: tf.box.cx, cy: tf.box.cy, rot: tf.box.rot, sx: tf.box.sx, sy: tf.box.sy, d: Math.hypot(x - tf.box.cx, y - tf.box.cy) || 1 };
    stage.setPointerCapture(e.pointerId);
  }

  function transformMove(e) {
    if (!tf || !mode) return;
    const [x, y] = toBoard(e.clientX, e.clientY);
    const b = tf.box;
    tf.changed = true;
    if (mode === 'move') { b.cx = start.cx + x - start.x; b.cy = start.cy + y - start.y; }
    if (mode === 'rotate') b.rot = Math.atan2(y - b.cy, x - b.cx) + Math.PI / 2;
    if (mode === 'scale') {
      const k = Math.max(0.05, Math.hypot(x - b.cx, y - b.cy) / start.d);
      b.sx = start.sx * k; b.sy = start.sy * k;
    }
    renderTf();
  }

  function transformUp() { mode = null; start = null; }

  /* ---------- Wiring ---------- */
  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const t = store.get().tool;
    if (t === 'select') selectDown(e);
    if (t === 'transform') transformDown(e);
  });
  stage.addEventListener('pointermove', e => {
    const t = store.get().tool;
    if (t === 'select') selectMove(e);
    if (t === 'transform') transformMove(e);
  });
  const up = e => {
    const t = store.get().tool;
    if (t === 'select') selectUp(e);
    if (t === 'transform') transformUp();
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  bind('enter', 'transform.apply', () => { if (tf) applyTransform(); else if (poly) closePoly(); }, { allowInInput: false });
  bind('esc', 'transform.cancel', () => { if (tf) cancelTransform(); else if (poly) { poly = null; drawSelection(); } });
  bind('m', 'tool.rect', () => { store.set({ tool: 'select', selTool: 'rect' }); });
  bind('l', 'tool.lasso', () => { store.set({ tool: 'select', selTool: 'lasso' }); });
  bind('p', 'tool.polygon', () => { store.set({ tool: 'select', selTool: 'poly' }); });
  bind('w', 'tool.wand', () => { store.set({ tool: 'select', selTool: 'wand' }); });
  bind('e', 'tool.ellipse', () => { store.set({ tool: 'select', selTool: 'ellipse' }); });
  bind('v', 'tool.transform', () => { if (!tf) startTransform(doc.activeLayer(), true); });
  bind('b', 'tool.brush', () => setTool('brush'));
  bind('ctrl+a', 'select.all', () => undoableSelection(() => sel.all()));
  bind('ctrl+d', 'select.none', () => undoableSelection(() => sel.clear()));
  bind('alt+i', 'select.invert', () => undoableSelection(() => sel.invert()));
  bind('ctrl+alt+f', 'select.feather', () => undoableSelection(() => sel.feather(4)));

  return {
    selection: () => sel,
    isBrush: () => store.get().tool === 'brush',
    /** Clips a finished stroke to the selection, if one exists. */
    clipStroke(before, after, layer) {
      if (!sel.isActive()) return null;
      return clipToSelection(before, after, sel.mask);
    },
    openTransform(layer) { return startTransform(layer, false); },
    commitPending() { if (tf) applyTransform(); },
    actions: {
      transform: () => startTransform(doc.activeLayer(), true),
      all: () => undoableSelection(() => sel.all()),
      none: () => undoableSelection(() => sel.clear()),
      invert: () => undoableSelection(() => sel.invert()),
      feather: () => undoableSelection(() => sel.feather(4)),
      flip: axis => { if (tf) { if (axis === 'h') tf.box.fx *= -1; else tf.box.fy *= -1; tf.changed = true; renderTf(); } },
      apply: () => applyTransform(),
      cancel: () => cancelTransform()
    },
    startTransform, applyTransform, cancelTransform,
    flip(axis) {
      if (!tf) return;
      if (axis === 'h') tf.box.fx *= -1; else tf.box.fy *= -1;
      tf.changed = true;
      renderTf();
    },
    isTransforming: () => !!tf,
    closePoly
  };
}
