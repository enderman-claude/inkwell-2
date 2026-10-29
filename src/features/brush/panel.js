import { drawSample } from '../../draw/sample.js';
import { hsvToRgb, hexOf } from '../../core/colour.js';

const FIELDS = [
  ['size', 'Size', 1, 200, v => v + ' px'],
  ['hardness', 'Edge', 0, 100, v => v + '%'],
  ['flow', 'Flow', 1, 100, v => v + '%'],
  ['spacing', 'Spacing', 1, 50, v => v + '%']
];

export function mountBrushPanel(node, store) {
  node.innerHTML = `<canvas class="bp-preview" width="440" height="112" aria-label="Brush preview" title="Preview"></canvas>` +
    FIELDS.map(([k, label, min, max]) =>
      `<label class="bp-row"><span>${label}</span><input type="range" min="${min}" max="${max}" step="1" data-k="${k}" aria-label="${label}"><output></output></label>`
    ).join('');
  const preview = node.querySelector('.bp-preview');

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

  function render() {
    const s = store.get(), b = s.brushes[s.slot];
    const c = s.colour;
    drawSample(preview, b, hexOf(hsvToRgb(c.h, c.s, c.v)));
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
