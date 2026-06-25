import { useState } from 'react';
import {
  X, Mail, Phone, Briefcase, Building2, Trash2, Pencil, Check,
  Sparkles, AlertTriangle, TrendingUp, Loader2,
} from 'lucide-react';
import { useContact, useUpdateContact, useDeleteContact } from '../../hooks/useContacts';
import { aggregateTrust, buildMeta } from '../../lib/trust';
import { initials } from '../../lib/utils';
import { TrustBadge } from '../trust/TrustBadge';
import { LeadScoreBadge } from '../trust/LeadScoreBadge';
import { ConsentCard } from '../trust/ConsentCard';
import { ConsentManageModal } from './ConsentManageModal';
import { FieldTrustRow } from '../trust/FieldTrustRow';
import { ActivityTimeline } from '../activities/ActivityTimeline';
import type { Contact } from '../../types/crm';

interface Props {
  contactId: string;
  onClose: () => void;
}

export function ContactDetailDrawer({ contactId, onClose }: Props) {
  const { data: contact, isLoading } = useContact(contactId);
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Contact>>({});
  const [showConsent, setShowConsent] = useState(false);

  const startEdit = () => {
    if (!contact) return;
    setForm({
      first_name: contact.first_name, last_name: contact.last_name,
      email: contact.email, phone: contact.phone, job_title: contact.job_title,
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!contact) return;
    // Ogni campo modificato dall'utente ridiventa "user" trust = massima fiducia, fresca
    const field_trust = { ...contact.field_trust };
    (['email', 'phone', 'job_title'] as const).forEach((k) => {
      if (form[k] !== undefined && form[k] !== contact[k]) field_trust[k] = buildMeta('user');
    });
    await updateContact.mutateAsync({ id: contact.id, patch: { ...form, field_trust } });
    setEditing(false);
  };

  const onDelete = async () => {
    if (!contact) return;
    if (!confirm(`Eliminare ${contact.first_name} ${contact.last_name}?`)) return;
    await deleteContact.mutateAsync(contact.id);
    onClose();
  };

  const agg = contact ? aggregateTrust(contact.field_trust) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-surface-900 h-full overflow-y-auto
                   shadow-2xl border-l border-surface-200 dark:border-surface-700"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading || !contact ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-brand-500" size={28} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-surface-900 border-b border-surface-200
                            dark:border-surface-700 px-5 py-4 z-10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center
                                  text-white text-base font-semibold">
                    {initials(contact.first_name, contact.last_name)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">
                      {contact.first_name} {contact.last_name}
                    </h2>
                    {contact.job_title && (
                      <p className="text-sm text-surface-500">{contact.job_title}</p>
                    )}
                  </div>
                </div>
                <button onClick={onClose} className="text-surface-400 hover:text-surface-600 p-1">
                  <X size={18} />
                </button>
              </div>

              {/* Aggregate trust + actions */}
              <div className="flex items-center justify-between mt-3">
                {agg && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-400">Affidabilità dati:</span>
                    <TrustBadge trust={agg} showAge />
                  </div>
                )}
                <div className="flex gap-1">
                  {editing ? (
                    <button
                      onClick={saveEdit}
                      disabled={updateContact.isPending}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-brand-600 hover:bg-brand-700
                                 text-white rounded-md transition-colors disabled:opacity-60"
                    >
                      {updateContact.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Salva
                    </button>
                  ) : (
                    <button
                      onClick={startEdit}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-surface-600 dark:text-surface-400
                                 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-md transition-colors"
                    >
                      <Pencil size={12} /> Modifica
                    </button>
                  )}
                  <button
                    onClick={onDelete}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-risk-high
                               hover:bg-risk-high/10 rounded-md transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Churn risk alert */}
              {contact.churn_risk && contact.churn_risk.score > 0.5 && (
                <div className="bg-risk-high/10 border border-risk-high/20 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-risk-high text-sm font-medium mb-1">
                    <AlertTriangle size={14} />
                    Rischio churn {Math.round(contact.churn_risk.score * 100)}%
                  </div>
                  <ul className="text-xs text-surface-600 dark:text-surface-400 list-disc list-inside space-y-0.5">
                    {contact.churn_risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {/* AI summary */}
              {contact.ai_summary && (
                <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 text-xs font-medium mb-1">
                    <Sparkles size={13} /> Sintesi AI
                  </div>
                  <p className="text-sm text-surface-700 dark:text-surface-300">{contact.ai_summary}</p>
                </div>
              )}

              {/* Fields (with trust badges) */}
              <div>
                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">Dati di contatto</h3>
                {editing ? (
                  <div className="space-y-2">
                    {(['email', 'phone', 'job_title'] as const).map((k) => (
                      <input
                        key={k}
                        value={(form[k] as string) ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                        placeholder={k}
                        className="auth-input"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg px-3">
                    <FieldTrustRow icon={<Mail size={14} />} label="Email" value={contact.email}
                                   fieldKey="email" meta={contact.field_trust.email} />
                    <FieldTrustRow icon={<Phone size={14} />} label="Telefono" value={contact.phone}
                                   fieldKey="phone" meta={contact.field_trust.phone} />
                    <FieldTrustRow icon={<Briefcase size={14} />} label="Ruolo" value={contact.job_title}
                                   fieldKey="job_title" meta={contact.field_trust.job_title} />
                    <FieldTrustRow icon={<Building2 size={14} />} label="Azienda" value={contact.company?.name} />
                  </div>
                )}
              </div>

              {/* Quantum Lead Score (sales-readiness pesato per il Trust) */}
              <LeadScoreBadge contact={contact} variant="full" />

              {/* Privacy & Consenso (GDPR) */}
              <ConsentCard contact={contact} onManage={() => setShowConsent(true)} />

              {/* Engagement */}
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Email aperte" value={contact.email_opens} />
                <Stat label="Click" value={contact.email_clicks} />
                <Stat label="Form inviati" value={contact.form_submissions} />
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <TrendingUp size={12} /> Attività
                </h3>
                <ActivityTimeline contactId={contact.id} />
              </div>
            </div>
          </>
        )}
      </div>

      {showConsent && contact && (
        <ConsentManageModal contact={contact} onClose={() => setShowConsent(false)} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-50 dark:bg-surface-800/50 rounded-lg p-2.5 text-center">
      <p className="text-lg font-bold text-surface-900 dark:text-surface-100">{value}</p>
      <p className="text-[10px] text-surface-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}
