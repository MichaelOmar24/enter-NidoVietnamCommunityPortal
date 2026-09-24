import { Clock, Eye, Search, Landmark, CheckCircle, XCircle, type LucideIcon } from 'lucide-react';

/**
 * A member's request for information about a Nigerian who has disappeared,
 * lost contact, or may be detained/arrested/in custody in Vietnam.
 * Deliberately separate from case_reports — no opposing party, different data.
 */
export interface MissingPersonRequest {
  id: string;
  requester_user_id?: string | null;
  requester_name: string;
  requester_email: string;
  requester_phone?: string | null;
  requester_relationship: string;
  requester_country: string;
  requester_location: string;
  missing_full_name: string;
  missing_aliases?: string | null;
  missing_gender?: string | null;
  missing_date_of_birth?: string | null;
  missing_age?: number | null;
  missing_nigerian_state_of_origin?: string | null;
  missing_passport_number?: string | null;
  missing_phone?: string | null;
  missing_email?: string | null;
  missing_last_known_address?: string | null;
  missing_vietnam_city?: string | null;
  missing_employer?: string | null;
  last_contact_date?: string | null;
  last_contact_details?: string | null;
  request_type: string;
  incident_date?: string | null;
  custody_details?: string | null;
  circumstances: string;
  prior_actions?: string | null;
  assistance_requested: string;
  consent_to_share: boolean;
  evidence_urls: string[];
  status: string;
  admin_notes?: string | null;
  embassy_forwarded_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export const REQUEST_TYPES = [
  { value: 'disappeared', label: 'Has disappeared', desc: 'The person has gone missing and cannot be found.' },
  { value: 'lost_contact', label: 'Has lost contact with family or friends', desc: 'Communication stopped unexpectedly.' },
  { value: 'detained_or_arrested', label: 'May have been detained or arrested', desc: 'Detention or arrest is suspected.' },
  { value: 'taken_to_prison', label: 'May have been taken to prison', desc: 'The person may be serving or awaiting custody.' },
  { value: 'believed_in_custody', label: 'Is believed to be in custody', desc: 'Held by an authority, whereabouts uncertain.' },
  { value: 'whereabouts_verification', label: 'Whereabouts need to be verified', desc: 'You need NIDO to confirm where the person is.' },
];

/** Request types where custody/detention details are relevant. */
export const CUSTODY_TYPES = ['detained_or_arrested', 'taken_to_prison', 'believed_in_custody'];

export const RELATIONSHIPS = [
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Brother / Sister' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'relative', label: 'Other relative' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague / Employer' },
  { value: 'community', label: 'Community member / NIDO official' },
  { value: 'other', label: 'Other' },
];

export const ASSISTANCE_OPTIONS = [
  { value: 'verify_only', label: 'Verify the information only', desc: 'NIDO checks what is available and reports back to you.' },
  { value: 'follow_up_embassy', label: 'Verify and follow up with the Nigerian Embassy', desc: 'NIDO also raises it with the Embassy / Consular authority in Vietnam.' },
  { value: 'both', label: 'Verify, follow up with the Embassy, and keep me updated', desc: 'Full follow-up, with updates to you as things progress.' },
];

export const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: LucideIcon }> = {
  pending: { label: 'Pending Review', classes: 'bg-gold/20 text-gold border-gold/30', icon: Clock },
  under_review: { label: 'Under Review', classes: 'bg-primary/10 text-primary border-primary/30', icon: Eye },
  verifying: { label: 'Verifying Information', classes: 'bg-primary/15 text-primary border-primary/40', icon: Search },
  forwarded_to_embassy: { label: 'Forwarded to Embassy', classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/30', icon: Landmark },
  information_provided: { label: 'Information Provided', classes: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-300/40', icon: CheckCircle },
  closed: { label: 'Closed', classes: 'bg-muted text-muted-foreground border-border', icon: XCircle },
};

/** Statuses that still need NIDO's attention. */
export const ACTIVE_STATUSES = ['pending', 'under_review', 'verifying'];

export function requestTypeLabel(value: string): string {
  return REQUEST_TYPES.find(t => t.value === value)?.label || value;
}

export function relationshipLabel(value: string): string {
  return RELATIONSHIPS.find(r => r.value === value)?.label || value;
}

export function assistanceLabel(value: string): string {
  return ASSISTANCE_OPTIONS.find(a => a.value === value)?.label || value;
}

export function needsConsent(value: string): boolean {
  return value === 'follow_up_embassy' || value === 'both';
}

/** Short human reference shown to the requester, e.g. NIDO-MP-4K7Q2. */
export function formatReference(id: string): string {
  return `NIDO-MP-${id.replace(/-/g, '').slice(0, 5).toUpperCase()}`;
}
