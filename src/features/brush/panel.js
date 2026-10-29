const FIELDS = [
  ['size', 'Size', 1, 200, 1, v => v + ' px'],
  ['hardness', 'Hardness', 0, 100, 1, v => v + '%'],
  ['flow', 'Flow', 1, 100, 1, v => v + '%'],
  ['spacing', 'Spacing', 1, 50, 1, v => v + '%']
];

export function mountBrushPanel(node, store) {
  node.innerHTML = `<div class="bp-title"></div>` + FIELDS.map(([k, label, min, max]) =>
    `<label class="bp-row"><span>${label}</span><input type="range" min="${min}" max="${max}" step="1" data-k="${k}" aria-label="${label}"><output></output></label>`
  ).join('');
  const title = node.querySelector('.bp-title');
  const toStored = (k, v) => k === 'size' ? v : k === 'spacing' ? v / 100 : v / 100;
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
    title.textContent = b.name;
    node.querySelectorAll('input[type=range]').forEach(input => {
      const k = input.dataset.k, f = FIELDS.find(x => x[0] === k);
      const v = toShown(k, b[k]);
      input.value = v;
      input.nextElementSibling.textContent = f[5](v);
    });
  }
  store.subscribe(render);
  render();
}
