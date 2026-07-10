import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { GalleryAlbum, GalleryPhoto } from '@/lib/types';
import { Image, Calendar, ChevronLeft, X } from 'lucide-react';

export function GalleryPage() {
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAlbums(); }, []);

  const fetchAlbums = async () => {
    setLoading(true);
    const { data } = await supabase.from('gallery_albums').select('*').order('event_date', { ascending: false });
    setAlbums((data || []) as GalleryAlbum[]);
    setLoading(false);
  };

  const openAlbum = async (album: GalleryAlbum) => {
    setSelectedAlbum(album);
    const { data } = await supabase.from('gallery_photos').select('*').eq('album_id', album.id).order('created_at');
    setPhotos((data || []) as GalleryPhoto[]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-gold">
            <X className="h-8 w-8" />
          </button>
          <img src={lightbox} alt="Gallery" className="max-w-full max-h-[90vh] object-contain rounded-lg" onContextMenu={e => e.preventDefault()} />
        </div>
      )}

      <div className="pt-20 flex-1">
        {/* Header */}
        <div className="gradient-hero py-16 px-4">
          <div className="container mx-auto text-center">
            <Image className="h-12 w-12 text-gold mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">Community Gallery</h1>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              Moments captured from NIDO Vietnam events, ceremonies, and community activities.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {selectedAlbum ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" onClick={() => setSelectedAlbum(null)} className="gap-2 text-primary border-primary hover:bg-primary/10">
                  <ChevronLeft className="h-4 w-4" /> All Albums
                </Button>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedAlbum.title}</h2>
                  {selectedAlbum.event_date && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(selectedAlbum.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    className="relative overflow-hidden rounded-xl cursor-pointer group shadow-card hover:shadow-green transition-smooth"
                    onClick={() => setLightbox(photo.image_url)}
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.caption || 'Gallery photo'}
                      className="w-full h-56 object-cover group-hover:scale-105 transition-smooth"
                      onContextMenu={e => e.preventDefault()}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-smooth" />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-smooth">
                        <p className="text-white text-sm">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}

                {photos.length === 0 && (
                  <div className="col-span-3 text-center py-10 text-muted-foreground">
                    <Image className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No photos in this album yet.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="h-48 bg-muted" />
                      <CardContent className="p-5 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))
                ) : albums.map(album => (
                  <Card
                    key={album.id}
                    className="overflow-hidden shadow-card hover:shadow-green transition-smooth cursor-pointer group"
                    onClick={() => openAlbum(album)}
                  >
                    <div className="relative overflow-hidden">
                      {album.cover_image_url ? (
                        <img src={album.cover_image_url} alt={album.title} className="w-full h-48 object-cover group-hover:scale-105 transition-smooth" />
                      ) : (
                        <div className="w-full h-48 gradient-primary flex items-center justify-center">
                          <Image className="h-12 w-12 text-primary-foreground/40" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <h3 className="font-bold text-foreground">{album.title}</h3>
                      {album.event_date && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(album.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                      {album.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{album.description}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
