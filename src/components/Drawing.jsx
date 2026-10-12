import { useState, useEffect, useRef } from 'react';
import { X, Eraser } from 'lucide-react';
export const CanvasOverlay = ({ entryId, isDrawingMode, overlayData, onSave, color, lineWidth, clearTrigger, isEraser, onExitMode }) => {
  const canvasRef = useRef(null);
  const masterCanvasRef = useRef(document.createElement('canvas'));
  const [isDrawing, setIsDrawing] = useState(false);
  const ctxSettings = useRef({ color, lineWidth, isEraser });
  const overlayDataRef = useRef(overlayData);
  useEffect(() => { overlayDataRef.current = overlayData; }, [overlayData]);

  useEffect(() => { ctxSettings.current = { color, lineWidth, isEraser }; }, [color, lineWidth, isEraser]);

  useEffect(() => {
    const visibleCanvas = canvasRef.current;
    const container = visibleCanvas.parentElement;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const newWidth = container.offsetWidth;
      const newHeight = container.offsetHeight;

      if (visibleCanvas.width !== newWidth || visibleCanvas.height !== newHeight) {
        visibleCanvas.width = newWidth;
        visibleCanvas.height = newHeight;
        const master = masterCanvasRef.current;

        if (newWidth > master.width || newHeight > master.height) {
          const temp = document.createElement('canvas');
          temp.width = master.width;
          temp.height = master.height;
          temp.getContext('2d').drawImage(master, 0, 0);

          master.width = Math.max(master.width, newWidth);
          master.height = Math.max(master.height, newHeight);
          master.getContext('2d').drawImage(temp, 0, 0);
        }

        visibleCanvas.getContext('2d').clearRect(0, 0, newWidth, newHeight);
        visibleCanvas.getContext('2d').drawImage(master, 0, 0);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadImg = () => {
      const visible = canvasRef.current;
      if (!visible) return;
      const visibleCtx = visible.getContext('2d');
      const master = masterCanvasRef.current;
      const masterCtx = master.getContext('2d');

      visibleCtx.clearRect(0, 0, visible.width, visible.height);
      masterCtx.clearRect(0, 0, master.width, master.height);

      if (overlayDataRef.current) {
        const img = new Image();
        img.onload = () => {
          master.width = Math.max(img.width, visible.width || 1);
          master.height = Math.max(img.height, visible.height || 1);
          masterCtx.clearRect(0, 0, master.width, master.height);
          masterCtx.drawImage(img, 0, 0);
          visibleCtx.clearRect(0, 0, visible.width, visible.height);
          visibleCtx.drawImage(master, 0, 0);
        };
        img.src = overlayDataRef.current;
      } else {
        master.width = visible.width || 1;
        master.height = visible.height || 1;
      }
    };
    requestAnimationFrame(loadImg);
  }, [entryId, clearTrigger]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const applyStroke = (ctx, x, y, isStart) => {
    if (ctxSettings.current.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = ctxSettings.current.lineWidth * 3;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = ctxSettings.current.color;
      ctx.lineWidth = ctxSettings.current.lineWidth;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    const visibleCtx = canvasRef.current.getContext('2d');
    const masterCtx = masterCanvasRef.current.getContext('2d');
    applyStroke(visibleCtx, x, y, true);
    applyStroke(masterCtx, x, y, true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const visibleCtx = canvasRef.current.getContext('2d');
    const masterCtx = masterCanvasRef.current.getContext('2d');
    applyStroke(visibleCtx, x, y, false);
    applyStroke(masterCtx, x, y, false);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      onSave(masterCanvasRef.current.toDataURL('image/png'));
    }
  };

  const handleContextMenu = (e) => {
    if (isDrawingMode) { e.preventDefault(); onExitMode(); }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
      onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
      onContextMenu={handleContextMenu}
      className={`absolute top-0 left-0 w-full h-full touch-none ${isDrawingMode ? 'z-10 cursor-crosshair' : 'pointer-events-none z-10'}`}
    />
  );
};

// ==========================================
// КОМПОНЕНТ РИСОВАЛКИ (ОТДЕЛЬНЫЙ СКЕТЧ-БЛОК)
// ==========================================
export const DrawingModal = ({ onClose, onSave, t }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(() => localStorage.getItem('diaryDrawColor') || '#ef4444');
  const [lineWidth, setLineWidth] = useState(() => Number(localStorage.getItem('diaryDrawSize')) || 3);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => { localStorage.setItem('diaryDrawColor', color); localStorage.setItem('diaryDrawSize', lineWidth); }, [color, lineWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath(); ctx.moveTo(x, y);
    setIsDrawing(true); draw(e);
  };

  const draw = (e) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    if (isEraser) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = lineWidth * 3; }
    else { ctx.strokeStyle = color; ctx.lineWidth = lineWidth; }
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => { const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="ltr">
      <div className="app-sidebar p-5 rounded-2xl shadow-2xl app-border border flex flex-col gap-4 w-full max-w-2xl">
        <div className="flex justify-between items-center">
          <h3 className="font-bold app-text text-lg">{t.sketchCanvas}</h3>
          <button onClick={onClose} className="app-text-muted hover:app-text transition-colors p-1"><X size={20}/></button>
        </div>
        <div className="overflow-hidden rounded-lg border-2 border-gray-300 relative shadow-inner bg-white" style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef} width={800} height={500}
            className="w-full h-auto cursor-crosshair touch-none"
            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseOut={stopDrawing}
            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
          />
        </div>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4 bg-black/5 p-2 rounded-lg border app-border">
            <div className="flex items-center gap-2">
              <span className="text-xs app-text-muted font-semibold uppercase">{t.color}</span>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} disabled={isEraser} className={`w-8 h-8 rounded border-0 p-0 ${isEraser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} title={t.color} />
            </div>
            <div className="w-px h-6 app-border border-l"></div>
            <div className="flex items-center gap-2">
              <span className="text-xs app-text-muted font-semibold uppercase">{t.brush}</span>
              <input type="range" min="1" max="30" value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="w-24 cursor-pointer accent-blue-500" title={t.brush} />
            </div>
            <div className="w-px h-6 app-border border-l"></div>
            <button onClick={() => setIsEraser(!isEraser)} className={`p-1.5 rounded transition-colors ${isEraser ? 'bg-blue-500 text-white' : 'app-text-muted hover:app-text'}`} title={t.eraser}>
              <Eraser size={18} />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={clearCanvas} className="px-4 py-2.5 text-sm font-medium rounded-lg app-hover-bg app-text border app-border transition-colors">{t.clear}</button>
            <button onClick={() => onSave(canvasRef.current.toDataURL('image/png'))} className="px-5 py-2.5 text-sm font-medium rounded-lg app-accent-bg transition-transform hover:scale-105 shadow-lg flex items-center gap-2">{t.insertText}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
