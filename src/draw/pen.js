export function createPen({ stage, canvas, toBoard, size = 10, colour = '#3B4F6B' }) {
  const ctx = canvas.getContext('2d');
  const undoStack = [];
  const redoStack = [];
  const copy = () => {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    c.getContext('2d').drawImage(canvas, 0, 0);
    return c;
  };
  const restore = src => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(src, 0, 0); };
  let stroke = null;

  stage.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const [x, y] = toBoard(e.clientX, e.clientY);
    undoStack.push(copy());
    if (undoStack.length > 20) undoStack.shift();
    redoStack.length = 0;
    stroke = { last: [x, y], mid: [x, y], pressure: e.pressure > 0 ? e.pressure : 0.5, id: e.pointerId };
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', e => {
    if (!stroke || e.pointerId !== stroke.id) return;
    const [x, y] = toBoard(e.clientX, e.clientY);
    const p = e.pressure > 0 ? e.pressure : 0.5;
    const [lx, ly] = stroke.last;
    const mx = (lx + x) / 2, my = (ly + y) / 2;
    const w = size * (0.2 + 0.8 * p);
    ctx.strokeStyle = colour;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(stroke.mid[0], stroke.mid[1]);
    ctx.quadraticCurveTo(lx, ly, mx, my);
    ctx.stroke();
    stroke.last = [x, y];
    stroke.mid = [mx, my];
    stroke.pressure = p;
  });

  const end = e => {
    if (!stroke || e.pointerId !== stroke.id) return;
    const [lx, ly] = stroke.last;
    ctx.lineWidth = size * (0.2 + 0.8 * stroke.pressure);
    ctx.lineCap = 'round';
    ctx.strokeStyle = colour;
    ctx.beginPath();
    ctx.moveTo(stroke.mid[0], stroke.mid[1]);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    stroke = null;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  return {
    undo() {
      if (!undoStack.length) return;
      redoStack.push(copy());
      restore(undoStack.pop());
    },
    redo() {
      if (!redoStack.length) return;
      undoStack.push(copy());
      restore(redoStack.pop());
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0
  };
}
