import { register, attach, resetLayout, relayout } from './ui/modules.js';
import { createView } from './canvas/view.js';
import { createPen } from './draw/pen.js';
import { BRUSHES, byId } from './brushes/library.js';
import { drawSample } from './draw/sample.js';
import { createStore } from './core/store.js';
import { hsvToRgb, hexOf } from './core/colour.js';
import { createDocument } from './core/document.js';
import { createHistory } from './core/history.js';
import { features } from './features/index.js';
import { icon } from './ui/icons.js';
import { bind } from './ui/keys.js';
import { createProjects } from './project/manager.js';
import { createTools } from './tools/controller.js';
import { mountToolsPanel } from './features/tools/panel.js';

const START_W = 2048, START_H = 1536;
const INK = ['#2A2A27', '#D9D6CC', '#EEECE4', '#3B4F6B', '#A4512E', '#1B1B19', '#4A4A45', '#6F6E68', '#A9A89F', '#C9C5B8', '#F5F3EC', '#2E4057', '#5C7A99', '#8FA7BD', '#7A3B22', '#C27A55'];

const store = createStore({
  colour: { h: 215, s: 0.4, v: 0.42 }, recents: [], schemes: [{ name: 'Ink', colors: INK }], active: 0, link: null,
  tool: 'brush', selTool: 'rect', selMode: 'new',
  brushes: ['pen', 'ink', 'marker', 'pencil', 'eraser', 'wcolour', 'chalk', 'spray', 'softE'].map(id => ({ ...byId(id), colourDiff: [...byId(id).colourDiff] })), slot: 0
});
const doc = createDocument(START_W, START_H, '#EEECE4');
const history = createHistory();

const stage = document.getElementById('stage');
const board = document.getElementById('board');
doc.mountBoard(board);
const view = createView({ stage, board, W: START_W, H: START_H });
view.fit();

const tools = createTools({ store, doc, history, view, stage, board, toBoard: (x, y) => view.pt(x, y) });
const pen = createPen({
  stage, doc, history,
  toBoard: (x, y) => view.pt(x, y),
  allow: () => tools.isBrush(),
  clip: (before, after) => tools.clipStroke(before, after),
  getBrush: () => store.get().brushes[store.get().slot],
  getColour: () => { const c = store.get().colour; return hexOf(hsvToRgb(c.h, c.s, c.v)); }
});

const hint = document.createElement('div');
hint.className = 'edgehint';
document.getElementById('app').append(hint);
const showHint = edge => { hint.dataset.edge = edge || ''; hint.classList.toggle('on', !!edge); };

const bar = register('bar', document.getElementById('bar'), { edge: 'bottom', t: 0.5 });
const panel = register('panel', document.getElementById('panel'), { edge: 'top', t: 0.5 });
const colourMod = register('colour', document.getElementById('colour'), { edge: 'right', t: 0.05 });
const brushMod = register('brush', document.getElementById('brush'), { edge: null, fx: 0.05, fy: 0.55 });
const toolsMod = register('tools', document.getElementById('tools'), { edge: 'right', t: 1 });
const libraryMod = register('library', document.getElementById('library'), { edge: 'left', t: 1 });
document.getElementById('libtoggle').addEventListener('click', () => {
  const hidden = libraryMod.node.style.display === 'none';
  libraryMod.node.style.display = hidden ? '' : 'none';
  document.getElementById('libtoggle').classList.toggle('on', hidden);
});
document.getElementById('libtoggle').innerHTML = icon('brush');
const layersMod = register('layers', document.getElementById('layers'), { edge: 'left', t: 0.05 });
const chip = register('chip', document.getElementById('chip'), { edge: 'top', t: 0 });

attach(bar, bar.node.querySelector('.grip'), { onHint: showHint });
attach(panel, panel.node.querySelector('.grip'), { onHint: showHint });
attach(brushMod, brushMod.node, { onHint: showHint });
const chipIcon = () => { chip.node.innerHTML = icon(document.body.classList.contains('nui') ? 'eye' : 'eyeOff'); };
attach(chip, chip.node, { onTap: () => { document.body.classList.toggle('nui'); chipIcon(); }, onHint: showHint });
chipIcon();
document.getElementById('reset').addEventListener('click', resetLayout);
const themeBtn = document.getElementById('theme');
const applyTheme = t => {
  document.documentElement.dataset.theme = t;
  themeBtn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
  themeBtn.title = t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  try { localStorage.setItem('inkwell2-theme', t); } catch { }
};
let savedTheme = 'dark';
try { savedTheme = localStorage.getItem('inkwell2-theme') || 'dark'; } catch { }
applyTheme(savedTheme);
themeBtn.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
undoBtn.innerHTML = icon('undo');
redoBtn.innerHTML = icon('redo');
document.getElementById('more').innerHTML = icon('more');
document.getElementById('reset').innerHTML = icon('reset');
const projects = createProjects({ doc, history, view, notify: msg => alert(msg), onImport: layer => tools.openTransform(layer) });
projects.wire();
const fileBtns = { 'f-new': ['newDoc', () => projects.newProject()], 'f-open': ['folder', () => projects.open()], 'f-save': ['save', () => projects.save()], 'f-import': ['image', () => projects.importPicked()] };
Object.entries(fileBtns).forEach(([id, [ic, fn]]) => {
  const b = document.getElementById(id);
  b.innerHTML = icon(ic);
  b.addEventListener('click', fn);
});
undoBtn.addEventListener('click', () => history.undo());
redoBtn.addEventListener('click', () => history.redo());
const syncHistory = () => { undoBtn.disabled = !history.canUndo(); redoBtn.disabled = !history.canRedo(); };
history.subscribe(syncHistory);
syncHistory();

const slotBtns = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
  const b = document.createElement('button');
  b.className = 'slot';
  b.dataset.slot = i;
  const cv = document.createElement('canvas');
  cv.width = 32; cv.height = 28;
  b.append(cv);
  const n = document.createElement('small');
  n.textContent = i + 1;
  b.append(n);
  b.addEventListener('click', () => select(i));
  return b;
});
const menu = document.getElementById('menu');
const more = document.getElementById('more');
slotBtns.slice(0, 3).forEach(b => document.getElementById('slots').append(b));
slotBtns.slice(3).forEach(b => menu.append(b));

function select(i) { store.set({ slot: i }); }
store.subscribe(s => {
  slotBtns.forEach((b, j) => {
    const brush = s.brushes[j];
    b.classList.toggle('on', j === s.slot);
    b.title = `${brush.name} (${j + 1})`;
    b.setAttribute('aria-label', brush.name);
    const c = s.colour;
    drawSample(b.querySelector('canvas'), brush, hexOf(hsvToRgb(c.h, c.s, c.v)));
  });
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
for (let n = 1; n <= 9; n++) bind(String(n), 'brush.slot' + n, () => select(n - 1));
bind('ctrl+z', 'edit.undo', () => history.undo());
bind('ctrl+shift+z', 'edit.redo', () => history.redo());
bind('ctrl+y', 'edit.redo-alt', () => history.redo());
bind('h', 'view.hide-interface', () => { document.body.classList.toggle('nui'); chipIcon(); });

mountToolsPanel(document.getElementById('tools'), store, tools.actions);
const ctx = { store, doc, history, node: id => document.getElementById(id) };
features.forEach(f => f.mount(ctx));
attach(colourMod, colourMod.node.querySelector('.cp-head'), { onHint: showHint });
attach(layersMod, layersMod.node.querySelector('.grip'), { onHint: showHint });
relayout();
attach(libraryMod, libraryMod.node.querySelector('.grip'), { onHint: showHint });
attach(toolsMod, toolsMod.node.querySelector('.grip'), { onHint: showHint });
