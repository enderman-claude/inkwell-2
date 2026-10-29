import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

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
  .replace(/<script type="module" src="main.js"><\/script>\s*/, '')
  .replace('</body>', () => `<script>${js}</script>\n</body>`);

if (html.includes('src="main.js"')) throw new Error('module script was not inlined');
if (/https?:\/\//.test(html.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, ''))) {
  throw new Error('external URL found; the build must work offline');
}

await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
console.log('dist/index.html', html.length, 'bytes');
