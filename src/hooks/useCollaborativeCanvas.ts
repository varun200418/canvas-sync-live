import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StrokeData } from './useCanvas';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  color: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export const useCollaborativeCanvas = (sessionId: string) => {
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const [userColor] = useState(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    return colors[Math.floor(Math.random() * colors.length)];
  });
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [userProfiles, setUserProfiles] = useState<Map<string, UserProfile>>(new Map());
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const operationIndexRef = useRef(0);

  useEffect(() => {
    console.log('Setting up collaborative canvas for session:', sessionId);

    // Fetch current user profile
    const fetchCurrentUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile) {
          setCurrentUserProfile(profile);
          setUserProfiles(prev => new Map(prev).set(user.id, profile));
        }
      }
    };

    fetchCurrentUserProfile();

    // Subscribe to drawing strokes
    const strokesChannel = supabase
      .channel(`canvas-strokes-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'drawing_strokes',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('New stroke received:', payload);
          if (payload.new.user_id !== userId) {
            // Trigger stroke redraw through callback
            const event = new CustomEvent('remote-stroke', { detail: payload.new });
            window.dispatchEvent(event);
          }
        }
      )
      .subscribe();

    // Presence channel for cursor tracking
    const presenceChannel = supabase.channel(`presence-${sessionId}`, {
      config: { presence: { key: userId } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.keys(state);
        console.log('Online users:', users);
        setOnlineUsers(users);

        // Fetch profiles for all online users
        const fetchProfiles = async () => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const userIds = users.filter(id => !userProfiles.has(id) && currentUser);
          
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('id', userIds);
            
            if (profiles) {
              setUserProfiles(prev => {
                const newMap = new Map(prev);
                profiles.forEach(profile => newMap.set(profile.id, profile));
                return newMap;
              });
            }
          }
        };
        
        fetchProfiles();
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('User joined:', key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('User left:', key);
        setCursors((prev) => prev.filter((c) => c.userId !== key));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId,
            color: userColor,
            online_at: new Date().toISOString()
          });
        }
      });

    channelRef.current = presenceChannel;

    return () => {
      strokesChannel.unsubscribe();
      presenceChannel.unsubscribe();
    };
  }, [sessionId, userId, userColor]);

  const saveStroke = async (stroke: StrokeData) => {
    console.log('Saving stroke:', stroke);
    
    const { error } = await supabase
      .from('drawing_strokes')
      .insert([{
        session_id: sessionId,
        user_id: userId,
        stroke_data: stroke as any,
        stroke_type: stroke.type,
        color: stroke.color,
        width: stroke.width,
        operation_index: operationIndexRef.current++
      }]);

    if (error) {
      console.error('Error saving stroke:', error);
    }
  };

  const loadStrokes = async () => {
    console.log('Loading strokes for session:', sessionId);
    
    const { data, error } = await supabase
      .from('drawing_strokes')
      .select('*')
      .eq('session_id', sessionId)
      .order('operation_index', { ascending: true });

    if (error) {
      console.error('Error loading strokes:', error);
      return [];
    }

    console.log('Loaded strokes:', data?.length || 0);
    operationIndexRef.current = data?.length || 0;
    return data?.map(s => s.stroke_data as unknown as StrokeData) || [];
  };

  const updateCursor = (x: number, y: number) => {
    if (channelRef.current) {
      channelRef.current.track({
        userId,
        color: userColor,
        x,
        y,
        online_at: new Date().toISOString()
      });
    }
  };

  const clearAllStrokes = async () => {
    const { error } = await supabase
      .from('drawing_strokes')
      .delete()
      .match({ session_id: sessionId });

    if (error) {
      console.error('Error clearing strokes:', error);
    } else {
      operationIndexRef.current = 0;
    }
  };

  const undoLastStroke = async () => {
    const { data, error } = await supabase
      .from('drawing_strokes')
      .select('id')
      .eq('session_id', sessionId)
      .order('operation_index', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      console.error('Error finding last stroke:', error);
      return;
    }

    const { error: deleteError } = await supabase
      .from('drawing_strokes')
      .delete()
      .eq('id', data[0].id);

    if (deleteError) {
      console.error('Error deleting stroke:', deleteError);
    } else {
      operationIndexRef.current = Math.max(0, operationIndexRef.current - 1);
    }
  };

  return {
    userId,
    userColor,
    cursors,
    onlineUsers,
    currentUserProfile,
    userProfiles,
    saveStroke,
    loadStrokes,
    updateCursor,
    clearAllStrokes,
    undoLastStroke
  };
};
