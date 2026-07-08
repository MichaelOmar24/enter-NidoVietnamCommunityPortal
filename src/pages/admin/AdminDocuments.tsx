import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Document } from '@/lib/types';
import { Plus, FileText, Eye, Trash2, Upload, File, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EMPTY_FORM = { title: '', description: '', document_url: '', document_type: 'constitution' as const, is_active: true };

export function AdminDocuments() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setDocs((data || []) as Document[]);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDocFile(null);
    setDialogOpen(true);
  };

  const openEdit = (doc: Document) => {
    setEditingId(doc.id);
    setForm({
      title: doc.title,
      description: doc.description || '',
      document_url: doc.document_url || '',
      document_type: doc.document_type as typeof EMPTY_FORM['document_type'],
      is_active: doc.is_active,
    });
    setDocFile(null);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title) return;
    setUploading(true);

    let document_url = form.document_url;

    if (docFile) {
      const fd = new FormData();
      fd.append('file', docFile);
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('upload-document', { body: fd });
      if (!fnErr && fnData?.url) {
        document_url = fnData.url;
      } else {
        toast({ title: 'Upload failed', description: fnErr?.message || 'Could not upload document', variant: 'destructive' });
        setUploading(false);
        return;
      }
    }

    if (editingId) {
      await supabase.from('documents').update({ ...form, document_url }).eq('id', editingId);
      toast({ title: 'Document updated' });
    } else {
      await supabase.from('documents').insert({ ...form, document_url });
      toast({ title: 'Document added' });
    }

    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDocFile(null);
    setUploading(false);
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('documents').update({ is_active: !current }).eq('id', id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    await supabase.from('documents').delete().eq('id', id);
    toast({ title: 'Document deleted' });
    load();
  };

  const docTypeColors: Record<string, string> = {
    constitution: 'bg-primary/20 text-primary',
    circular: 'bg-gold/20 text-gold',
    announcement: 'bg-accent/20 text-accent',
    certificate: 'bg-purple-500/20 text-purple-600',
  };

  return (
    <AdminLayout title="Documents Management">
      <div className="flex justify-end mb-6">
        <Button onClick={openCreate} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Add Document
        </Button>
      </div>

      <div className="space-y-3">
        {docs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p>No documents yet</p>
          </div>
        ) : docs.map(doc => (
          <Card key={doc.id} className="shadow-card">
            <CardContent className="p-5 flex items-start gap-4">
              <FileText className="h-8 w-8 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-foreground">{doc.title}</h3>
                  <Badge className={docTypeColors[doc.document_type] || ''}>{doc.document_type}</Badge>
                  <Badge className={doc.is_active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}>
                    {doc.is_active ? 'Active' : 'Hidden'}
                  </Badge>
                </div>
                {doc.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{doc.description}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                {doc.document_url && (
                  <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                <Button size="icon" variant="ghost" onClick={() => openEdit(doc)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(doc.id, doc.is_active)} className="text-xs h-8">
                  {doc.is_active ? 'Hide' : 'Show'}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(doc.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Document' : 'Add Document'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Document title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Brief description of this document..."
                className="resize-y"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-1.5">
              <Label>{editingId ? 'Replace Document File (optional)' : 'Document File'}</Label>
              {docFile ? (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <File className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{docFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(docFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={() => setDocFile(null)} className="text-xs text-destructive hover:underline shrink-0">Remove</button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('doc-file-upload')?.click()}
                >
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                  {editingId && form.document_url ? (
                    <p className="text-sm text-muted-foreground">Click to replace the existing file</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to upload document</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-0.5">PDF, Word, or image — up to 20MB</p>
                </div>
              )}
              <input
                id="doc-file-upload"
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={e => setDocFile(e.target.files?.[0] || null)}
              />
              {editingId && form.document_url && !docFile && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Current file will be kept if no new file is uploaded.{' '}
                  <a href={form.document_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View current</a>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <Select
                value={form.document_type}
                onValueChange={v => setForm(f => ({ ...f, document_type: v as typeof EMPTY_FORM['document_type'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="constitution">Constitution</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              />
              <Label htmlFor="active" className="cursor-pointer">Active (visible to members)</Label>
            </div>

            <div className="flex gap-3">
              <Button onClick={save} disabled={uploading} className="flex-1 gradient-primary text-primary-foreground">
                {uploading ? 'Uploading...' : editingId ? 'Save Changes' : 'Add Document'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
