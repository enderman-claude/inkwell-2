import { register, attach, resetLayout, SNAP } from './ui/modules.js';
import { createView } from './canvas/view.js';

const W = 2048, H = 1536;
const stage = document.getElementById('stage');
const board = document.getElementById('board');
const view = createView({ stage, board, W, H });
view.fit();

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
