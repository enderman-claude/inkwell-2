import { BRUSHES, COLLECTIONS } from '../../brushes/library.js';
import { drawSample } from '../../draw/sample.js';
import { hsvToRgb, hexOf } from '../../core/colour.js';

export function mountLibraryPanel(node, store) {
  node.innerHTML = `
    <div class="lib-head"><button class="grip" aria-label="Move brush library"></button><div class="seg lib-tabs"></div></div>
    <div class="lib-grid"></div>`;
  const tabs = node.querySelector('.lib-tabs');
  const grid = node.querySelector('.lib-grid');
  let collection = 'basic';

  COLLECTIONS.forEach(c => {
    const b = document.createElement('button');
    b.textContent = c.name;
    b.dataset.c = c.id;
    b.title = c.note;
    b.addEventListener('click', () => { collection = c.id; render(); });
    tabs.append(b);
  });

  const currentHex = () => { const c = store.get().colour; return hexOf(hsvToRgb(c.h, c.s, c.v)); };

  function render() {
    const s = store.get();
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.c === collection));
    const picked = s.brushes[s.slot].id;
    grid.innerHTML = '';
    BRUSHES.filter(b => b.collection === collection).forEach(brush => {
      const card = document.createElement('button');
      card.className = 'lib-card' + (brush.id === picked ? ' on' : '');
      card.title = brush.name;
      card.setAttribute('aria-label', brush.name);
      const canvas = document.createElement('canvas');
      canvas.width = 140; canvas.height = 44;
      card.append(canvas);
      const label = document.createElement('span');
      label.textContent = brush.name;
      card.append(label);
      card.addEventListener('click', () => {
        const st = store.get();
        const brushes = st.brushes.map((b, i) => i === st.slot ? { ...brush, colourDiff: [...brush.colourDiff] } : b);
        store.set({ brushes });
      });
      grid.append(card);
      drawSample(canvas, brush, currentHex());
    });
  }

  store.subscribe(render);
  render();
}
