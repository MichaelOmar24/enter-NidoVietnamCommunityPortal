import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Search, User, Users, MapPin, FileText, Eye, Landmark, Loader2, Trash2,
  CheckCircle, XCircle, Clock, Mail, Phone, ShieldAlert, Paperclip, Lock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  STATUS_CONFIG, ACTIVE_STATUSES, CUSTODY_TYPES,
  requestTypeLabel, relationshipLabel, assistanceLabel, formatReference,
  type MissingPersonRequest,
} from '@/lib/missingPerson';

interface Props {
  /** Admins can forward a request to the Nigerian Embassy / Consular authority. */
  canForward?: boolean;
  /** Admins can permanently delete a request. */
  canDelete?: boolean;
}

type Filter = 'active' | 'forwarded_to_embassy' | 'information_provided' | 'closed';

const NEXT_STATUSES = ['under_review', 'verifying', 'information_provided', 'closed'];

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground break-words">{value === null || value === undefined || value === '' ? '—' : value}</p>
    </div>
  );
}

export function MissingPersonRequestsPanel({ canForward = false, canDelete = false }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<MissingPersonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [selected, setSelected] = useState<MissingPersonRequest | null>(null);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('missing_person_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests((data || []) as MissingPersonRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const countFor = (f: Filter) =>
    f === 'active'
      ? requests.filter(r => ACTIVE_STATUSES.includes(r.status)).length
      : requests.filter(r => r.status === f).length;

  const filtered = requests.filter(r =>
    filter === 'active' ? ACTIVE_STATUSES.includes(r.status) : r.status === filter
  );

  const updateRequest = async (row: MissingPersonRequest, status: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from('missing_person_requests')
      .update({
        status,
        admin_notes: note || null,
        reviewed_by: profile?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    setUpdating(false);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Request marked as ${STATUS_CONFIG[status]?.label || status}` });
    setSelected(null);
    setNote('');
    load();
  };

  const forwardToEmbassy = async (row: MissingPersonRequest) => {
    if (!row.consent_to_share) {
      const proceed = confirm(
        'This requester has NOT consented to their details being shared with the Embassy.\n\nForward anyway?'
      );
      if (!proceed) return;
    } else if (!confirm('Forward this request to the Nigerian Embassy / Consular authority (contact-us@nigeriaembassy.org.vn)?')) {
      return;
    }

    setForwarding(true);
    const { data, error } = await supabase.functions.invoke('notify-embassy-case', {
      body: { missing_person_request_id: row.id, force: true },
    });
    setForwarding(false);
    if (error || data?.error) {
      toast({ title: 'Failed to send', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    await supabase
      .from('missing_person_requests')
      .update({ status: 'forwarded_to_embassy', embassy_forwarded_at: new Date().toISOString() })
      .eq('id', row.id);
    toast({ title: 'Forwarded to Embassy', description: 'A copy of this request was emailed to the Nigerian Embassy.' });
    setSelected(null);
    setNote('');
    load();
  };

  const deleteRequest = async (row: MissingPersonRequest) => {
    if (!confirm(`Permanently delete the request for "${row.missing_full_name}"?\n\nThis removes it from the system completely and cannot be undone.`)) return;
    setUpdating(true);
    const { error } = await supabase.from('missing_person_requests').delete().eq('id', row.id);
    setUpdating(false);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Request deleted' });
    setSelected(null);
    setNote('');
    load();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'active', label: 'Active' },
          { key: 'forwarded_to_embassy', label: 'Forwarded to Embassy' },
          { key: 'information_provided', label: 'Information Provided' },
          { key: 'closed', label: 'Closed' },
        ] as { key: Filter; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === t.key ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {t.label} ({countFor(t.key)})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="animate-pulse h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Search className="h-16 w-16 mx-auto mb-3 opacity-30" />
          <p>{requests.length === 0 ? 'No missing person requests submitted yet.' : 'Nothing in this list.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            const SIcon = s.icon;
            return (
              <Card key={r.id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Search className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-bold text-foreground">{r.missing_full_name}</p>
                        <Badge className={`text-[10px] border gap-1 ${s.classes}`}>
                          <SIcon className="h-2.5 w-2.5" /> {s.label}
                        </Badge>
                        <Badge className="text-[10px] border bg-muted text-muted-foreground">
                          {requestTypeLabel(r.request_type)}
                        </Badge>
                        {r.consent_to_share ? (
                          <Badge className="text-[10px] border bg-green-500/10 text-green-700 dark:text-green-400 border-green-400/30">
                            Consent to share
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] border bg-muted text-muted-foreground gap-1">
                            <Lock className="h-2.5 w-2.5" /> No consent
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Requested by <span className="font-medium text-foreground">{r.requester_name}</span>
                        {' ('}{relationshipLabel(r.requester_relationship)}{') · '}
                        <span className="font-medium text-foreground">{r.requester_location}</span>
                        {' · '}{format(parseISO(r.created_at), 'dd MMM yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.circumstances}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span className="font-mono">{formatReference(r.id)}</span>
                        {r.evidence_urls?.length > 0 && (
                          <span className="text-primary flex items-center gap-1">
                            <FileText className="h-3 w-3" /> {r.evidence_urls.length} file{r.evidence_urls.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {r.embassy_forwarded_at && (
                          <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Landmark className="h-3 w-3" /> Embassy {format(parseISO(r.embassy_forwarded_at), 'dd MMM yyyy')}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelected(r); setNote(r.admin_notes || ''); }}
                        className="gap-1 text-xs text-primary border-primary hover:bg-primary/10"
                      >
                        <Eye className="h-3 w-3" /> Review
                      </Button>
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteRequest(r)}
                          disabled={updating}
                          title="Delete permanently"
                          className="gap-1 text-xs text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setNote(''); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              {selected?.missing_full_name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                    <User className="h-3 w-3" /> Requester
                  </p>
                  <p className="text-sm font-semibold text-foreground">{selected.requester_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{selected.requester_email}</p>
                  {selected.requester_phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{selected.requester_phone}</p>}
                  <p className="text-xs text-muted-foreground">{relationshipLabel(selected.requester_relationship)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{selected.requester_location} ({selected.requester_country})</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Situation
                  </p>
                  <p className="text-sm font-semibold text-foreground">{requestTypeLabel(selected.request_type)}</p>
                  <p className="text-xs text-muted-foreground">Help requested: {assistanceLabel(selected.assistance_requested)}</p>
                  <p className="text-xs text-muted-foreground">
                    Consent to share with Embassy: {selected.consent_to_share ? 'Yes' : 'No'}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">{formatReference(selected.id)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Other names / aliases" value={selected.missing_aliases} />
                <Field label="Gender" value={selected.missing_gender} />
                <Field label="Date of birth" value={selected.missing_date_of_birth ? format(parseISO(selected.missing_date_of_birth), 'dd MMM yyyy') : null} />
                <Field label="Approximate age" value={selected.missing_age} />
                <Field label="State of origin" value={selected.missing_nigerian_state_of_origin} />
                <Field label="Passport number" value={selected.missing_passport_number} />
                <Field label="Their phone" value={selected.missing_phone} />
                <Field label="Their email" value={selected.missing_email} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Last known address in Vietnam" value={selected.missing_last_known_address} />
                <Field label="City in Vietnam" value={selected.missing_vietnam_city} />
                <Field label="Employer / institution" value={selected.missing_employer} />
                <Field
                  label="Last contact"
                  value={selected.last_contact_date ? format(parseISO(selected.last_contact_date), 'dd MMM yyyy') : null}
                />
                <Field label="How last contact happened" value={selected.last_contact_details} />
                <Field
                  label="Date last seen / heard from"
                  value={selected.incident_date ? format(parseISO(selected.incident_date), 'dd MMM yyyy') : null}
                />
              </div>

              {CUSTODY_TYPES.includes(selected.request_type) && selected.custody_details && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Landmark className="h-3 w-3" /> Detention / custody details
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 rounded-lg p-3 border border-border">
                    {selected.custody_details}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detailed account</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 rounded-lg p-3 border border-border">
                  {selected.circumstances}
                </p>
              </div>

              {selected.prior_actions && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Steps already taken</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 rounded-lg p-3 border border-border">
                    {selected.prior_actions}
                  </p>
                </div>
              )}

              {selected.evidence_urls?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> Supporting documents
                  </p>
                  <ul className="space-y-1">
                    {selected.evidence_urls.map((u, i) => (
                      <li key={i}>
                        <a href={u} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all">
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm">Internal notes</Label>
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  className="text-sm"
                  placeholder="Verification steps, findings, who you spoke to... (not visible to the requester)"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Update status</p>
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUSES.map(st => (
                    <Button
                      key={st}
                      size="sm"
                      variant="outline"
                      disabled={updating || selected.status === st}
                      onClick={() => updateRequest(selected, st)}
                      className="text-xs gap-1"
                    >
                      {st === 'under_review' && <Clock className="h-3 w-3" />}
                      {st === 'verifying' && <Search className="h-3 w-3" />}
                      {st === 'information_provided' && <CheckCircle className="h-3 w-3" />}
                      {st === 'closed' && <XCircle className="h-3 w-3" />}
                      {STATUS_CONFIG[st]?.label || st}
                    </Button>
                  ))}
                </div>
              </div>

              {canForward && (
                <Button
                  onClick={() => forwardToEmbassy(selected)}
                  disabled={forwarding}
                  className="w-full gradient-primary text-primary-foreground gap-2"
                >
                  {forwarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                  {forwarding ? 'Sending to Embassy...' : 'Forward to Nigerian Embassy / Consular Authority'}
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="outline"
                  onClick={() => deleteRequest(selected)}
                  disabled={updating}
                  className="w-full gap-2 text-destructive border-destructive/50 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" /> Delete request permanently
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
