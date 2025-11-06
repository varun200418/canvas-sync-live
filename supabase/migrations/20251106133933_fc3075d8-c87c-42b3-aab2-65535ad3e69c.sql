-- Create canvas sessions table
CREATE TABLE public.canvas_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create drawing strokes table
CREATE TABLE public.drawing_strokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.canvas_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  stroke_data JSONB NOT NULL,
  stroke_type TEXT NOT NULL CHECK (stroke_type IN ('brush', 'eraser')),
  color TEXT NOT NULL,
  width FLOAT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  operation_index INTEGER NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.canvas_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_strokes ENABLE ROW LEVEL SECURITY;

-- Create policies for canvas_sessions (public access for this demo)
CREATE POLICY "Anyone can view canvas sessions"
  ON public.canvas_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create canvas sessions"
  ON public.canvas_sessions FOR INSERT
  WITH CHECK (true);

-- Create policies for drawing_strokes (public access for this demo)
CREATE POLICY "Anyone can view drawing strokes"
  ON public.drawing_strokes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert drawing strokes"
  ON public.drawing_strokes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete drawing strokes"
  ON public.drawing_strokes FOR DELETE
  USING (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drawing_strokes;

-- Create index for faster queries
CREATE INDEX idx_drawing_strokes_session_id ON public.drawing_strokes(session_id);
CREATE INDEX idx_drawing_strokes_operation_index ON public.drawing_strokes(session_id, operation_index);