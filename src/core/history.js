export function createHistory(limit = 30) {
  const undoStack = [];
  const redoStack = [];
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => fn());
  return {
    push(entry) {
      undoStack.push(entry);
      if (undoStack.length > limit) undoStack.shift();
      redoStack.length = 0;
      emit();
    },
    undo() {
      const e = undoStack.pop();
      if (!e) return;
      e.undo();
      redoStack.push(e);
      emit();
    },
    redo() {
      const e = redoStack.pop();
      if (!e) return;
      e.redo();
      undoStack.push(e);
      emit();
    },
    canUndo: () => undoStack.length > 0,
    clear() { undoStack.length = 0; redoStack.length = 0; emit(); },
    canRedo: () => redoStack.length > 0,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}
