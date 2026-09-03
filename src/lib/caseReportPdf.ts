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

export function generateCaseReportPdf(report: CaseReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
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

  const field = (label: string, value: string | null | undefined, indent = 0) => {
    if (!value) return;
    ensureSpace(6);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(90, 90, 90);
    doc.text(`${label}:`, margin + indent, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.text(String(value), margin + indent + labelWidth, y);
    y += 5.5;
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
  doc.setFillColor(0, 135, 81);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('NIDO VIETNAM — OFFICIAL CASE REPORT', margin, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}   ·   Case ID: ${report.id}`, margin, 22);
  doc.text(`Status: ${STATUS_LABELS[report.status] || report.status}   ·   Type: ${CASE_LABELS[report.case_type] || report.case_type}`, margin, 28);
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

  // ── Evidence ──
  if (report.evidence_urls?.length > 0) {
    sectionTitle(`Evidence Files (${report.evidence_urls.length})`);
    report.evidence_urls.forEach((url, i) => {
      ensureSpace(6);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 90, 160);
      const lines = doc.splitTextToSize(`${i + 1}. ${url}`, contentWidth - 4);
      lines.forEach((line: string) => {
        ensureSpace(5);
        doc.text(line, margin + 2, y);
        y += 4.5;
      });
    });
  }

  // ── Notes ──
  sectionTitle('Administrative / Consular Notes');
  paragraph(report.admin_notes?.trim() ? report.admin_notes : 'No notes recorded for this case.');

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      'NIDO Vietnam — Nigerians in Diaspora Organization Vietnam · Confidential case document',
      margin,
      290
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
  }

  const safeTitle = report.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase();
  doc.save(`case-report-${safeTitle || report.id.slice(0, 8)}.pdf`);
}
