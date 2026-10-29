let nextId = 1;
export const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'soft-light', 'difference'];

export function createDocument(W, H) {
  const doc = { W, H, layers: [], active: 0 };
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => fn(doc));

  function makeLayer(name) {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    return { id: nextId++, name, canvas, visible: true, opacity: 1, lock: false, alphaLock: false, mode: 'normal' };
  }

  doc.layers.push(makeLayer('Background'));

  doc.snapshot = () => ({ layers: doc.layers.slice(), active: doc.active });
  doc.restore = s => { doc.layers = s.layers.slice(); doc.active = s.active; emit(); };

  doc.activeLayer = () => doc.layers[doc.active];

  doc.add = () => {
    const at = doc.active + 1;
    doc.layers.splice(at, 0, makeLayer('Layer ' + nextId));
    doc.active = at;
    emit();
  };

  doc.duplicate = i => {
    const src = doc.layers[i];
    const copy = makeLayer(src.name + ' copy');
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
      const nodes = doc.layers.map(l => {
        l.canvas.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;opacity:${l.opacity};display:${l.visible ? 'block' : 'none'};mix-blend-mode:${l.mode}`;
        return l.canvas;
      });
      board.replaceChildren(...nodes);
    };
    doc.subscribe(sync);
    sync();
  };

  return doc;
}
