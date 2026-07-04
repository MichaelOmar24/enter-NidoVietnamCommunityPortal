import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { GalleryAlbum, GalleryPhoto } from '@/lib/types';
import { Plus, Trash2, Upload, Image, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AdminGallery() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [albumDialog, setAlbumDialog] = useState(false);
  const [newAlbum, setNewAlbum] = useState({ title: '', description: '', event_date: '' });
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadAlbums(); }, []);

  const loadAlbums = async () => {
    const { data } = await supabase.from('gallery_albums').select('*').order('event_date', { ascending: false });
    setAlbums((data || []) as GalleryAlbum[]);
  };

  const loadPhotos = async (albumId: string) => {
    const { data } = await supabase.from('gallery_photos').select('*').eq('album_id', albumId).order('created_at');
    setPhotos((data || []) as GalleryPhoto[]);
  };

  const createAlbum = async () => {
    if (!newAlbum.title) return;
    const { data } = await supabase.from('gallery_albums').insert({ ...newAlbum }).select().single();
    toast({ title: 'Album created' });
    setAlbumDialog(false);
    setNewAlbum({ title: '', description: '', event_date: '' });
    loadAlbums();
  };

  const deleteAlbum = async (id: string) => {
    if (!confirm('Delete this album and all its photos?')) return;
    await supabase.from('gallery_photos').delete().eq('album_id', id);
    await supabase.from('gallery_albums').delete().eq('id', id);
    toast({ title: 'Album deleted' });
    setSelectedAlbum(null);
    loadAlbums();
  };

  const uploadPhoto = async () => {
    if (!photoFile || !selectedAlbum) return;
    setUploading(true);

    const ext = photoFile.name.split('.').pop();
    const fileName = `gallery_${selectedAlbum.id}_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('gallery-photos').upload(fileName, photoFile);

    if (uploadErr) {
      // If bucket doesn't exist, insert with placeholder URL
      await supabase.from('gallery_photos').insert({
        album_id: selectedAlbum.id,
        image_url: URL.createObjectURL(photoFile), // placeholder
        caption: photoCaption,
      });
    } else {
      const { data: urlData } = supabase.storage.from('gallery-photos').getPublicUrl(fileName);
      await supabase.from('gallery_photos').insert({
        album_id: selectedAlbum.id,
        image_url: urlData.publicUrl,
        caption: photoCaption,
      });
    }

    toast({ title: 'Photo uploaded' });
    setPhotoFile(null);
    setPhotoCaption('');
    loadPhotos(selectedAlbum.id);
    setUploading(false);
  };

  const deletePhoto = async (id: string) => {
    await supabase.from('gallery_photos').delete().eq('id', id);
    if (selectedAlbum) loadPhotos(selectedAlbum.id);
    toast({ title: 'Photo deleted' });
  };

  const openAlbum = (album: GalleryAlbum) => {
    setSelectedAlbum(album);
    loadPhotos(album.id);
  };

  return (
    <AdminLayout title="Gallery Management">
      {selectedAlbum ? (
        <>
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" onClick={() => setSelectedAlbum(null)} className="gap-2 text-primary border-primary hover:bg-primary/10">
              <ChevronLeft className="h-4 w-4" /> All Albums
            </Button>
            <h2 className="text-lg font-bold text-foreground">{selectedAlbum.title}</h2>
            <Button variant="outline" onClick={() => deleteAlbum(selectedAlbum.id)} className="ml-auto gap-2 text-destructive border-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Delete Album
            </Button>
          </div>

          {/* Upload Photo */}
          <Card className="shadow-card mb-6">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-4 text-sm">Upload Photo</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} className="h-9 text-sm" />
                  <Input value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="Caption (optional)" className="h-9 text-sm" />
                </div>
                <Button onClick={uploadPhoto} disabled={!photoFile || uploading} className="gradient-primary text-primary-foreground gap-2 h-9 self-end">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden shadow-card">
                <img src={photo.image_url} alt={photo.caption || ''} className="w-full h-36 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-smooth flex items-center justify-center">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 text-white hover:bg-destructive"
                    onClick={() => deletePhoto(photo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                    {photo.caption}
                  </div>
                )}
              </div>
            ))}
            {photos.length === 0 && (
              <div className="col-span-4 text-center py-12 text-muted-foreground">
                <Image className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No photos yet. Upload the first one!</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end mb-6">
            <Button onClick={() => setAlbumDialog(true)} className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> New Album
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map(album => (
              <Card
                key={album.id}
                className="shadow-card hover:shadow-green transition-smooth cursor-pointer overflow-hidden"
                onClick={() => openAlbum(album)}
              >
                {album.cover_image_url ? (
                  <img src={album.cover_image_url} alt={album.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 gradient-primary flex items-center justify-center">
                    <Image className="h-10 w-10 text-primary-foreground/40" />
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground text-sm">{album.title}</h3>
                  {album.event_date && <p className="text-xs text-muted-foreground mt-1">{new Date(album.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {albums.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Image className="h-16 w-16 mx-auto mb-3 opacity-30" />
              <p>No albums yet. Create one!</p>
            </div>
          )}
        </>
      )}

      <Dialog open={albumDialog} onOpenChange={setAlbumDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Album</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Album Title *</Label>
              <Input value={newAlbum.title} onChange={e => setNewAlbum(a => ({ ...a, title: e.target.value }))} placeholder="e.g. NIDO Annual Meeting 2025" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={newAlbum.description} onChange={e => setNewAlbum(a => ({ ...a, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Event Date</Label>
              <Input type="date" value={newAlbum.event_date} onChange={e => setNewAlbum(a => ({ ...a, event_date: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <Button onClick={createAlbum} className="flex-1 gradient-primary text-primary-foreground">Create Album</Button>
              <Button variant="outline" onClick={() => setAlbumDialog(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
