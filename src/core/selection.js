/*
 * A selection is a full-size alpha mask. White = selected. Every op writes to the mask,
 * so shapes, wand results, invert, and feather all combine the same way.
 */
export function createSelection(W, H) {
  const mask = document.createElement('canvas');
  mask.width = W; mask.height = H;
  const mctx = mask.getContext('2d');
  let active = false;
  let bbox = null;
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => fn());

  function refreshBounds() {
    const d = mctx.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        if (d[(y * W + x) * 4 + 3] > 127) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    active = x1 >= 0;
    bbox = active ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null;
  }

  function combine(src, mode) {
    if (mode === 'new') mctx.clearRect(0, 0, W, H);
    mctx.save();
    if (mode === 'subtract') mctx.globalCompositeOperation = 'destination-out';
    else if (mode === 'intersect') mctx.globalCompositeOperation = 'destination-in';
    else mctx.globalCompositeOperation = 'source-over';
    mctx.drawImage(src, 0, 0);
    mctx.restore();
    refreshBounds();
    emit();
  }

  function shapeCanvas(draw) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    draw(ctx);
    ctx.fill();
    return c;
  }

  const api = {
    W, H, mask,
    isActive: () => active,
    bounds: () => bbox,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    clear() { mctx.clearRect(0, 0, W, H); refreshBounds(); emit(); },
    snapshot() { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(mask, 0, 0); return c; },
    restore(src) { mctx.clearRect(0, 0, W, H); mctx.drawImage(src, 0, 0); refreshBounds(); emit(); },
    all() { mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, W, H); refreshBounds(); emit(); },
    invert() {
      const keep = document.createElement('canvas');
      keep.width = W; keep.height = H;
      keep.getContext('2d').drawImage(mask, 0, 0);
      mctx.clearRect(0, 0, W, H);
      mctx.fillStyle = '#fff';
      mctx.fillRect(0, 0, W, H);
      mctx.globalCompositeOperation = 'destination-out';
      mctx.drawImage(keep, 0, 0);
      mctx.globalCompositeOperation = 'source-over';
      refreshBounds(); emit();
    },
    feather(px) {
      const keep = document.createElement('canvas');
      keep.width = W; keep.height = H;
      keep.getContext('2d').drawImage(mask, 0, 0);
      mctx.clearRect(0, 0, W, H);
      mctx.filter = `blur(${px}px)`;
      mctx.drawImage(keep, 0, 0);
      mctx.filter = 'none';
      refreshBounds(); emit();
    },
    rect(x0, y0, x1, y1, mode) {
      const x = Math.min(x0, x1), y = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
      if (w < 1 || h < 1) return;
      combine(shapeCanvas(ctx => ctx.rect(x, y, w, h)), mode);
    },
    ellipse(x0, y0, x1, y1, mode) {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2;
      if (rx < 1 || ry < 1) return;
      combine(shapeCanvas(ctx => ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)), mode);
    },
    polygon(points, mode) {
      if (points.length < 3) return;
      combine(shapeCanvas(ctx => {
        ctx.moveTo(points[0][0], points[0][1]);
        for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
        ctx.closePath();
      }), mode);
    },
    /** Magic wand: selects the connected area of similar colour in `layer`, starting at (x, y). */
    wand(layer, x, y, tolerance, mode) {
      const src = layer.getContext('2d').getImageData(0, 0, W, H);
      const d = src.data;
      const si = (y * W + x) * 4;
      const seed = [d[si], d[si + 1], d[si + 2], d[si + 3]];
      const limit = tolerance * 4;
      const near = p => Math.abs(d[p] - seed[0]) + Math.abs(d[p + 1] - seed[1]) + Math.abs(d[p + 2] - seed[2]) + Math.abs(d[p + 3] - seed[3]) <= limit;
      const out = new ImageData(W, H);
      const o = out.data;
      const stack = [[x, y]];
      const seen = new Uint8Array(W * H);
      while (stack.length) {
        const [cx, cy] = stack.pop();
        const idx = cy * W + cx;
        if (cx < 0 || cy < 0 || cx >= W || cy >= H || seen[idx]) continue;
        seen[idx] = 1;
        if (!near(idx * 4)) continue;
        o[idx * 4] = 255; o[idx * 4 + 1] = 255; o[idx * 4 + 2] = 255; o[idx * 4 + 3] = 255;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      c.getContext('2d').putImageData(out, 0, 0);
      combine(c, mode);
    }
  };
  return api;
}

/** Keeps `after` only inside the selection mask and `before` everywhere else. Returns a new canvas. */
export function clipToSelection(before, after, mask) {
  const W = mask.width, H = mask.height;
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const c = out.getContext('2d');
  c.drawImage(before, 0, 0);
  c.globalCompositeOperation = 'destination-out';
  c.drawImage(mask, 0, 0);
  const inside = document.createElement('canvas');
  inside.width = W; inside.height = H;
  const ic = inside.getContext('2d');
  ic.drawImage(after, 0, 0);
  ic.globalCompositeOperation = 'destination-in';
  ic.drawImage(mask, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.drawImage(inside, 0, 0);
  return out;
}
