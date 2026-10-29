import { BLEND_MODES } from '../../core/document.js';
import { icon } from '../../ui/icons.js';

export function mountLayersPanel(node, doc, history) {
  node.innerHTML = `
    <div class="ly-head">
      <button class="grip" aria-label="Move layers panel"></button>
      <button class="btn" data-a="add" title="New layer" aria-label="New layer">${icon('plus')}</button>
      <button class="btn" data-a="dup" title="Duplicate layer" aria-label="Duplicate layer">${icon('copy')}</button>
      <button class="btn" data-a="merge" title="Merge down" aria-label="Merge down">${icon('merge')}</button>
      <button class="btn" data-a="del" title="Delete layer" aria-label="Delete layer">${icon('trash')}</button>
      <button class="btn" data-a="up" title="Move up" aria-label="Move layer up">${icon('up')}</button>
      <button class="btn" data-a="down" title="Move down" aria-label="Move layer down">${icon('down')}</button>
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

  node.querySelector('.ly-head').addEventListener('click', e => {
    const btn = e.target.closest('[data-a]');
    if (!btn) return;
    const a = btn.dataset.a, i = doc.active;
    if (a === 'add') structural(() => doc.add());
    if (a === 'dup') structural(() => doc.duplicate(i));
    if (a === 'merge') structural(() => doc.mergeDown(i));
    if (a === 'del') structural(() => doc.remove(i));
    if (a === 'up') structural(() => doc.move(i, -1));
    if (a === 'down') structural(() => doc.move(i, 1));
  });

  function thumb(canvas) {
    const t = document.createElement('canvas');
    t.width = 36; t.height = 27; t.className = 'thumb checker';
    const c = t.getContext('2d');
    c.drawImage(canvas, 0, 0, 36, 27);
    return t;
  }

  function render() {
    list.innerHTML = '';
    doc.layers.slice().reverse().forEach((l, ri) => {
      const i = doc.layers.length - 1 - ri;
      const row = document.createElement('div');
      row.className = 'ly-row' + (i === doc.active ? ' on' : '');
      const eye = document.createElement('button');
      eye.className = 'btn';
      eye.innerHTML = icon(l.visible ? 'eye' : 'eyeOff');
      eye.title = l.visible ? 'Hide layer' : 'Show layer';
      eye.setAttribute('aria-label', eye.title + ': ' + l.name);
      eye.addEventListener('click', () => structural(() => doc.set(i, { visible: !l.visible })));
      const lock = document.createElement('button');
      lock.className = 'btn' + (l.lock ? ' on' : '');
      lock.innerHTML = icon(l.lock ? 'lock' : 'unlock');
      lock.title = l.lock ? 'Unlock layer' : 'Lock layer';
      lock.setAttribute('aria-label', lock.title + ': ' + l.name);
      lock.addEventListener('click', () => structural(() => doc.set(i, { lock: !l.lock })));
      const name = document.createElement('button');
      name.className = 'ly-name';
      name.textContent = l.name;
      name.title = 'Click to select, double-click to rename';
      name.addEventListener('click', () => doc.select(i));
      name.addEventListener('dblclick', () => {
        const next = prompt('Layer name', l.name);
        if (next && next.trim()) structural(() => doc.set(i, { name: next.trim().slice(0, 24) }));
      });
      row.append(eye, thumb(l.canvas), name, lock);
      list.append(row);
    });
    const l = doc.activeLayer();
    const pct = Math.round(l.opacity * 100);
    props.innerHTML = `
      <label class="ly-p"><span class="op-track"></span><input type="range" min="0" max="100" value="${pct}" aria-label="Layer opacity" title="Opacity"><output>${pct}%</output></label>
      <div class="ly-p">
        <select aria-label="Blend mode" title="Blend mode">${BLEND_MODES.map(m => `<option value="${m}"${m === l.mode ? ' selected' : ''}>${m.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())}</option>`).join('')}</select>
        <button class="btn${l.alphaLock ? ' on' : ''}" data-alpha title="Alpha lock: paint only where the layer already has pixels" aria-label="Alpha lock" aria-pressed="${l.alphaLock}">${icon('alpha')}</button>
      </div>`;
    const range = props.querySelector('input[type=range]');
    const select = props.querySelector('select');
    const alpha = props.querySelector('[data-alpha]');
    const active = doc.active;
    range.addEventListener('input', () => { doc.set(active, { opacity: range.value / 100 }); props.querySelector('output').textContent = range.value + '%'; });
    range.addEventListener('change', () => structural(() => doc.set(active, { opacity: range.value / 100 })));
    select.addEventListener('change', () => structural(() => doc.set(active, { mode: select.value })));
    alpha.addEventListener('click', () => structural(() => doc.set(active, { alphaLock: !l.alphaLock })));
  }

  doc.subscribe(render);
  history.subscribe(render);
  render();
}
