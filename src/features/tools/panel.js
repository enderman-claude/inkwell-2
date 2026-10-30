import { icon } from '../../ui/icons.js';

const TOOLS = [
  ['brush', 'brush', 'Brush (B)'],
  ['rect', 'rectSel', 'Rectangle select (M)'],
  ['ellipse', 'ellipseSel', 'Ellipse select (E)'],
  ['lasso', 'lassoSel', 'Lasso select (L)'],
  ['poly', 'polySel', 'Polygon select (P), click points, Enter to close'],
  ['wand', 'wandSel', 'Magic wand (W)'],
  ['transform', 'move', 'Transform (V), Enter applies, Esc cancels']
];
const MODES = [['new', 'modeNew', 'Replace selection'], ['add', 'modeAdd', 'Add to selection (Shift)'], ['subtract', 'modeSub', 'Subtract from selection (Alt)'], ['intersect', 'modeInt', 'Intersect with selection']];
const ACTIONS = [['all', 'allSel', 'Select all (Ctrl+A)'], ['none', 'noneSel', 'Deselect (Ctrl+D)'], ['invert', 'invertSel', 'Invert selection (Ctrl+Shift+I)'], ['feather', 'feather', 'Feather edges (Ctrl+Alt+F)']];

export function mountToolsPanel(node, store, actions) {
  node.innerHTML = `
    <div class="tl-head"><button class="grip" aria-label="Move tools panel"></button></div>
    <div class="tl-group tl-tools"></div>
    <div class="tl-group tl-modes"></div>
    <div class="tl-group tl-acts"></div>
    <div class="tl-group tl-xform"></div>`;
  const groups = {
    tools: node.querySelector('.tl-tools'),
    modes: node.querySelector('.tl-modes'),
    acts: node.querySelector('.tl-acts'),
    xform: node.querySelector('.tl-xform')
  };
  const btn = (ic, title, onClick, key) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.innerHTML = icon(ic);
    b.title = title;
    b.setAttribute('aria-label', title);
    b.dataset.key = key || '';
    b.addEventListener('click', onClick);
    return b;
  };

  TOOLS.forEach(([id, ic, title]) => groups.tools.append(btn(ic, title, () => {
    if (id === 'brush') store.set({ tool: 'brush' });
    else if (id === 'transform') actions.transform();
    else store.set({ tool: 'select', selTool: id });
  }, id)));
  MODES.forEach(([id, ic, title]) => groups.modes.append(btn(ic, title, () => store.set({ selMode: id }), id)));
  ACTIONS.forEach(([id, ic, title]) => groups.acts.append(btn(ic, title, () => actions[id](), id)));
  groups.xform.append(
    btn('flipH', 'Flip horizontally', () => actions.flip('h')),
    btn('flipV', 'Flip vertically', () => actions.flip('v')),
    btn('check', 'Apply transform (Enter)', () => actions.apply()),
    btn('cross', 'Cancel transform (Esc)', () => actions.cancel())
  );

  function render() {
    const s = store.get();
    groups.tools.querySelectorAll('button').forEach(b => {
      const on = b.dataset.key === s.tool || (s.tool === 'select' && b.dataset.key === s.selTool);
      b.classList.toggle('on', on);
    });
    groups.modes.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.key === s.selMode));
    groups.modes.style.display = s.tool === 'select' ? '' : 'none';
    groups.xform.style.display = s.tool === 'transform' ? '' : 'none';
  }
  store.subscribe(render);
  render();
}
