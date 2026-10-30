import { makeLayer } from '../core/document.js';
import { serialize, parse, EXTENSIONS } from './format.js';
import { askNew } from './newdialog.js';
import { bind } from '../ui/keys.js';

const BG = { paper: '#EEECE4', white: '#FFFFFF', none: null };

function pickFile(accept) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => resolve(input.files[0] || null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

function download(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file could not be read as an image.')); };
    img.src = url;
  });
}

export function createProjects({ doc, history, view, notify, onImport = () => {} }) {
  let name = 'Untitled';
  let dirty = false;
  const say = msg => notify ? notify(msg) : alert(msg);

  history.subscribe(() => { dirty = true; });

  const confirmDiscard = () => !dirty || confirm('Discard unsaved changes?');

  function adopt(layers, W, H, active, projectName) {
    doc.load({ W, H, layers, active });
    view.setSize(W, H);
    view.fit();
    history.clear();
    name = projectName;
    dirty = false;
  }

  function newProject(opts) {
    if (!confirmDiscard()) return Promise.resolve();
    return askNew({ w: 2048, h: 1536, name: 'Untitled' }).then(o => {
      if (!o) return;
      adopt([makeLayer(o.w, o.h, 'Background', BG[o.bg])], o.w, o.h, 0, o.name);
    });
  }

  async function open() {
    if (!confirmDiscard()) return;
    const file = await pickFile(EXTENSIONS.join(','));
    if (file) await openFile(file);
  }

  async function openFile(file) {
    if (!confirmDiscard()) return;
    try {
      const { manifest, files } = parse(new Uint8Array(await file.arrayBuffer()));
      const layers = [];
      for (const l of manifest.layers) {
        const layer = makeLayer(manifest.width, manifest.height, l.name);
        const bmp = await createImageBitmap(new Blob([files[l.file]], { type: 'image/png' }));
        layer.canvas.getContext('2d').drawImage(bmp, 0, 0);
        Object.assign(layer, { visible: l.visible, opacity: l.opacity, lock: l.lock, alphaLock: l.alphaLock, mode: l.mode });
        layers.push(layer);
      }
      adopt(layers, manifest.width, manifest.height, manifest.active, manifest.name || file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      say(err.message || 'The project could not be opened.');
    }
  }

  async function save() {
    try {
      const bytes = await serialize(doc, name);
      download(bytes, name.replace(/[\\/:*?"<>|]+/g, '-') + EXTENSIONS[0]);
      dirty = false;
    } catch (err) {
      say('The project could not be saved: ' + err.message);
    }
  }

  function saveAs() {
    const next = prompt('Project name', name);
    if (next && next.trim()) { name = next.trim().slice(0, 40); return save(); }
  }

  async function importFile(file) {
    if (!file || !file.type.startsWith('image/')) { say('Choose an image file.'); return; }
    try {
      const img = await loadImage(file);
      const scale = Math.min(1, doc.W / img.naturalWidth, doc.H / img.naturalHeight);
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      const layer = makeLayer(doc.W, doc.H, (file.name || 'Image').replace(/\.[^.]+$/, '').slice(0, 24) || 'Image');
      layer.canvas.getContext('2d').drawImage(img, Math.round((doc.W - w) / 2), Math.round((doc.H - h) / 2), w, h);
      const before = doc.snapshot();
      doc.insert(layer);
      const after = doc.snapshot();
      history.push({ undo: () => doc.restore(before), redo: () => doc.restore(after) });
      onImport(layer);
    } catch (err) {
      say(err.message);
    }
  }

  async function importPicked() {
    importFile(await pickFile('image/*'));
  }

  function wire() {
    bind('ctrl+n', 'file.new', () => newProject());
    bind('ctrl+o', 'file.open', () => open());
    bind('ctrl+i', 'file.import', () => importPicked());
    bind('ctrl+s', 'file.save', () => save());
    bind('ctrl+shift+s', 'file.save-as', () => saveAs());
    addEventListener('paste', e => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (item) { e.preventDefault(); importFile(item.getAsFile()); }
    });
    addEventListener('dragover', e => { e.preventDefault(); });
    addEventListener('drop', e => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      if (EXTENSIONS.some(x => f.name.toLowerCase().endsWith(x))) openFile(f);
      else importFile(f);
    });
    addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  }

  return { newProject, open, save, saveAs, importPicked, importFile, wire, getName: () => name, isDirty: () => dirty };
}
