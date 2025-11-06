import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCanvas } from '@/hooks/useCanvas';
import { useCollaborativeCanvas } from '@/hooks/useCollaborativeCanvas';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Brush, Eraser, Trash2, Undo, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface CanvasProps {
  sessionId: string;
}

export const Canvas = ({ sessionId }: CanvasProps) => {
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(3);
  const [currentTool, setCurrentTool] = useState<'brush' | 'eraser'>('brush');
  const navigate = useNavigate();

  const {
    userId,
    userColor,
    onlineUsers,
    saveStroke,
    loadStrokes,
    clearAllStrokes,
    undoLastStroke
  } = useCollaborativeCanvas(sessionId);

  const {
    canvasRef,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    drawStroke
  } = useCanvas(saveStroke, currentColor, currentWidth, currentTool);

  // Load initial strokes
  useEffect(() => {
    const loadInitialStrokes = async () => {
      const strokes = await loadStrokes();
      strokes.forEach(stroke => drawStroke(stroke));
    };

    loadInitialStrokes();
  }, [sessionId]);

  // Listen for remote strokes
  useEffect(() => {
    const handleRemoteStroke = (event: CustomEvent) => {
      const strokeData = event.detail.stroke_data;
      console.log('Drawing remote stroke:', strokeData);
      drawStroke(strokeData);
    };

    window.addEventListener('remote-stroke', handleRemoteStroke as EventListener);
    return () => window.removeEventListener('remote-stroke', handleRemoteStroke as EventListener);
  }, []);

  const handleClear = async () => {
    await clearAllStrokes();
    clearCanvas();
    toast.success('Canvas cleared');
  };

  const handleUndo = async () => {
    await undoLastStroke();
    
    // Reload and redraw all strokes
    clearCanvas();
    const strokes = await loadStrokes();
    strokes.forEach(stroke => drawStroke(stroke));
    
    toast.success('Last stroke undone');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-card border-b">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={currentTool === 'brush' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setCurrentTool('brush')}
            >
              <Brush className="h-4 w-4" />
            </Button>
            <Button
              variant={currentTool === 'eraser' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setCurrentTool('eraser')}
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            {colors.map((color) => (
              <button
                key={color}
                className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: currentColor === color ? userColor : 'transparent'
                }}
                onClick={() => setCurrentColor(color)}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 w-40">
            <span className="text-sm text-muted-foreground">Width:</span>
            <Slider
              value={[currentWidth]}
              onValueChange={(values) => setCurrentWidth(values[0])}
              min={1}
              max={20}
              step={1}
            />
            <span className="text-sm font-medium w-8">{currentWidth}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: userColor }}
            />
            <span className="text-sm text-muted-foreground">
              You ({onlineUsers.length} online)
            </span>
          </div>

          <Button variant="outline" size="icon" onClick={handleUndo}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

      {/* Info */}
      <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
        Session ID: {sessionId} | User ID: {userId}
      </div>
    </div>
  );
};