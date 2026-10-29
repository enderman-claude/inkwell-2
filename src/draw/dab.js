export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

export function dab(ctx, x, y, radius, hardness, colour, alpha) {
  const hard = Math.min(0.999, Math.max(0, hardness));
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
