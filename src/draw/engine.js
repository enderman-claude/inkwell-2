import { clamp } from '../core/colour.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}

const str = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

function jitteredColour(brush, base, rand) {
  const d = brush.colourDiff || [0, 0, 0, 0];
  if (!d[0] && !d[1] && !d[2]) return base;
  const t = rand();
  return [0, 1, 2].map(i => clamp(Math.round(base[i] + d[i] * t), 0, 255));
}

function dotAt(ctx, x, y, radius, rgb, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = str(rgb, 1);
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
  ctx.fill();
}

/** One stamp of the brush at (x, y). Everything random comes from `rand`, so a stroke can be replayed exactly. */
export function stamp(ctx, brush, x, y, r, base, flow, angle, rand) {
  const rgb = jitteredColour(brush, base, rand);
  const erase = !!brush.erase;
  ctx.save();
  if (erase) ctx.globalCompositeOperation = 'destination-out';
  const ro = clamp(brush.roundness, 0.02, 1);
  if (brush.kind === 'spray') {
    const n = Math.max(1, Math.round(brush.count));
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
      dotAt(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * brush.dotSize * 2, rgb, flow);
    }
  } else if (brush.kind === 'bristle') {
    const n = Math.max(1, Math.round(brush.count));
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0;
      const o = t * 2 * r;
      dotAt(ctx, x - Math.sin(angle) * o, y + Math.cos(angle) * o, r * brush.dotSize, rgb, flow);
    }
  } else if (brush.kind === 'square') {
    ctx.globalAlpha = flow;
    ctx.fillStyle = str(rgb, 1);
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillRect(-r, -r * ro, 2 * r, 2 * r * ro);
  } else {
    const soft = brush.softness || 0;
    const hard = clamp(brush.hardness * (1 - 0.5 * soft), 0, 0.999);
    ctx.globalAlpha = flow;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1, ro);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, str(rgb, 1));
    g.addColorStop(hard, str(rgb, 1));
    g.addColorStop(1, str(rgb, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (brush.grain > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const specks = Math.round(brush.grain * r * r * 0.2);
    for (let i = 0; i < specks; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r;
      dotAt(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, brush.grainSize * 0.6, [0, 0, 0], brush.grain * 0.6);
    }
    ctx.restore();
  }
}

/** Paints a stroke segment from `from` to `to`. `state` holds { ctx, brush, colour, rand, last, direction }. */
export function paintSegment(state, to, pressure) {
  const b = state.brush;
  const rand = state.rand;
  const p = clamp(pressure, 0, 1);
  const sizeFactor = (1 - b.pressureSize) + b.pressureSize * p;
  const flowFactor = (1 - b.pressureFlow) + b.pressureFlow * p;
  const flow = clamp(b.flow * b.opacity * flowFactor, 0, 1);
  const [lx, ly] = state.last;
  const dx = to[0] - lx, dy = to[1] - ly;
  const dist = Math.hypot(dx, dy);
  const dir = Math.atan2(dy, dx);
  if (dist > 0) state.direction = dir;
  const angle = (b.followDirection ? state.direction : 0) + b.angle * Math.PI / 180;
  const baseR = Math.max(0.5, b.size * sizeFactor / 2);
  const step = Math.max(0.5, baseR * 2 * b.spacing);
  const n = Math.max(1, Math.ceil(dist / step));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const jitter = 1 + (rand() * 2 - 1) * b.sizeJitter;
    const r = Math.max(0.5, baseR * jitter);
    const sx = lx + dx * t + (rand() * 2 - 1) * b.scatter * r;
    const sy = ly + dy * t + (rand() * 2 - 1) * b.scatter * r;
    stamp(state.ctx, b, sx, sy, r, state.colour, flow, angle, rand);
  }
  state.last = to;
}
