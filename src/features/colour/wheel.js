import { hsvToRgb, clamp } from '../../core/colour.js';

export function drawWheel(canvas, h, s, v) {
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(200, 200), d = img.data;
  for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) {
    const dx = x + 0.5 - 100, dy = y + 0.5 - 100, r = Math.hypot(dx, dy), i = (y * 200 + x) * 4;
    let c = null;
    if (r >= 70 && r <= 100) c = hsvToRgb((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, 1, 1);
    else if (Math.abs(dx) + Math.abs(dy) <= 60) c = hsvToRgb(h, clamp((dx / 60 + 1 + dy / 60) / 2, 0, 1), clamp((dx / 60 + 1 - dy / 60) / 2, 0, 1));
    if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
  }
  ctx.putImageData(img, 0, 0);
  const mark = (x, y) => {
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#2A2A27'; ctx.lineWidth = 1; ctx.stroke();
  };
  const a = h * Math.PI / 180;
  mark(100 + Math.cos(a) * 85, 100 + Math.sin(a) * 85);
  mark(100 + 60 * (s + v - 1), 100 + 60 * (s - v));
}

/** Returns the new { h, s, v } for a pointer at canvas-local coords (0..200), or null if the press missed the wheel. */
export function wheelHit(x, y) {
  const dx = x - 100, dy = y - 100, r = Math.hypot(dx, dy);
  if (r >= 70 && r <= 100) return 'hue';
  if (Math.abs(dx) + Math.abs(dy) <= 60) return 'sv';
  return null;
}

export function wheelValue(kind, x, y, current) {
  const dx = x - 100, dy = y - 100;
  if (kind === 'hue') return { ...current, h: (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360 };
  return {
    ...current,
    s: clamp((dx / 60 + 1 + dy / 60) / 2, 0, 1),
    v: clamp((dx / 60 + 1 - dy / 60) / 2, 0, 1)
  };
}
