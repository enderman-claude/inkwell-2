export const COLLECTIONS = [
  { id: 'basic', name: 'Basic', note: 'Smooth, solid brushes' },
  { id: 'flat', name: 'Flat', note: 'Flat, MS Paint style brushes' },
  { id: 'texture', name: 'Texture', note: 'Grainy, speckled and broken strokes' },
  { id: 'erase', name: 'Erasers', note: 'Different ways to take paint away' },
  { id: 'new', name: 'New', note: 'Brushes built for Inkwell 2' }
];

const DEFAULTS = {
  kind: 'round', size: 10, opacity: 1, hardness: 1, flow: 1, spacing: 0.1,
  angle: 0, roundness: 1, grain: 0, grainSize: 1, scatter: 0, sizeJitter: 0,
  count: 1, dotSize: 0.05, pressureSize: 0, pressureFlow: 0, followDirection: false,
  erase: false, colourDiff: [0, 0, 0, 0], softness: 0
};

const make = (collection, id, name, over) => ({ ...DEFAULTS, collection, id, name, ...over });

export const BRUSHES = [
  make('basic', 'pen', 'Pen', { kind: 'line', size: 8, pressureSize: 0.7 }),
  make('basic', 'ink', 'Ink', { kind: 'line', size: 6, pressureSize: 1 }),
  make('basic', 'marker', 'Marker', { kind: 'line', size: 24, opacity: 0.7, softness: 0.5, pressureSize: 0.2 }),
  make('basic', 'pencil', 'Pencil', { kind: 'line', size: 4, opacity: 0.75, softness: 0.25, pressureSize: 0.5 }),
  make('basic', 'airbrush', 'Airbrush', { kind: 'line', size: 60, opacity: 0.3, hardness: 0.1, softness: 1.2, pressureSize: 0.3 }),
  make('basic', 'highlighter', 'Highlighter', { kind: 'line', size: 34, opacity: 0.35, softness: 0 }),

  make('flat', 'brush', 'Brush', { kind: 'line', size: 10, softness: 0, pressureSize: 0.25 }),
  make('flat', 'cal1', 'Calligraphy 1', { kind: 'line', size: 18, roundness: 0.2, angle: 45 }),
  make('flat', 'cal2', 'Calligraphy 2', { kind: 'line', size: 18, roundness: 0.2, angle: -45 }),
  make('flat', 'spray', 'Spray', { kind: 'spray', size: 44, count: 26, dotSize: 0.035, spacing: 0.12 }),
  make('flat', 'oil', 'Oil', { kind: 'bristle', size: 24, count: 16, dotSize: 0.24, hardness: 0.5, flow: 0.85, spacing: 0.1, pressureSize: 0.3 }),
  make('flat', 'crayon', 'Crayon', { size: 14, hardness: 0.95, grain: 0.85, grainSize: 2, flow: 0.9, spacing: 0.08 }),
  make('flat', 'fmarker', 'Flat marker', { kind: 'line', size: 16, opacity: 0.8, softness: 0 }),
  make('flat', 'npencil', 'Natural pencil', { size: 3, opacity: 0.9, hardness: 0.8, grain: 0.65, flow: 0.6, spacing: 0.1, pressureSize: 0.5, pressureFlow: 0.4 }),
  make('flat', 'wcolour', 'Watercolour', { size: 36, opacity: 0.8, hardness: 0.3, flow: 0.1, spacing: 0.06, grain: 0.25, grainSize: 3 }),

  make('texture', 'charcoal', 'Charcoal', { size: 20, opacity: 0.9, hardness: 0.7, grain: 1, flow: 0.55, spacing: 0.08, pressureSize: 0.6, pressureFlow: 0.5, sizeJitter: 0.1 }),
  make('texture', 'chalk', 'Chalk', { size: 22, hardness: 0.95, grain: 0.85, grainSize: 2, flow: 0.9, spacing: 0.1, roundness: 0.8, angle: 30 }),
  make('texture', 'pastel', 'Pastel', { size: 28, opacity: 0.9, hardness: 0.8, grain: 0.7, grainSize: 2, flow: 0.6, spacing: 0.08, roundness: 0.55, angle: 20, pressureFlow: 0.3 }),
  make('texture', 'graphite', 'Graphite', { size: 12, opacity: 0.9, hardness: 0.5, grain: 0.8, flow: 0.3, spacing: 0.06, pressureSize: 0.7, pressureFlow: 0.6 }),
  make('texture', 'sponge', 'Sponge', { size: 40, opacity: 0.85, grain: 1, grainSize: 3, flow: 0.5, spacing: 0.35, scatter: 0.35, sizeJitter: 0.3, hardness: 0.9 }),
  make('texture', 'stipple', 'Stipple', { kind: 'spray', size: 24, count: 6, dotSize: 0.09, spacing: 0.5 }),
  make('texture', 'spatter', 'Spatter', { kind: 'spray', size: 70, count: 12, dotSize: 0.06, spacing: 0.7, sizeJitter: 0.4 }),
  make('texture', 'mist', 'Mist', { size: 70, hardness: 0, flow: 0.07, spacing: 0.07, scatter: 0.12, sizeJitter: 0.2, grain: 0.3 }),
  make('texture', 'dry', 'Dry brush', { kind: 'bristle', size: 34, opacity: 0.9, count: 24, dotSize: 0.07, hardness: 0.7, flow: 0.6, spacing: 0.08, sizeJitter: 0.15, pressureSize: 0.4 }),
  make('texture', 'hatch', 'Hatch', { size: 20, roundness: 0.1, angle: 90, followDirection: true, spacing: 1.3 }),
  make('texture', 'dotted', 'Dotted', { size: 8, spacing: 1.7, pressureSize: 0.5 }),

  make('erase', 'eraser', 'Eraser', { kind: 'line', size: 24, erase: true, softness: 0 }),
  make('erase', 'softE', 'Soft eraser', { size: 40, erase: true, hardness: 0.2, flow: 0.85, spacing: 0.08 }),
  make('erase', 'blockE', 'Block eraser', { kind: 'square', size: 26, erase: true, spacing: 0.2 }),
  make('erase', 'grainE', 'Grain eraser', { size: 30, erase: true, hardness: 0.8, grain: 0.9, flow: 0.6, spacing: 0.1 }),
  make('erase', 'chisel', 'Chisel eraser', { kind: 'line', size: 36, erase: true, roundness: 0.22, angle: -30 }),

  make('new', 'rainbow', 'Rainbow', { size: 22, hardness: 0.8, spacing: 0.08, colourDiff: [90, -60, 40, 0] }),
  make('new', 'dust', 'Dust', { kind: 'spray', size: 50, count: 40, dotSize: 0.02, spacing: 0.2, colourDiff: [-40, -40, -40, 0] }),
  make('new', 'halftone', 'Halftone', { kind: 'spray', size: 30, count: 10, dotSize: 0.12, spacing: 0.4, scatter: 0, hardness: 1 }),
  make('new', 'soft-shade', 'Soft shade', { size: 46, hardness: 0, flow: 0.12, spacing: 0.05, grain: 0.2, grainSize: 4 }),
  make('new', 'fine-hatch', 'Fine hatch', { size: 3, angle: 60, roundness: 0.05, followDirection: true, spacing: 0.6, hardness: 1 }),
  make('new', 'ink-splat', 'Ink splatter', { kind: 'spray', size: 90, count: 20, dotSize: 0.04, spacing: 0.9, sizeJitter: 0.8, scatter: 0.6 }),
  make('new', 'tinted', 'Tinted marker', { kind: 'line', size: 26, opacity: 0.5, softness: 0.4, colourDiff: [0, 0, 0, -20] }),
  make('new', 'wipe', 'Wipe', { size: 60, erase: true, hardness: 0.1, flow: 0.25, spacing: 0.1, grain: 0.5, grainSize: 2 })
];

export const byId = id => BRUSHES.find(b => b.id === id);
