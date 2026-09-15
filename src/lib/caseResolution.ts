import { format, parseISO } from 'date-fns';
import type { CaseReportData } from './caseReportPdf';

/** Resolution feedback letter addressed to BOTH parties (editable before sending). */
export function buildResolutionLetter(report: CaseReportData, resolutionNote?: string): string {
  const reporter = report.is_anonymous ? 'the Reporter (identity protected)' : report.reporter_name;
  const filed = format(parseISO(report.created_at), 'dd MMM yyyy');
  return `Dear ${reporter} and ${report.reported_name},

RE: Official Resolution of Case — "${report.title}"

This letter is to formally inform all parties that the above-referenced case, reported to NIDO Vietnam on ${filed}, has been fully reviewed and RESOLVED.

Case summary:
"${report.description}"

Resolution reached:
${resolutionNote?.trim() || 'Both parties were engaged by NIDO Vietnam and the matter has been settled to the satisfaction of all parties involved.'}

All evidence files submitted with this report are attached to this notice (embedded in the official resolution document) for the records of both parties.

This case is hereby marked RESOLVED and CLOSED in the NIDO Vietnam case management system, and the Embassy of the Federal Republic of Nigeria in Vietnam has been duly informed of the resolution.

Thank you for your cooperation in reaching a fair and peaceful resolution.

Sincerely,
NIDO Vietnam
Nigerians in Diaspora Organization Vietnam
info@nidovietnam.com · +84326189705`;
}
