import { useState } from 'react';
import { X, Mail, Copy, Check, Send } from 'lucide-react';
import { useTeamStore } from '../../store/teamStore';
import { logAudit } from '../../lib/audit';
import { ROLE_META, ALL_ROLES } from '../../lib/permissions';
import type { TeamRole, TeamMember } from '../../types/team';

interface Props { onClose: () => void; }

export function InviteUserModal({ onClose }: Props) {
  const invite = useTeamStore((s) => s.invite);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role: 'commerciale' as TeamRole });
  const [created, setCreated] = useState<TeamMember | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteLink = created
    ? `${window.location.origin}/invite/${created.invite_token}`
    : '';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const member = invite(form);
    logAudit('invite', 'member', `${member.first_name} ${member.last_name}`, { role: member.role });
    setCreated(member);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-surface-900 rounded-xl shadow-2xl border
                      border-surface-200 dark:border-surface-700 w-full max-w-md p-6"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">
            {created ? 'Invito creato' : 'Invita un membro'}
          </h2>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
        </div>

        {!created ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Nome *</label>
                <input required value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className="auth-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Cognome *</label>
                <input required value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className="auth-input" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="dipendente@azienda.it" className="auth-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Ruolo *</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as TeamRole }))} className="auth-input">
                {ALL_ROLES.filter((r) => r !== 'superadmin').map((r) => (
                  <option key={r} value={r}>{ROLE_META[r].label} — {ROLE_META[r].desc}</option>
                ))}
              </select>
              <p className="text-[11px] text-surface-400 mt-1">{ROLE_META[form.role].desc}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
                Annulla
              </button>
              <button type="submit"
                className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium">
                <Send size={14} /> Invia invito
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-trust-high/10 rounded-lg p-3">
              <Mail size={18} className="text-trust-high mt-0.5 shrink-0" />
              <p className="text-sm text-surface-700 dark:text-surface-300">
                Email di invito inviata a <strong>{created.email}</strong>. In modalità demo l'email è simulata:
                copia il link qui sotto e aprilo per completare la registrazione.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Link di invito</label>
              <div className="flex gap-2">
                <input readOnly value={inviteLink}
                  className="auth-input text-xs font-mono" onFocus={(e) => e.target.select()} />
                <button onClick={copyLink}
                  className="shrink-0 flex items-center gap-1 px-3 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <button onClick={onClose}
              className="w-full py-2 text-sm bg-surface-100 dark:bg-surface-800 hover:bg-surface-200
                         dark:hover:bg-surface-700 rounded-lg transition-colors text-surface-700 dark:text-surface-200">
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
