import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';

export interface CaseReportData {
  id: string;
  reporter_name: string;
  reporter_email?: string | null;
  reporter_phone?: string;
  reported_name: string;
  reported_email?: string;
  reported_phone?: string;
  reported_relationship: string;
  case_type: string;
  title: string;
  description: string;
  evidence_urls: string[];
  status: string;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
  is_anonymous?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  resolved: 'Resolved',
  closed: 'Closed',
};

const CASE_LABELS: Record<string, string> = {
  dispute: 'General Dispute', misconduct: 'Misconduct', fraud: 'Fraud / Financial Scam',
  harassment: 'Harassment / Bullying', impersonation: 'Impersonation', other: 'Other',
};

const NIDO_LOGO_URL = 'https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png';

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

export async function generateCaseReportPdf(report: CaseReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const LABEL_COL = 34; // fixed label column width (mm) so values never touch labels
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > 280) {
      doc.addPage();
      y = 20;
    }
  };

  const sectionTitle = (text: string) => {
    ensureSpace(14);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 135, 81); // NIDO green
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

  // ── Header ──
  const logo = await loadImage(NIDO_LOGO_URL);
  const textX = logo ? margin + 46 : margin;

  doc.setFillColor(0, 135, 81);
  doc.rect(0, 0, pageWidth, 34, 'F');

  // White badge with the NIDO Vietnam logo (logo is dark green, needs light background)
  if (logo) {
    const logoH = 14;
    const logoW = (logo.width / logo.height) * logoH;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 10, logoW + 6, 18, 2.5, 2.5, 'F');
    try {
      doc.addImage(logo.dataUrl, logo.format, margin + 3, 12, logoW, logoH);
    } catch { /* badge alone is fine */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('NIDO VIETNAM — OFFICIAL CASE REPORT', textX, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}   ·   Case ID: ${report.id}`, textX, 23);
  doc.text(`Status: ${STATUS_LABELS[report.status] || report.status}   ·   Type: ${CASE_LABELS[report.case_type] || report.case_type}`, textX, 29);
  y = 44;

  // ── Case Summary ──
  sectionTitle('Case Summary');
  field('Title', report.title);
  field('Case Type', CASE_LABELS[report.case_type] || report.case_type);
  field('Status', STATUS_LABELS[report.status] || report.status);
  field('Reported On', format(parseISO(report.created_at), 'dd MMM yyyy, HH:mm'));
  if (report.updated_at) field('Last Updated', format(parseISO(report.updated_at), 'dd MMM yyyy, HH:mm'));

  // ── Reporter ──
  sectionTitle('Reporter Information');
  if (report.is_anonymous) {
    paragraph('This report was submitted anonymously. Reporter identity is protected.');
  } else {
    field('Name', report.reporter_name);
    field('Email', report.reporter_email);
    field('Phone', report.reporter_phone);
  }

  // ── Reported Party ──
  sectionTitle('Reported Party');
  field('Name', report.reported_name);
  field('Email', report.reported_email);
  field('Phone', report.reported_phone);
  field('Relationship', report.reported_relationship);

  // ── Description ──
  sectionTitle('Detailed Description');
  paragraph(report.description);

  // ── Evidence (links + embedded images) ──
  if (report.evidence_urls?.length > 0) {
    sectionTitle(`Evidence Files (${report.evidence_urls.length})`);

    for (let i = 0; i < report.evidence_urls.length; i++) {
      const url = report.evidence_urls[i];

      // Link line
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 90, 160);
      const linkLines = doc.splitTextToSize(`${i + 1}. ${url}`, contentWidth);
      linkLines.forEach((line: string) => {
        ensureSpace(5);
        doc.text(line, margin, y);
        y += 4.5;
      });

      // Embedded image (when the file is an image that can be loaded)
      if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const img = await loadImage(url);
        if (img) {
          const maxW = contentWidth;
          const maxH = 90;
          const scale = Math.min(maxW / (img.width * 0.2646), maxH / (img.height * 0.2646), 1); // px → mm
          const wMm = img.width * 0.2646 * scale;
          const hMm = img.height * 0.2646 * scale;
          ensureSpace(hMm + 6);
          try {
            doc.addImage(img.dataUrl, img.format, margin, y, wMm, hMm);
            y += hMm + 4;
          } catch {
            // If embedding fails, the link above is already present
          }
        }
      }
      y += 2;
    }
  }

  // ── Notes ──
  sectionTitle('Administrative / Consular Notes');
  paragraph(report.admin_notes?.trim() ? report.admin_notes : 'No notes recorded for this case.');

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
      } catch { /* skip logo in footer */ }
    }
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      'NIDO Vietnam — Nigerians in Diaspora Organization Vietnam · Confidential case document',
      footerTextX,
      290
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
  }

  const safeTitle = report.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase();
  doc.save(`case-report-${safeTitle || report.id.slice(0, 8)}.pdf`);
}
