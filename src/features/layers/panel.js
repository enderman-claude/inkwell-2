import { BLEND_MODES } from '../../core/document.js';

export function mountLayersPanel(node, doc, history) {
  node.innerHTML = `
    <div class="ly-title"><button class="grip" aria-label="Move layers panel"></button><span>Layers</span></div>
    <div class="ly-tools">
      <button data-a="add" aria-label="Add layer">+</button>
      <button data-a="dup" aria-label="Duplicate layer">Copy</button>
      <button data-a="merge" aria-label="Merge down">Merge</button>
      <button data-a="del" aria-label="Delete layer">Del</button>
      <button data-a="up" aria-label="Move layer up">Up</button>
      <button data-a="down" aria-label="Move layer down">Down</button>
    </div>
    <div class="ly-list"></div>
    <div class="ly-props"></div>`;
  const list = node.querySelector('.ly-list');
  const props = node.querySelector('.ly-props');

  function structural(fn) {
    const before = doc.snapshot();
    fn();
    const after = doc.snapshot();
    history.push({ undo: () => doc.restore(before), redo: () => doc.restore(after) });
  }

  node.querySelector('.ly-tools').addEventListener('click', e => {
    const a = e.target.dataset.a;
    if (!a) return;
    const i = doc.active;
    if (a === 'add') structural(() => doc.add());
    if (a === 'dup') structural(() => doc.duplicate(i));
    if (a === 'merge') structural(() => doc.mergeDown(i));
    if (a === 'del') structural(() => doc.remove(i));
    if (a === 'up') structural(() => doc.move(i, -1));
    if (a === 'down') structural(() => doc.move(i, 1));
  });

  function render() {
    list.innerHTML = '';
    doc.layers.slice().reverse().forEach((l, ri) => {
      const i = doc.layers.length - 1 - ri;
      const row = document.createElement('div');
      row.className = 'ly-row' + (i === doc.active ? ' on' : '');
      row.innerHTML = `<button class="ly-eye" aria-label="${l.visible ? 'Hide' : 'Show'} ${l.name}">${l.visible ? 'On' : 'Off'}</button>
        <button class="ly-name">${l.name}</button>
        <button class="ly-lock" aria-label="${l.lock ? 'Unlock' : 'Lock'} ${l.name}">${l.lock ? 'Locked' : 'Lock'}</button>`;
      row.querySelector('.ly-eye').addEventListener('click', () => structural(() => doc.set(i, { visible: !l.visible })));
      row.querySelector('.ly-lock').addEventListener('click', () => structural(() => doc.set(i, { lock: !l.lock })));
      row.querySelector('.ly-name').addEventListener('click', () => { doc.select(i); });
      row.addEventListener('dblclick', () => {
        const name = prompt('Layer name', l.name);
        if (name && name.trim()) structural(() => doc.set(i, { name: name.trim().slice(0, 24) }));
      });
      list.append(row);
    });
    const l = doc.activeLayer();
    props.innerHTML = `<label class="ly-p">Opacity <input type="range" min="0" max="100" value="${Math.round(l.opacity * 100)}" aria-label="Layer opacity"><output>${Math.round(l.opacity * 100)}%</output></label>
      <label class="ly-p">Blend <select aria-label="Blend mode">${BLEND_MODES.map(m => `<option value="${m}"${m === l.mode ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="ly-p"><input type="checkbox" ${l.alphaLock ? 'checked' : ''}> Alpha lock</label>`;
    const [range, select, alpha] = [props.querySelector('input[type=range]'), props.querySelector('select'), props.querySelector('input[type=checkbox]')];
    const active = doc.active;
    range.addEventListener('input', () => { doc.set(active, { opacity: range.value / 100 }); props.querySelector('output').textContent = range.value + '%'; });
    range.addEventListener('change', () => structural(() => doc.set(active, { opacity: range.value / 100 })));
    select.addEventListener('change', () => structural(() => doc.set(active, { mode: select.value })));
    alpha.addEventListener('change', () => structural(() => doc.set(active, { alphaLock: alpha.checked })));
  }

  doc.subscribe(render);
  render();
}
