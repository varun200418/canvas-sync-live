import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || '');
        setAvatarUrl(profile.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      navigate(-1);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              Update your display name and avatar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>
                    {displayName.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <Label
                  htmlFor="avatar-upload"
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Avatar'}
                  </div>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
