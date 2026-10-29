import { hsvToRgb, rgbToHsv, rgbToCmyk, cmykToRgb, hexOf, parseHex, clamp } from '../../core/colour.js';
import { drawWheel, wheelHit, wheelValue } from './wheel.js';

const MODES = {
  rgb: [['R', 0, 255], ['G', 0, 255], ['B', 0, 255]],
  hsv: [['H', 0, 360], ['S', 0, 100], ['V', 0, 100]],
  cmyk: [['C', 0, 100], ['M', 0, 100], ['Y', 0, 100], ['K', 0, 100]]
};

export function mountColourPanel(node, store) {
  node.innerHTML = `
    <div class="cp-head"><span class="cp-preview" aria-hidden="true"></span><input class="cp-hex" maxlength="7" aria-label="Hex colour"></div>
    <canvas class="cp-wheel" width="200" height="200" aria-label="Hue and saturation wheel"></canvas>
    <div class="cp-mini"></div>
    <div class="cp-modes"><button data-m="rgb" class="on">RGB</button><button data-m="hsv">HSV</button><button data-m="cmyk">CMYK</button></div>
    <div class="cp-rows"></div>`;
  const preview = node.querySelector('.cp-preview');
  const hexIn = node.querySelector('.cp-hex');
  const wheel = node.querySelector('.cp-wheel');
  const mini = node.querySelector('.cp-mini');
  const rowsBox = node.querySelector('.cp-rows');
  let mode = 'rgb';
  let rowRefs = [];

  const current = () => store.get().colour;
  const hex = () => { const c = current(); return hexOf(hsvToRgb(c.h, c.s, c.v)); };

  function commit(next, { record = false } = {}) {
    const s = store.get();
    const colour = { ...s.colour, ...next };
    const h = hexOf(hsvToRgb(colour.h, colour.s, colour.v));
    let schemes = s.schemes, recents = s.recents;
    if (s.link) {
      schemes = s.schemes.map((sc, i) => i !== s.link.scheme ? sc : { ...sc, colors: sc.colors.map((c, j) => j === s.link.index ? h : c) });
    }
    if (record) recents = [h].concat(s.recents.filter(x => x !== h)).slice(0, 8);
    store.set({ colour, schemes, recents });
  }

  function applyHex(text, record = true) {
    const rgb = parseHex(text);
    if (!rgb) return;
    const [h, s, v] = rgbToHsv(...rgb);
    commit({ h, s, v }, { record });
  }

  function comps() {
    const c = current(), rgb = hsvToRgb(c.h, c.s, c.v);
    return { rgb, hsv: [c.h, c.s * 100, c.v * 100], cmyk: rgbToCmyk(...rgb) };
  }

  function setChannel(i, value) {
    const arr = comps()[mode].slice();
    arr[i] = Number(value);
    let hsv;
    if (mode === 'rgb') hsv = rgbToHsv(...arr);
    else if (mode === 'hsv') hsv = [arr[0], arr[1] / 100, arr[2] / 100];
    else hsv = rgbToHsv(...cmykToRgb(...arr));
    commit({ h: hsv[0], s: hsv[1], v: hsv[2] });
  }

  function buildRows() {
    rowsBox.innerHTML = '';
    rowRefs = MODES[mode].map(([label, min, max], i) => {
      const row = document.createElement('div');
      row.className = 'cp-row';
      row.innerHTML = `<span class="cp-lbl">${label}</span><input type="range" class="sl" min="${min}" max="${max}" step="1" aria-label="${label}"><input type="number" class="num" min="${min}" max="${max}">`;
      const r = row.querySelector('input[type=range]'), n = row.querySelector('input[type=number]');
      r.addEventListener('input', () => setChannel(i, r.value));
      r.addEventListener('change', () => commit({}, { record: true }));
      n.addEventListener('change', () => { setChannel(i, clamp(Number(n.value), min, max)); commit({}, { record: true }); });
      rowsBox.append(row);
      return { r, n, i };
    });
    render();
  }

  function trackStyle(i) {
    if (mode === 'hsv' && i === 0) return 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)';
    const base = comps()[mode];
    const lo = base.slice(), hi = base.slice();
    lo[i] = MODES[mode][i][1]; hi[i] = MODES[mode][i][2];
    const toRgb = a => mode === 'rgb' ? a : mode === 'hsv' ? hsvToRgb(a[0], a[1] / 100, a[2] / 100) : cmykToRgb(...a);
    return `linear-gradient(to right,${hexOf(toRgb(lo))},${hexOf(toRgb(hi))})`;
  }

  function renderMini() {
    const s = store.get();
    mini.innerHTML = '';
    const swatch = (color, linked, onTap) => {
      const b = document.createElement('button');
      b.className = 'sw' + (linked ? ' linked' : '');
      b.style.background = color;
      b.setAttribute('aria-label', color);
      b.addEventListener('click', onTap);
      return b;
    };
    s.recents.forEach(h => mini.append(swatch(h, false, () => applyHex(h))));
    const scheme = s.schemes[s.active];
    scheme.colors.forEach((h, j) => mini.append(swatch(h, !!s.link && s.link.scheme === s.active && s.link.index === j, () => {
      store.set({ link: { scheme: s.active, index: j } });
      applyHex(h);
    })));
    const add = document.createElement('button');
    add.className = 'sw add';
    add.textContent = '+';
    add.setAttribute('aria-label', 'Add current colour to preset');
    add.addEventListener('click', () => {
      const h = hex();
      const schemes = s.schemes.map((sc, i) => i === s.active ? { ...sc, colors: [...sc.colors, h] } : sc);
      store.set({ schemes, link: { scheme: s.active, index: scheme.colors.length } });
    });
    mini.append(add);
  }

  function render() {
    const c = current(), h = hex();
    preview.style.background = h;
    if (document.activeElement !== hexIn) hexIn.value = h;
    drawWheel(wheel, c.h, c.s, c.v);
    const vals = comps()[mode];
    rowRefs.forEach(ref => {
      ref.r.value = Math.round(vals[ref.i]);
      ref.n.value = Math.round(vals[ref.i]);
      ref.r.style.background = trackStyle(ref.i);
    });
    renderMini();
  }

  let drag = null;
  const pos = e => { const r = wheel.getBoundingClientRect(); return [(e.clientX - r.left) * 200 / r.width, (e.clientY - r.top) * 200 / r.height]; };
  wheel.addEventListener('pointerdown', e => {
    const [x, y] = pos(e), kind = wheelHit(x, y);
    if (!kind) return;
    drag = kind;
    wheel.setPointerCapture(e.pointerId);
    commit(wheelValue(kind, x, y, current()));
  });
  wheel.addEventListener('pointermove', e => { if (drag) { const [x, y] = pos(e); commit(wheelValue(drag, x, y, current())); } });
  const endWheel = () => { if (drag) { drag = null; commit({}, { record: true }); } };
  wheel.addEventListener('pointerup', endWheel);
  wheel.addEventListener('pointercancel', endWheel);

  hexIn.addEventListener('change', () => applyHex(hexIn.value));
  node.querySelectorAll('.cp-modes button').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.m;
    node.querySelectorAll('.cp-modes button').forEach(x => x.classList.toggle('on', x === b));
    buildRows();
  }));

  store.subscribe(render);
  buildRows();
  return { hex };
}
