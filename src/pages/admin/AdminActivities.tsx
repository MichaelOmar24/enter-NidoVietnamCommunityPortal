import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from '@/lib/types';
import { Plus, Calendar, Trash2, Edit, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadButton } from '@/components/common/ImageUploadButton';

const EMPTY: Partial<Activity> = { title: '', description: '', content: '', event_date: '', location: '', cover_image_url: '', is_published: true };

export function AdminActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Activity>>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('activities').select('*').order('event_date', { ascending: false });
    setActivities((data || []) as Activity[]);
  };

  const save = async () => {
    if (!form.title) return;
    if (editingId) {
      await supabase.from('activities').update(form).eq('id', editingId);
      toast({ title: 'Activity updated' });
    } else {
      await supabase.from('activities').insert({ ...form } as Omit<Activity, 'id' | 'created_at' | 'updated_at'>);
      toast({ title: 'Activity created' });
    }
    setDialogOpen(false);
    setForm(EMPTY);
    setEditingId(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this activity?')) return;
    await supabase.from('activities').delete().eq('id', id);
    toast({ title: 'Deleted' });
    load();
  };

  const edit = (a: Activity) => {
    setForm({ ...a, event_date: a.event_date ? a.event_date.split('T')[0] : '' });
    setEditingId(a.id);
    setDialogOpen(true);
  };

  return (
    <AdminLayout title="Activities Management">
      <div className="flex justify-end mb-6">
        <Button onClick={() => { setForm(EMPTY); setEditingId(null); setDialogOpen(true); }} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> New Activity
        </Button>
      </div>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Calendar className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p>No activities yet</p>
          </div>
        ) : activities.map(activity => (
          <Card key={activity.id} className="shadow-card">
            <CardContent className="p-5 flex items-start gap-4">
              {activity.cover_image_url && (
                <img src={activity.cover_image_url} alt={activity.title} className="w-20 h-20 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{activity.title}</h3>
                  <Badge className={activity.is_published ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}>
                    {activity.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  {activity.event_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(activity.event_date).toLocaleDateString()}</span>}
                  {activity.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{activity.location}</span>}
                </div>
                {activity.description && <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => edit(activity)} className="h-8 w-8 text-primary">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(activity.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Activity' : 'New Activity'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5"><Label>Content</Label><Textarea value={form.content || ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Event Date</Label><Input type="date" value={form.event_date?.split('T')[0] || ''} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Location</Label><Input value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Cover Image</Label>
              <ImageUploadButton
                value={form.cover_image_url || ''}
                onChange={url => setForm(f => ({ ...f, cover_image_url: url }))}
                folder="activity-covers"
                label="Upload cover image"
                previewHeight="h-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pub" checked={form.is_published || false} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
              <Label htmlFor="pub" className="cursor-pointer">Published (visible to public)</Label>
            </div>
            <div className="flex gap-3">
              <Button onClick={save} className="flex-1 gradient-primary text-primary-foreground">Save</Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
