import { rng, paintSegment, hexToRgb } from './engine.js';

/** Draws a short wave stroke with a brush into a canvas. Used for every brush preview. */
export function drawSample(canvas, brush, colourHex, { seed = 7 } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (brush.erase) {
    ctx.fillStyle = 'rgba(128,128,128,0.35)';
    ctx.fillRect(0, 0, W, H);
  }
  const pad = Math.min(W, H) * 0.18;
  const amp = (H - pad * 2) * 0.22;
  const size = Math.max(1, brush.size);
  const scale = Math.min(1, (H * 0.6) / size);
  const scaled = { ...brush, size: size * scale };
  const state = {
    ctx, brush: scaled, colour: hexToRgb(colourHex), rand: rng(seed), direction: 0,
    last: [pad, H / 2]
  };
  ctx.save();
  if (brush.erase) ctx.globalCompositeOperation = 'source-over';
  const steps = 60;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = pad + (W - pad * 2) * t;
    const y = H / 2 + Math.sin(t * Math.PI * 2) * amp;
    paintSegment(state, [x, y], 0.5 + 0.5 * Math.sin(t * Math.PI));
  }
  ctx.restore();
}
