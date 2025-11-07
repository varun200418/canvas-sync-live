import { useRef, useEffect } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface StrokeData {
  points: Point[];
  color: string;
  width: number;
  type: 'brush' | 'eraser';
}

export const useCanvas = (
  onStrokeComplete: (stroke: StrokeData) => void,
  currentColor: string,
  currentWidth: number,
  currentTool: 'brush' | 'eraser'
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentStroke = useRef<Point[]>([]);
  const lastTouchDistance = useRef<number | null>(null);
  const scale = useRef(1);
  const translatePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - translatePos.current.x) / scale.current,
      y: (clientY - rect.top - translatePos.current.y) / scale.current
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e.clientX, e.clientY);
    isDrawing.current = true;
    currentStroke.current = [point];
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const point = getCanvasPoint(touch.clientX, touch.clientY);
      isDrawing.current = true;
      currentStroke.current = [point];
    } else if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      lastTouchDistance.current = distance;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const point = getCanvasPoint(e.clientX, e.clientY);
    currentStroke.current.push(point);

    // Draw the stroke segment
    const prevPoint = currentStroke.current[currentStroke.current.length - 2];
    
    ctx.save();
    ctx.translate(translatePos.current.x, translatePos.current.y);
    ctx.scale(scale.current, scale.current);
    
    ctx.beginPath();
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(point.x, point.y);
    
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = currentWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    
    ctx.stroke();
    ctx.restore();
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDrawing.current) {
      e.preventDefault();
      const touch = e.touches[0];
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const point = getCanvasPoint(touch.clientX, touch.clientY);
      currentStroke.current.push(point);

      const prevPoint = currentStroke.current[currentStroke.current.length - 2];
      
      ctx.save();
      ctx.translate(translatePos.current.x, translatePos.current.y);
      ctx.scale(scale.current, scale.current);
      
      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(point.x, point.y);
      
      if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = currentWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      
      ctx.stroke();
      ctx.restore();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (lastTouchDistance.current) {
        const delta = distance - lastTouchDistance.current;
        const scaleChange = 1 + delta * 0.01;
        const newScale = Math.min(Math.max(0.5, scale.current * scaleChange), 3);
        scale.current = newScale;
        redrawCanvas();
      }

      lastTouchDistance.current = distance;
    }
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;

    isDrawing.current = false;

    if (currentStroke.current.length > 1) {
      const strokeData: StrokeData = {
        points: [...currentStroke.current],
        color: currentColor,
        width: currentWidth,
        type: currentTool
      };
      
      onStrokeComplete(strokeData);
    }

    currentStroke.current = [];
  };

  const stopDrawingTouch = () => {
    stopDrawing();
    lastTouchDistance.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawStroke = (stroke: StrokeData) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || stroke.points.length < 2) return;

    ctx.save();
    ctx.translate(translatePos.current.x, translatePos.current.y);
    ctx.scale(scale.current, scale.current);
    
    ctx.beginPath();
    
    if (stroke.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.width;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
  };

  const redrawCanvas = () => {
    clearCanvas();
    // Trigger re-render of all strokes by dispatching custom event
    window.dispatchEvent(new CustomEvent('canvas-redraw'));
  };

  return {
    canvasRef,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    drawStroke,
    startDrawingTouch,
    drawTouch,
    stopDrawingTouch
  };
};