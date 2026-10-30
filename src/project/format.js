import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

/*
 * .inkwell2 / .inw2 container (format version 2)
 *   manifest.json        project settings, layer order and properties
 *   layers/<n>.png       one lossless PNG per layer, in manifest order
 * Strokes and seeds are not stored yet; this version stores rasters only.
 */
export const FORMAT = 'inkwell';
export const VERSION = 2;
export const EXTENSIONS = ['.inkwell2', '.inw2'];

const toBytes = blob => blob.arrayBuffer().then(b => new Uint8Array(b));
const canvasPng = canvas => new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('PNG encode failed')), 'image/png'));

export async function serialize(doc, name) {
  const files = {};
  const layers = [];
  for (let i = 0; i < doc.layers.length; i++) {
    const l = doc.layers[i];
    const file = `layers/${i}.png`;
    files[file] = await toBytes(await canvasPng(l.canvas));
    layers.push({ name: l.name, visible: l.visible, opacity: l.opacity, lock: l.lock, alphaLock: l.alphaLock, mode: l.mode, file });
  }
  const manifest = { format: FORMAT, version: VERSION, name, width: doc.W, height: doc.H, active: doc.active, layers };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 1));
  return zipSync(files, { level: 6 });
}

export function parse(bytes) {
  let files;
  try { files = unzipSync(bytes); } catch { throw new Error('This file is not an Inkwell project.'); }
  if (!files['manifest.json']) throw new Error('This file is missing its manifest.');
  const m = JSON.parse(strFromU8(files['manifest.json']));
  if (m.format !== FORMAT) throw new Error('This file is not an Inkwell project.');
  if (m.version !== VERSION) throw new Error(`This project is format version ${m.version}; this app reads version ${VERSION}.`);
  if (!Array.isArray(m.layers) || !m.layers.length) throw new Error('The project has no layers.');
  return { manifest: m, files };
}
