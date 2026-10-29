import { mountColourPanel } from './colour/panel.js';
import { mountBrushPanel } from './brush/panel.js';

export const features = [
  { id: 'colour', mount: (ctx) => mountColourPanel(ctx.node('colour'), ctx.store) },
  { id: 'brush', mount: (ctx) => mountBrushPanel(ctx.node('brush'), ctx.store) }
];
