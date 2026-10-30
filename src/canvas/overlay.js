/*
 * Overlay sits inside the board, above the layers, so it scales and rotates with the artwork.
 * It shows the selection as a tint and the transform box with its handles.
 */
export function createOverlay(board, W, H) {
  const canvas = document.createElement('canvas');
  canvas.className = 'overlay';
  canvas.width = W; canvas.height = H;
  canvas.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none`;
  board.append(canvas);
  const ctx = canvas.getContext('2d');
  const scale = () => Math.max(1, canvas.width / canvas.getBoundingClientRect().width);

  return {
    canvas,
    clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); },
    resize(w, h) { canvas.width = w; canvas.height = h; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; },
    drawSelection(mask, bounds, accent) {
      this.clear();
      if (!bounds) return;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.save();
      ctx.setLineDash([6 * scale(), 4 * scale()]);
      ctx.lineWidth = scale();
      ctx.strokeStyle = accent;
      ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
      ctx.restore();
    },
    drawBox(corners, rotateHandle, handleSize, accent, paper) {
      this.clear();
      const s = scale();
      ctx.save();
      ctx.lineWidth = s;
      ctx.strokeStyle = accent;
      ctx.beginPath();
      corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rotateHandle.from[0], rotateHandle.from[1]);
      ctx.lineTo(rotateHandle.at[0], rotateHandle.at[1]);
      ctx.stroke();
      const r = handleSize * s;
      ctx.fillStyle = paper;
      [...corners, rotateHandle.at].forEach(([x, y], i) => {
        ctx.beginPath();
        if (i === 4) ctx.arc(x, y, r * 0.8, 0, Math.PI * 2); else ctx.rect(x - r / 2, y - r / 2, r, r);
        ctx.fill();
        ctx.stroke();
      });
      ctx.restore();
    }
  };
}
