import { dab, rgba } from '../../draw/dab.js';

const FIELDS = [
  ['size', 'Size', 1, 200, v => v + ' px'],
  ['hardness', 'Edge', 0, 100, v => v + '%'],
  ['flow', 'Flow', 1, 100, v => v + '%'],
  ['spacing', 'Spacing', 1, 50, v => v + '%']
];

export function mountBrushPanel(node, store) {
  node.innerHTML = `<canvas class="bp-preview" width="440" height="112" aria-label="Brush preview"></canvas>` +
    FIELDS.map(([k, label, min, max]) =>
      `<label class="bp-row"><span>${label}</span><input type="range" min="${min}" max="${max}" step="1" data-k="${k}" aria-label="${label}"><output></output></label>`
    ).join('');
  const preview = node.querySelector('.bp-preview');
  const pctx = preview.getContext('2d');

  const toStored = (k, v) => k === 'size' ? v : v / 100;
  const toShown = (k, v) => k === 'size' ? v : Math.round(v * 100);

  node.querySelectorAll('input[type=range]').forEach(input => {
    input.addEventListener('input', () => {
      const s = store.get();
      const k = input.dataset.k;
      const brushes = s.brushes.map((b, i) => i !== s.slot ? b : { ...b, [k]: toStored(k, Number(input.value)) });
      store.set({ brushes });
    });
  });

  function drawPreview(b, colour) {
    const W = preview.width, H = preview.height;
    pctx.clearRect(0, 0, W, H);
    const r = Math.max(0.5, Math.min(b.size, 200) / 2) * 0.9;
    const scale = Math.min(1, (H * 0.8) / (2 * r));
    const rr = r * scale;
    const colourStr = b.erase ? 'rgba(0,0,0,1)' : rgba(colour, 1);
    pctx.save();
    if (b.erase) {
      pctx.fillStyle = '#9996';
      pctx.fillRect(0, 0, W, H);
      pctx.globalCompositeOperation = 'destination-out';
    }
    const steps = Math.max(2, Math.round((W - 2 * rr) / Math.max(1, rr * 2 * b.spacing)));
    for (let i = 0; i <= steps; i++) {
      const x = rr + (W - 2 * rr) * i / steps;
      const y = H / 2 + Math.sin(i / steps * Math.PI * 2) * (H * 0.18);
      dab(pctx, x, y, rr, b.hardness, colourStr, b.flow);
    }
    pctx.restore();
  }

  function render() {
    const s = store.get(), b = s.brushes[s.slot];
    const c = s.colour;
    const h = s.colour;
    const colour = b.colour;
    drawPreview(b, colour);
    node.querySelectorAll('input[type=range]').forEach(input => {
      const k = input.dataset.k, f = FIELDS.find(x => x[0] === k);
      const v = toShown(k, b[k]);
      input.value = v;
      input.nextElementSibling.textContent = f[4](v);
    });
  }

  store.subscribe(render);
  render();
}
