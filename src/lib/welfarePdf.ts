import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';

const NIDO_LOGO_URL = 'https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png';

export interface WelfareRequestData {
  id: string;
  support_type: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  admin_notes?: string;
  created_at: string;
  memberName: string;
  memberEmail?: string;
  memberCity?: string;
}

const TYPE_LABELS: Record<string, string> = {
  medical: 'Medical Support', housing: 'Housing Support', accident: 'Accident Support',
  financial_hardship: 'Financial Hardship', emergency_relief: 'Emergency Relief',
  employer_resolution: 'Employer Resolution', immigration: 'Immigration Support',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', under_review: 'Under Review', approved: 'Approved', rejected: 'Rejected',
};

interface LoadedImage { dataUrl: string; width: number; height: number; format: 'PNG' | 'JPEG' | 'WEBP' }

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
    const fmt: LoadedImage['format'] = type.includes('png') ? 'PNG' : type.includes('webp') ? 'WEBP' : 'JPEG';
    return { dataUrl, ...dims, format: fmt };
  } catch {
    return null;
  }
}

/** Generate the official welfare request document (PDF) with NIDO branding. */
export async function generateWelfareRequestPdf(req: WelfareRequestData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const LABEL_COL = 34;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > 280) { doc.addPage(); y = 20; }
  };

  const sectionTitle = (text: string) => {
    ensureSpace(14);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 135, 81);
    doc.text(text.toUpperCase(), margin, y);
    y += 2;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const field = (label: string, value: string | null | undefined) => {
    if (!value) return;
    doc.setFontSize(10);
    const valueLines = doc.splitTextToSize(String(value), contentWidth - LABEL_COL);
    ensureSpace(6 * valueLines.length);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 90, 90);
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(valueLines, margin + LABEL_COL, y);
    y += 5.5 * valueLines.length;
  };

  const paragraph = (text: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(text, contentWidth);
    lines.forEach((line: string) => {
      ensureSpace(6);
      doc.text(line, margin, y);
      y += 5;
    });
  };

  // ── Header with logo ──
  const logo = await loadImage(NIDO_LOGO_URL);
  const textX = logo ? margin + 46 : margin;

  doc.setFillColor(0, 135, 81);
  doc.rect(0, 0, pageWidth, 34, 'F');
  if (logo) {
    const logoH = 14;
    const logoW = (logo.width / logo.height) * logoH;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 10, logoW + 6, 18, 2.5, 2.5, 'F');
    try { doc.addImage(logo.dataUrl, logo.format, margin + 3, 12, logoW, logoH); } catch { /* skip */ }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('NIDO VIETNAM — WELFARE SUPPORT REQUEST', textX, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}   ·   Request ID: ${req.id}`, textX, 23);
  doc.text(`Status: ${STATUS_LABELS[req.status] || req.status}   ·   Type: ${TYPE_LABELS[req.support_type] || req.support_type}   ·   Urgency: ${req.urgency}`, textX, 29);
  y = 44;

  // ── Summary ──
  sectionTitle('Request Summary');
  field('Title', req.title);
  field('Support Type', TYPE_LABELS[req.support_type] || req.support_type);
  field('Urgency', req.urgency);
  field('Status', STATUS_LABELS[req.status] || req.status);
  field('Submitted On', format(parseISO(req.created_at), 'dd MMM yyyy, HH:mm'));

  // ── Member ──
  sectionTitle('Member Information');
  field('Name', req.memberName);
  field('Email', req.memberEmail);
  field('City in Vietnam', req.memberCity);

  // ── Details ──
  sectionTitle('Request Details');
  paragraph(req.description);

  // ── Admin notes ──
  sectionTitle('Administrative Notes');
  paragraph(req.admin_notes?.trim() ? req.admin_notes : 'No notes recorded for this request.');

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    let footerTextX = margin;
    if (logo) {
      const fh = 6;
      const fw = (logo.width / logo.height) * fh;
      try {
        doc.addImage(logo.dataUrl, logo.format, margin, 285.5, fw, fh);
        footerTextX = margin + fw + 3;
      } catch { /* skip */ }
    }
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('NIDO Vietnam — Nigerians in Diaspora Organization Vietnam · Confidential welfare document', footerTextX, 290);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
  }

  const safeTitle = req.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase();
  doc.save(`welfare-request-${safeTitle || req.id.slice(0, 8)}.pdf`);
}
