import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

const NIDO_LOGO_URL = 'https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png';
const SEAL_URL = 'https://cdn.enter.pro/visual_resources/100149613/c753d9244c3043b1b94d68d17a964c99/c5221e63.png';
const SIGNATURE_URL = 'https://cdn.enter.pro/visual_resources/100149613/c753d9244c3043b1b94d68d17a964c99/5709b7de.jpg';

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
  format: 'PNG' | 'JPEG' | 'WEBP';
}

async function loadImage(url: string): Promise<LoadedImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    const type = blob.type.toLowerCase();
    const format: LoadedImage['format'] = type.includes('png') ? 'PNG' : type.includes('webp') ? 'WEBP' : 'JPEG';
    return { dataUrl, ...dims, format };
  } catch {
    return null;
  }
}

export interface RecommendationLetterData {
  memberName: string;
  passportNumber?: string | null;
  letterContent: string;
  /** Defaults match the official NIDO Vietnam letterhead sample */
  recipientName?: string;   // e.g. "Mrs. Hannatu Karau"
  signerName?: string;      // e.g. "DR. Michael Omar"
  signerTitle?: string;     // e.g. "Director, Nigerians in Diaspora Organisation."
  signerPhone?: string;     // e.g. "+84326189705"
  issueDate?: Date;
}

/** Generate the official NIDO Vietnam recommendation letter (letterhead PDF). */
export async function generateRecommendationLetterPdf(
  data: RecommendationLetterData,
  output: 'save' | 'base64' = 'save'
): Promise<string | void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  const [logo, seal, signature] = await Promise.all([
    loadImage(NIDO_LOGO_URL),
    loadImage(SEAL_URL),
    loadImage(SIGNATURE_URL),
  ]);

  const issueDate = data.issueDate || new Date();
  const recipientName = data.recipientName || 'Mrs. Hannatu Karau';
  const signerName = data.signerName || 'DR. Michael Omar';
  const signerTitle = data.signerTitle || 'Director, Nigerians in Diaspora Organisation.';
  const signerPhone = data.signerPhone || '+84326189705';

  // ── Letterhead ──
  let y = 14;

  // Seal — top-left corner, kept clear of the centered header text
  const TEXT_ZONE_START = margin + 34;
  const centerX = (TEXT_ZONE_START + (pageWidth - margin)) / 2;
  if (seal) {
    const h = 20;
    const w = (seal.width / seal.height) * h;
    try { doc.addImage(seal.dataUrl, seal.format, 8, 6, w, h); } catch { /* skip */ }
  }

  // NIDO logo — top-center (within the text zone, clear of the seal)
  if (logo) {
    const h = 16;
    const w = (logo.width / logo.height) * h;
    try { doc.addImage(logo.dataUrl, logo.format, centerX - w / 2, y - 4, w, h); } catch { /* skip */ }
  }
  y += 14;

  // Website
  doc.setFontSize(10);
  doc.setTextColor(0, 100, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('https://www.nidovietnam.com', centerX, y, { align: 'center' });
  y += 5.5;

  // Address line
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text('Nigerian Embassy Vietnam. Villa No. 44/1 pho 100000, Van Bao, Ngoc Khanh, Ba Dinh, Ha Noi', centerX, y, { align: 'center' });
  y += 4.5;

  // NIDO ASIA line
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text('NIDO ASIA: Prof. Emenike Ejiogu President, Exec. Directors, Engr. Henry Awoms, Engr. Osekwe Ochade, Dr. Michael Omar', centerX, y, { align: 'center' });
  y += 12;

  // Right block — contact + date
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.text('NIDO Community, Hanoi.', pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.setTextColor(0, 100, 60);
  doc.text('info@nidovietnam.com', pageWidth - margin, y, { align: 'right' });
  doc.setTextColor(30, 30, 30);
  y += 10;
  doc.text(format(issueDate, 'MMMM dd, yyyy'), pageWidth - margin, y, { align: 'right' });
  y += 10;

  // Recipient block
  doc.setFontSize(10.5);
  doc.text('Nigerian Embassy Vietnam', margin, y); y += 5;
  doc.text('Villa No. 44/1 pho 100000, Van Bao, Ngoc Khanh,', margin, y); y += 5;
  doc.text('Ba Dinh, Ha Noi', margin, y); y += 9;
  doc.setFont('helvetica', 'bold');
  doc.text('To:', margin, y); y += 5;
  doc.text('Head of Mission,', margin, y); y += 5;
  doc.text(recipientName, margin, y); y += 12;

  // Title
  doc.setFontSize(12);
  const title = `Recommendation Letter: ${data.memberName}`;
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  const titleW = doc.getTextWidth(title);
  doc.setDrawColor(30, 30, 30);
  doc.line((pageWidth - titleW) / 2, y + 1.2, (pageWidth + titleW) / 2, y + 1.2);
  y += 10;

  // Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  data.letterContent.split('\n').forEach(para => {
    if (!para.trim()) { y += 4; return; }
    const lines = doc.splitTextToSize(para, contentWidth);
    lines.forEach((line: string) => {
      if (y > 255) { doc.addPage(); y = 24; }
      doc.text(line, margin, y);
      y += 5.2;
    });
    y += 2.5;
  });

  y += 6;
  doc.text('Sincerely,', margin, y);
  y += 10;

  // Pen signature — enlarged for visibility, placed above the signer block
  if (signature) {
    const h = 22;
    const w = (signature.width / signature.height) * h;
    try { doc.addImage(signature.dataUrl, signature.format, margin, y, w, h); } catch { /* skip */ }
  }
  // Official seal — centered on the page near the signature
  if (seal) {
    const h = 26;
    const w = (seal.width / seal.height) * h;
    try { doc.addImage(seal.dataUrl, seal.format, (pageWidth - w) / 2, y - 4, w, h); } catch { /* skip */ }
  }
  y += 30;

  // Signer block
  doc.setFont('helvetica', 'bold');
  doc.text(signerName, margin, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(signerTitle, margin, y); y += 5;
  doc.text(`Vietnam Chapter. ${signerPhone}`, margin, y);

  // ── Footer on every page: logo + CONFIDENTIAL LETTER ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    if (logo) {
      const h = 9;
      const w = (logo.width / logo.height) * h;
      try { doc.addImage(logo.dataUrl, logo.format, (pageWidth - w) / 2, 278, w, h); } catch { /* skip */ }
    }
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('CONFIDENTIAL LETTER', pageWidth / 2, 292, { align: 'center' });
  }

  if (output === 'base64') {
    const dataUrl = doc.output('datauristring');
    return dataUrl.split(',')[1] || '';
  }
  const safeName = data.memberName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase();
  doc.save(`recommendation-letter-${safeName || 'member'}.pdf`);
}
