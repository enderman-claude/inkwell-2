import { rng, paintSegment, hexToRgb } from './engine.js';

function snap(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  c.getContext('2d').drawImage(canvas, 0, 0);
  return c;
}

export function createPen({ stage, doc, history, toBoard, getBrush, getColour, allow = () => true, clip = () => null }) {
  let stroke = null;
  let seed = 1;

  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || e.button !== 0 || !allow()) return;
    const layer = doc.activeLayer();
    if (!layer || layer.lock) return;
    const [x, y] = toBoard(e.clientX, e.clientY);
    const canvas = layer.canvas;
    const before = snap(canvas);
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const brush = getBrush();
    stroke = {
      canvas, before, id: e.pointerId, brush,
      ctx: canvas.getContext('2d'),
      colour: hexToRgb(getColour()),
      rand: rng(seed),
      last: [x, y],
      direction: 0,
      alphaLock: layer.alphaLock,
      seed
    };
    stroke.ctx.lineCap = 'round';
    if (stroke.alphaLock && !brush.erase) stroke.ctx.globalCompositeOperation = 'source-atop';
    paintSegment(stroke, [x, y], e.pressure > 0 ? e.pressure : 0.5);
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', e => {
    if (!stroke || e.pointerId !== stroke.id) return;
    for (const c of (e.getCoalescedEvents?.() || [e])) {
      const [x, y] = toBoard(c.clientX, c.clientY);
      paintSegment(stroke, [x, y], c.pressure > 0 ? c.pressure : 0.5);
    }
  });

  const end = e => {
    if (!stroke || e.pointerId !== stroke.id) return;
    const { canvas, before } = stroke;
    stroke.ctx.globalCompositeOperation = 'source-over';
    let after = snap(canvas);
    const clipped = clip(before, after);
    if (clipped) {
      after = clipped;
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.drawImage(after, 0, 0);
    }
    history.push({
      undo: () => { const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height); c.drawImage(before, 0, 0); doc.emit(); },
      redo: () => { const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height); c.drawImage(after, 0, 0); doc.emit(); }
    });
    stroke = null;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
}
