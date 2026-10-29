function dab(ctx, x, y, radius, brush, colour, alpha) {
  const hard = Math.min(0.999, Math.max(0, brush.hardness));
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, colour);
  g.addColorStop(hard, colour);
  g.addColorStop(1, colour.replace(/[\d.]+\)$/, '0)'));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
};

function snap(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  c.getContext('2d').drawImage(canvas, 0, 0);
  return c;
}

export function createPen({ stage, doc, history, toBoard, getBrush }) {
  let stroke = null;

  function paintTo(s, x, y, p) {
    const b = s.brush;
    const r = Math.max(0.5, b.size * (0.2 + 0.8 * p) / 2);
    const [lx, ly] = s.last;
    const dist = Math.hypot(x - lx, y - ly);
    const step = Math.max(0.5, r * 2 * b.spacing);
    const n = Math.max(1, Math.ceil(dist / step));
    const colour = b.erase ? 'rgba(0,0,0,1)' : rgba(b.colour, 1);
    const ctx = s.ctx;
    ctx.save();
    if (b.erase) ctx.globalCompositeOperation = 'destination-out';
    else if (s.alphaLock) ctx.globalCompositeOperation = 'source-atop';
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      dab(ctx, lx + (x - lx) * t, ly + (y - ly) * t, r, b, colour, b.flow);
    }
    ctx.restore();
    s.last = [x, y];
  }

  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const layer = doc.activeLayer();
    if (!layer || layer.lock) return;
    const [x, y] = toBoard(e.clientX, e.clientY);
    const canvas = layer.canvas;
    const before = snap(canvas);
    stroke = { canvas, before, ctx: canvas.getContext('2d'), brush: getBrush(), last: [x, y], id: e.pointerId, alphaLock: layer.alphaLock };
    paintTo(stroke, x, y, e.pressure > 0 ? e.pressure : 0.5);
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', e => {
    if (!stroke || e.pointerId !== stroke.id) return;
    for (const c of (e.getCoalescedEvents?.() || [e])) {
      const [x, y] = toBoard(c.clientX, c.clientY);
      paintTo(stroke, x, y, c.pressure > 0 ? c.pressure : 0.5);
    }
  });

  const end = e => {
    if (!stroke || e.pointerId !== stroke.id) return;
    const { canvas, before } = stroke;
    const after = snap(canvas);
    history.push({
      undo: () => { const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height); c.drawImage(before, 0, 0); doc.emit(); },
      redo: () => { const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height); c.drawImage(after, 0, 0); doc.emit(); }
    });
    stroke = null;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
}
