import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxTotalMB?: number;
}

export function AttachmentPicker({ files, onChange, maxTotalMB = 10 }: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const totalBytes = files.reduce((s, f) => s + f.size, 0);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    const merged = [...files, ...picked];
    const total = merged.reduce((s, f) => s + f.size, 0);
    if (total > maxTotalMB * 1024 * 1024) {
      toast({
        title: 'Attachments too large',
        description: `Total attachment size must stay under ${maxTotalMB} MB (base64 encoding adds ~33% for email transfer).`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    onChange(merged);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleSelect} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className="gap-1.5 text-xs"
      >
        <Paperclip className="h-3.5 w-3.5" />
        {files.length === 0 ? 'Attach files' : 'Add more files'}
      </Button>
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate flex-1">{f.name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(f.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-destructive shrink-0"
                title="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            {files.length} file{files.length > 1 ? 's' : ''} · {formatSize(totalBytes)} total · max {maxTotalMB} MB
          </p>
        </div>
      )}
    </div>
  );
}
