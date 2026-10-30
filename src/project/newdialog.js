export const PRESETS = [
  ['Screen 2048 × 1536', 2048, 1536],
  ['HD 1920 × 1080', 1920, 1080],
  ['Square 3000 × 3000', 3000, 3000],
  ['A4 at 300 dpi, 2480 × 3508', 2480, 3508],
  ['Custom', 0, 0]
];
export const MAX_SIDE = 8000;
export const MAX_AREA = 25_000_000;

export function askNew(defaults) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'newdoc';
    dlg.innerHTML = `
      <form method="dialog">
        <label>Preset <select name="preset">${PRESETS.map((p, i) => `<option value="${i}">${p[0]}</option>`).join('')}</select></label>
        <div class="nd-size">
          <label>Width <input name="w" type="number" min="1" max="${MAX_SIDE}" value="${defaults.w}"></label>
          <label>Height <input name="h" type="number" min="1" max="${MAX_SIDE}" value="${defaults.h}"></label>
        </div>
        <label>Background
          <select name="bg">
            <option value="paper">Paper</option>
            <option value="white">White</option>
            <option value="none">Transparent</option>
          </select>
        </label>
        <label>Name <input name="name" maxlength="40" value="${defaults.name}"></label>
        <p class="nd-err" role="alert"></p>
        <div class="nd-actions">
          <button value="cancel" type="button" class="nd-cancel">Cancel</button>
          <button value="ok" class="nd-ok">Create</button>
        </div>
      </form>`;
    document.body.append(dlg);
    const form = dlg.querySelector('form');
    const preset = form.elements.preset, w = form.elements.w, h = form.elements.h, err = dlg.querySelector('.nd-err');
    const applyPreset = () => {
      const p = PRESETS[Number(preset.value)];
      if (p[1]) { w.value = p[1]; h.value = p[2]; w.disabled = h.disabled = true; }
      else { w.disabled = h.disabled = false; }
    };
    preset.addEventListener('change', applyPreset);
    const sel = defaults.w === 2048 ? 0 : 4;
    preset.value = String(sel);
    applyPreset();
    const close = value => { dlg.close(); dlg.remove(); resolve(value); };
    dlg.querySelector('.nd-cancel').addEventListener('click', () => close(null));
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(null); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const W = Math.round(Number(w.value)), H = Math.round(Number(h.value));
      if (!(W >= 1 && H >= 1 && W <= MAX_SIDE && H <= MAX_SIDE)) { err.textContent = `Width and height must be between 1 and ${MAX_SIDE}.`; return; }
      if (W * H > MAX_AREA) { err.textContent = 'That canvas is too large for this browser. Try a smaller size.'; return; }
      close({ w: W, h: H, bg: form.elements.bg.value, name: form.elements.name.value.trim() || 'Untitled' });
    });
    dlg.showModal();
    w.focus();
  });
}
