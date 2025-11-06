import { useState, useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const Index = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionName, setSessionName] = useState('');
  const [isInSession, setIsInSession] = useState(false);

  // Check for session ID in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('session');
    
    if (urlSessionId) {
      setSessionId(urlSessionId);
      setIsInSession(true);
    }
  }, []);

  const createSession = async () => {
    if (!sessionName.trim()) {
      toast.error('Please enter a session name');
      return;
    }

    const { data, error } = await supabase
      .from('canvas_sessions')
      .insert({ name: sessionName })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
      return;
    }

    const newSessionId = data.id;
    setSessionId(newSessionId);
    setIsInSession(true);
    
    // Update URL
    window.history.pushState({}, '', `?session=${newSessionId}`);
    
    toast.success('Session created! Share the URL to collaborate.');
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}?session=${sessionId}`;
    navigator.clipboard.writeText(link);
    toast.success('Session link copied to clipboard!');
  };

  if (!isInSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-6 p-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Collaborative Canvas</h1>
            <p className="text-muted-foreground">
              Create a new drawing session or join an existing one
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter session name..."
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createSession()}
              />
              <Button onClick={createSession} className="w-full">
                Create New Session
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Features
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Real-time multi-user drawing</p>
              <p>✓ Brush & eraser tools</p>
              <p>✓ Multiple colors & stroke widths</p>
              <p>✓ Global undo functionality</p>
              <p>✓ User presence indicators</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        onClick={copySessionLink}
        className="absolute top-4 right-4 z-10"
        variant="secondary"
      >
        Copy Session Link
      </Button>
      <Canvas sessionId={sessionId} />
    </div>
  );
};

export default Index;
