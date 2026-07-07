import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ImageUploadButtonProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  previewHeight?: string;
}

export function ImageUploadButton({
  value,
  onChange,
  folder = 'general',
  label = 'Upload Image',
  previewHeight = 'h-36',
}: ImageUploadButtonProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      onChange(publicUrl);
    }
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className={`relative group w-full rounded-lg overflow-hidden border border-border ${previewHeight}`}>
          <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <label className="cursor-pointer block">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-primary/5 hover:border-primary/40 transition-all text-sm text-foreground ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? (
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : value ? (
            <ImageIcon className="h-4 w-4 text-primary shrink-0" />
          ) : (
            <Upload className="h-4 w-4 text-primary shrink-0" />
          )}
          <span className="text-muted-foreground">
            {uploading ? 'Uploading...' : value ? 'Replace image' : label}
          </span>
        </div>
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>
    </div>
  );
}
