import { mountColourPanel } from './colour/panel.js';
import { mountBrushPanel } from './brush/panel.js';
import { mountLayersPanel } from './layers/panel.js';

export const features = [
  { id: 'colour', mount: (ctx) => mountColourPanel(ctx.node('colour'), ctx.store) },
  { id: 'brush', mount: (ctx) => mountBrushPanel(ctx.node('brush'), ctx.store) },
  { id: 'layers', mount: (ctx) => mountLayersPanel(ctx.node('layers'), ctx.doc, ctx.history) }
];
