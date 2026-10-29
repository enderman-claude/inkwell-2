import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const fontFile = w => `node_modules/@fontsource/hanken-grotesk/files/hanken-grotesk-latin-${w}-normal.woff2`;
const fontCss = (await Promise.all([400, 600].map(async w => {
  const b64 = (await readFile(fontFile(w))).toString('base64');
  return `@font-face{font-family:"Hanken Grotesk";font-weight:${w};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
}))).join('');

const srcHtml = await readFile('src/index.html', 'utf8');

const bundle = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
  target: 'es2020',
});
const js = bundle.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const html = srcHtml
  .replace('/*FONTS*/', () => fontCss)
  .replace(/<script type="module" src="main.js"><\/script>\s*/, '')
  .replace('</body>', () => `<script>${js}</script>\n</body>`);

if (html.includes('src="main.js"')) throw new Error('module script was not inlined');
if (/https?:\/\//.test(html.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, ''))) {
  throw new Error('external URL found; the build must work offline');
}

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
console.log('dist/index.html', html.length, 'bytes');
