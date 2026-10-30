let nextId = 1;
export const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'soft-light', 'difference'];

export function makeLayer(W, H, name, fill) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  if (fill) { const c = canvas.getContext('2d'); c.fillStyle = fill; c.fillRect(0, 0, W, H); }
  return { id: nextId++, name, canvas, visible: true, opacity: 1, lock: false, alphaLock: false, mode: 'normal' };
}

export function createDocument(W, H, fill) {
  const doc = { W, H, layers: [makeLayer(W, H, 'Background', fill)], active: 0 };
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => fn(doc));

  doc.snapshot = () => ({ layers: doc.layers.slice(), active: doc.active });
  doc.restore = s => { doc.layers = s.layers.slice(); doc.active = s.active; emit(); };
  doc.activeLayer = () => doc.layers[doc.active];

  doc.load = ({ W: w, H: h, layers, active = 0 }) => {
    doc.W = w; doc.H = h;
    doc.layers = layers;
    doc.active = Math.min(active, layers.length - 1);
    emit();
  };

  doc.insert = layer => {
    const at = doc.active + 1;
    doc.layers.splice(at, 0, layer);
    doc.active = at;
    emit();
  };

  doc.add = () => { doc.insert(makeLayer(doc.W, doc.H, 'Layer ' + nextId)); };

  doc.duplicate = i => {
    const src = doc.layers[i];
    const copy = makeLayer(doc.W, doc.H, src.name + ' copy');
    copy.canvas.getContext('2d').drawImage(src.canvas, 0, 0);
    Object.assign(copy, { visible: src.visible, opacity: src.opacity, mode: src.mode, alphaLock: src.alphaLock });
    doc.layers.splice(i + 1, 0, copy);
    doc.active = i + 1;
    emit();
  };

  doc.remove = i => {
    if (doc.layers.length <= 1) return;
    doc.layers.splice(i, 1);
    doc.active = Math.min(doc.active, doc.layers.length - 1);
    emit();
  };

  doc.mergeDown = i => {
    if (i <= 0) return;
    const top = doc.layers[i], below = doc.layers[i - 1];
    const ctx = below.canvas.getContext('2d');
    ctx.save();
    ctx.globalAlpha = top.opacity;
    ctx.globalCompositeOperation = top.mode === 'normal' ? 'source-over' : top.mode;
    if (top.visible) ctx.drawImage(top.canvas, 0, 0);
    ctx.restore();
    doc.layers.splice(i, 1);
    doc.active = i - 1;
    emit();
  };

  doc.move = (i, dir) => {
    const j = i + dir;
    if (i <= 0 || j <= 0 || j >= doc.layers.length) return;
    [doc.layers[i], doc.layers[j]] = [doc.layers[j], doc.layers[i]];
    doc.active = j;
    emit();
  };

  doc.select = i => { doc.active = i; emit(); };
  doc.set = (i, props) => { Object.assign(doc.layers[i], props); emit(); };
  doc.subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
  doc.emit = emit;

  doc.mountBoard = board => {
    const sync = () => {
      board.style.width = doc.W + 'px';
      board.style.height = doc.H + 'px';
      const nodes = doc.layers.map(l => {
        l.canvas.style.cssText = `position:absolute;left:0;top:0;width:${doc.W}px;height:${doc.H}px;opacity:${l.opacity};display:${l.visible ? 'block' : 'none'};mix-blend-mode:${l.mode}`;
        return l.canvas;
      });
      const overlay = board.querySelector('.overlay');
      board.replaceChildren(...nodes, ...(overlay ? [overlay] : []));
    };
    doc.subscribe(sync);
    sync();
  };

  return doc;
}
