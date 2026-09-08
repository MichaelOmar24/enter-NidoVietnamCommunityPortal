export interface EmailAttachment {
  filename: string;
  content: string; // base64, no data-url prefix
  contentType: string;
}

export async function filesToAttachments(files: File[]): Promise<EmailAttachment[]> {
  return Promise.all(
    files.map(
      f =>
        new Promise<EmailAttachment>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve({
              filename: f.name,
              content: dataUrl.split(',')[1] || '',
              contentType: f.type || 'application/octet-stream',
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(f);
        })
    )
  );
}
