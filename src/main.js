import { register, attach, resetLayout } from './ui/modules.js';
import { createView } from './canvas/view.js';
import { createPen } from './draw/pen.js';
import { BRUSHES } from './ui/brushes.js';

const W = 2048, H = 1536;
const stage = document.getElementById('stage');
const board = document.getElementById('board');
const canvas = board.querySelector('canvas');
const view = createView({ stage, board, W, H });
view.fit();

let slot = 0;
const pen = createPen({ stage, canvas, toBoard: (x, y) => view.pt(x, y), getBrush: () => BRUSHES[slot] });

const hint = document.createElement('div');
hint.className = 'edgehint';
document.getElementById('app').append(hint);
const showHint = edge => { hint.dataset.edge = edge || ''; hint.classList.toggle('on', !!edge); };

const bar = register('bar', document.getElementById('bar'), { edge: 'bottom', t: 0.5 });
const panel = register('panel', document.getElementById('panel'), { edge: null, fx: 0.8, fy: 0.2 });
const chip = register('chip', document.getElementById('chip'), { edge: 'right', t: 0.9 });
attach(bar, bar.node.querySelector('.grip'), { onHint: showHint });
attach(panel, panel.node.querySelector('.grip'), { onHint: showHint });
attach(chip, chip.node, { onTap: () => document.body.classList.toggle('nui'), onHint: showHint });
document.getElementById('reset').addEventListener('click', resetLayout);

const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const syncHistory = () => { undoBtn.disabled = !pen.canUndo(); redoBtn.disabled = !pen.canRedo(); };
undoBtn.addEventListener('click', () => { pen.undo(); syncHistory(); });
redoBtn.addEventListener('click', () => { pen.redo(); syncHistory(); });
stage.addEventListener('pointerup', syncHistory);
undoBtn.disabled = true; redoBtn.disabled = true;

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
const barSlots = document.getElementById('slots');
const menu = document.getElementById('menu');
const more = document.getElementById('more');
slotBtns.slice(0, 3).forEach(b => barSlots.append(b));
slotBtns.slice(3).forEach(b => menu.append(b));

function select(i) {
  slot = i;
  slotBtns.forEach((b, j) => b.classList.toggle('on', j === i));
  document.getElementById('brushname').textContent = BRUSHES[i].name;
}

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
  if (e.target.matches('input, textarea')) return;
  const n = Number(e.key);
  if (n >= 1 && n <= 9) select(n - 1);
});
select(0);
