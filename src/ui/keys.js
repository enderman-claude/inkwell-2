/*
 * One keymap for the whole app. Features register bindings; nothing else listens to keydown.
 * Combos are written like 'ctrl+shift+z', 'shift+r', '0', 'space'. Ctrl and Cmd are the same ("mod").
 * A binding only fires when its modifiers match exactly, so Ctrl+Z never triggers the plain 'z' binding.
 */
const bindings = new Map();
const EDITABLE = 'input, textarea, select, [contenteditable="true"]';

function parse(combo) {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop();
  const mods = new Set(parts);
  return { key, ctrl: mods.has('ctrl') || mods.has('mod'), shift: mods.has('shift'), alt: mods.has('alt') };
}

function fromEvent(e) {
  let key = e.code === 'Space' ? 'space' : e.key.toLowerCase();
  if (key === 'escape') key = 'esc';
  return { key, ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey, alt: e.altKey };
}

export function bind(combo, id, run, opts = {}) {
  const spec = parse(combo);
  const sig = `${spec.ctrl ? 'ctrl+' : ''}${spec.shift ? 'shift+' : ''}${spec.alt ? 'alt+' : ''}${spec.key}`;
  if (bindings.has(sig)) {
    console.error(`Key conflict: "${sig}" is bound to "${bindings.get(sig).id}" and "${id}"`);
    return;
  }
  bindings.set(sig, { id, run, up: opts.up, spec, allowInInput: !!opts.allowInInput, allowInDialog: !!opts.allowInDialog, prevent: opts.prevent !== false });
}

function inEditable(target) {
  return !!(target && target.closest && target.closest(EDITABLE));
}

function signature(e) {
  const k = fromEvent(e);
  return `${k.ctrl ? 'ctrl+' : ''}${k.shift ? 'shift+' : ''}${k.alt ? 'alt+' : ''}${k.key}`;
}

addEventListener('keydown', e => {
  const b = bindings.get(signature(e));
  if (!b || e.repeat && !b.up && b.spec.key === 'space') return;
  if (!b.allowInInput && inEditable(e.target)) return;
  if (!b.allowInDialog && document.querySelector('dialog[open]')) return;
  if (b.prevent) e.preventDefault();
  b.run(e);
});

addEventListener('keyup', e => {
  const k = fromEvent(e);
  for (const b of bindings.values()) {
    if (b.up && b.spec.key === k.key) b.up(e);
  }
});

export function listBindings() {
  return [...bindings.values()].map(b => ({ id: b.id, combo: b.spec }));
}
