import { register, attach, resetLayout } from './ui/modules.js';
import { createView } from './canvas/view.js';
import { createPen } from './draw/pen.js';
import { BRUSHES } from './ui/brushes.js';
import { createStore } from './core/store.js';
import { hsvToRgb, hexOf } from './core/colour.js';
import { createDocument } from './core/document.js';
import { createHistory } from './core/history.js';
import { features } from './features/index.js';

const W = 2048, H = 1536;
const INK = ['#2A2A27', '#D9D6CC', '#EEECE4', '#3B4F6B', '#A4512E', '#1B1B19', '#4A4A45', '#6F6E68', '#A9A89F', '#C9C5B8', '#F5F3EC', '#2E4057', '#5C7A99', '#8FA7BD', '#7A3B22', '#C27A55'];

const store = createStore({
  colour: { h: 215, s: 0.4, v: 0.42 }, recents: [], schemes: [{ name: 'Ink', colors: INK }], active: 0, link: null,
  brushes: BRUSHES.map(b => ({ ...b })), slot: 0
});
const doc = createDocument(W, H);
const history = createHistory();

const stage = document.getElementById('stage');
const board = document.getElementById('board');
doc.mountBoard(board);
const view = createView({ stage, board, W, H });
view.fit();

const pen = createPen({
  stage, doc, history,
  toBoard: (x, y) => view.pt(x, y),
  getBrush: () => {
    const st = store.get(), b = st.brushes[st.slot], c = st.colour;
    return { ...b, colour: b.erase ? b.colour : hexOf(hsvToRgb(c.h, c.s, c.v)) };
  }
});

const hint = document.createElement('div');
hint.className = 'edgehint';
document.getElementById('app').append(hint);
const showHint = edge => { hint.dataset.edge = edge || ''; hint.classList.toggle('on', !!edge); };

const bar = register('bar', document.getElementById('bar'), { edge: 'bottom', t: 0.5 });
const panel = register('panel', document.getElementById('panel'), { edge: null, fx: 0.8, fy: 0.2 });
const colourMod = register('colour', document.getElementById('colour'), { edge: 'right', t: 0.05 });
const brushMod = register('brush', document.getElementById('brush'), { edge: null, fx: 0.05, fy: 0.55 });
const layersMod = register('layers', document.getElementById('layers'), { edge: 'left', t: 0.05 });
const chip = register('chip', document.getElementById('chip'), { edge: 'right', t: 0.9 });

attach(bar, bar.node.querySelector('.grip'), { onHint: showHint });
attach(panel, panel.node.querySelector('.grip'), { onHint: showHint });
attach(brushMod, brushMod.node, { onHint: showHint });
attach(chip, chip.node, { onTap: () => document.body.classList.toggle('nui'), onHint: showHint });
document.getElementById('reset').addEventListener('click', resetLayout);
const themeBtn = document.getElementById('theme');
const applyTheme = t => {
  document.documentElement.dataset.theme = t;
  themeBtn.textContent = t === 'dark' ? 'Light mode' : 'Dark mode';
  try { localStorage.setItem('inkwell2-theme', t); } catch { }
};
let savedTheme = 'dark';
try { savedTheme = localStorage.getItem('inkwell2-theme') || 'dark'; } catch { }
applyTheme(savedTheme);
themeBtn.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
undoBtn.addEventListener('click', () => history.undo());
redoBtn.addEventListener('click', () => history.redo());
const syncHistory = () => { undoBtn.disabled = !history.canUndo(); redoBtn.disabled = !history.canRedo(); };
history.subscribe(syncHistory);
syncHistory();

const slotBtns = BRUSHES.map((brush, i) => {
  const b = document.createElement('button');
  b.className = 'slot';
  b.dataset.slot = i;
  b.title = `${brush.name} (${i + 1})`;
  b.setAttribute('aria-label', brush.name);
  b.innerHTML = `<i style="width:${Math.min(brush.size, 26)}px;height:${Math.min(brush.size, 26)}px;background:${brush.colour}"></i><small>${i + 1}</small>`;
  b.addEventListener('click', () => select(i));
  return b;
});
const menu = document.getElementById('menu');
const more = document.getElementById('more');
slotBtns.slice(0, 3).forEach(b => document.getElementById('slots').append(b));
slotBtns.slice(3).forEach(b => menu.append(b));

function select(i) { store.set({ slot: i }); }
store.subscribe(s => {
  slotBtns.forEach((b, j) => b.classList.toggle('on', j === s.slot));
  document.getElementById('brushname').textContent = s.brushes[s.slot].name;
});

const setMenu = open => {
  menu.classList.toggle('open', open);
  more.setAttribute('aria-expanded', String(open));
  more.classList.toggle('on', open);
};
more.addEventListener('click', e => { e.stopPropagation(); setMenu(!menu.classList.contains('open')); });
document.addEventListener('pointerdown', e => {
  if (!menu.contains(e.target) && e.target !== more) setMenu(false);
});
addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select')) return;
  const n = Number(e.key);
  if (n >= 1 && n <= 9) select(n - 1);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? history.redo() : history.undo(); }
});

const ctx = { store, doc, history, node: id => document.getElementById(id) };
features.forEach(f => f.mount(ctx));
attach(colourMod, colourMod.node.querySelector('.cp-head'), { onHint: showHint });
attach(layersMod, layersMod.node.querySelector('.grip'), { onHint: showHint });
