import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import type { CaseReportData } from './caseReportPdf';

const NIDO_LOGO_URL = 'https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png';

const CASE_LABELS: Record<string, string> = {
  dispute: 'General Dispute', misconduct: 'Misconduct', fraud: 'Fraud / Financial Scam',
  harassment: 'Harassment / Bullying', impersonation: 'Impersonation', other: 'Other',
};

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

/** Default cover note addressed to the reported party (editable before sending). */
export function buildCoverNote(report: CaseReportData): string {
  const reporter = report.is_anonymous ? 'a member of the community (identity protected)' : report.reporter_name;
  const caseLabel = CASE_LABELS[report.case_type] || report.case_type;
  const evidenceCount = report.evidence_urls?.length || 0;
  return `Dear ${report.reported_name},

We are contacting you regarding an official case report submitted to NIDO Vietnam by ${reporter} concerning "${report.title}" (${caseLabel}).

NIDO Vietnam has received and reviewed the report, which has now been officially recorded under our case management system. The report identifies you as the reported party in this matter.

Report summary:
"${report.description}"

This matter has been officially reported to NIDO Vietnam and the Embassy of the Federal Republic of Nigeria in Vietnam for review and guidance.

At this stage, our priority is to provide an opportunity for both parties to discuss the matter directly and reach a reasonable resolution without further escalation. Therefore, we respectfully request your availability for an urgent meeting with NIDO Vietnam to clarify the situation and work towards resolving this matter.

Please note that if this matter cannot be resolved through dialogue and mutual agreement, the next step will be to proceed with seeking further assistance from the Nigerian Embassy in Vietnam and relevant local authorities in Vietnam for appropriate guidance and action.${evidenceCount > 0 ? `

Please find attached the official case notice together with ${evidenceCount} evidence file(s) submitted with this report.` : ''}

We kindly request your response and availability for a meeting at your earliest convenience due to the urgency of this matter.

Thank you for your cooperation. We look forward to receiving your response and working towards a fair resolution.

Sincerely,
NIDO Vietnam
Nigerians in Diaspora Organization Vietnam
info@nidovietnam.com · +84326189705`;
}

/** Generate the official case-notice PDF (cover letter + case summary + evidence) with the NIDO logo. */
export async function generateCasePresentationPdf(
  report: CaseReportData,
  coverNote: string,
  output: 'save' | 'base64' = 'save'
): Promise<string | void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const LABEL_COL = 34;
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

  const paragraph = (text: string, indent = 0) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    text.split('\n').forEach(para => {
      if (!para.trim()) {
        y += 3;
        return;
      }
      const lines = doc.splitTextToSize(para, contentWidth - indent);
      lines.forEach((line: string) => {
        ensureSpace(6);
        doc.text(line, margin + indent, y);
        y += 5;
      });
      y += 1;
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
    try {
      doc.addImage(logo.dataUrl, logo.format, margin + 3, 12, logoW, logoH);
    } catch { /* badge alone is fine */ }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('NIDO VIETNAM — OFFICIAL NOTICE', textX, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Notice to Reported Party · Case ID: ${report.id}`, textX, 23);
  doc.text(`Issued: ${format(new Date(), 'dd MMM yyyy')}   ·   Report Filed: ${format(parseISO(report.created_at), 'dd MMM yyyy')}`, textX, 29);
  y = 44;

  // ── Cover letter ──
  sectionTitle('Cover Letter');
  paragraph(coverNote);

  // ── Case summary ──
  sectionTitle('Case Summary');
  field('Title', report.title);
  field('Case Type', CASE_LABELS[report.case_type] || report.case_type);
  field('Reported Party', report.reported_name);
  field('Reported On', format(parseISO(report.created_at), 'dd MMM yyyy, HH:mm'));

  // ── Evidence ──
  if (report.evidence_urls?.length > 0) {
    sectionTitle(`Evidence Files (${report.evidence_urls.length})`);
    for (let i = 0; i < report.evidence_urls.length; i++) {
      const url = report.evidence_urls[i];
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 90, 160);
      const linkLines = doc.splitTextToSize(`${i + 1}. ${url}`, contentWidth);
      linkLines.forEach((line: string) => {
        ensureSpace(5);
        doc.text(line, margin, y);
        y += 4.5;
      });

      if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const img = await loadImage(url);
        if (img) {
          const maxW = contentWidth;
          const maxH = 90;
          const scale = Math.min(maxW / (img.width * 0.2646), maxH / (img.height * 0.2646), 1);
          const wMm = img.width * 0.2646 * scale;
          const hMm = img.height * 0.2646 * scale;
          ensureSpace(hMm + 6);
          try {
            doc.addImage(img.dataUrl, img.format, margin, y, wMm, hMm);
            y += hMm + 4;
          } catch { /* link above is the fallback */ }
        }
      }
      y += 2;
    }
  }

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
    doc.text('NIDO Vietnam — Nigerians in Diaspora Organization Vietnam · Official case notice', footerTextX, 290);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
  }

  if (output === 'base64') {
    const dataUrl = doc.output('datauristring');
    return dataUrl.split(',')[1] || '';
  }

  const safeName = report.reported_name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 30).toLowerCase();
  doc.save(`case-notice-${safeName || report.id.slice(0, 8)}.pdf`);
}
