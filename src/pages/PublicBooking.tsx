import { useState, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, CheckCircle, AlertCircle, ArrowLeft, CalendarPlus, User, Mail, MessageSquare } from 'lucide-react';
import { useTeamStore } from '../store/teamStore';
import { useOrgSettingsStore } from '../store/orgSettingsStore';
import { useBookingStore } from '../store/bookingStore';
import { useRemindersStore } from '../store/remindersStore';
import { generateSlots } from '../lib/slots';
import { openGoogleCalendar } from '../lib/googleCalendar';
import { repo } from '../lib/repo';
import { buildConsent, CONSENT_LABELS } from '../lib/consent';

const MEETING_TYPES = [
  { id: 'discovery', label: 'Discovery Call (15 min)', duration: 15 },
  { id: 'demo', label: 'Demo Prodotto (30 min)', duration: 30 },
  { id: 'onboarding', label: 'Onboarding (60 min)', duration: 60 }
];

export default function PublicBooking() {
  const { memberId, teamId } = useParams<{ memberId?: string; teamId?: string }>();
  const allMembers = useTeamStore((s) => s.members);
  
  // Se c'è un teamId, prendiamo i membri attivi del team (per ora simuliamo che tutti i membri attivi con ruolo commerciale siano il team).
  const teamMembers = useMemo(() => {
    if (!teamId) return [];
    return allMembers.filter(m => m.status === 'active' && m.role === 'commerciale');
  }, [allMembers, teamId]);

  // Round-Robin: scegliamo un membro casuale o il primo disponibile tra quelli del team
  const member = useMemo(() => {
    if (memberId) return allMembers.find((m) => m.id === memberId);
    if (teamMembers.length > 0) return teamMembers[Math.floor(Math.random() * teamMembers.length)];
    return undefined;
  }, [memberId, teamMembers, allMembers]);

  const business = useOrgSettingsStore((s) => s.business_hours);
  const companyName = useOrgSettingsStore((s) => s.company_name);
  const { add: addBooking, bookedSlots } = useBookingStore(
    useShallow((s) => ({ add: s.add, bookedSlots: s.bookedSlots }))
  );
  const addReminder = useRemindersStore((s) => s.add);

  const [meetingType, setMeetingType] = useState(MEETING_TYPES[1]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ iso: string } | null>(null);

  const days = useMemo(
    () => (member ? generateSlots(business, bookedSlots(member.id), 14, meetingType.duration) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [member?.id, business, confirmed, meetingType]
  );

  if (!member || member.status !== 'active') {
    return (
      <div className="min-h-screen bg-surface-100 dark:bg-surface-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 text-center max-w-sm shadow-xl">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Agenda non disponibile</h2>
          <p className="text-xs text-surface-550 dark:text-surface-450 mt-1 mb-4">Il link di prenotazione non è valido o è stato disattivato.</p>
          <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold bg-brand-600 text-white px-4 py-2 rounded-lg">Vai alla home</Link>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!selected || !name.trim() || !email.trim()) {
      setError('Compila nome, email e seleziona uno slot.');
      return;
    }
    if (!acceptPrivacy) {
      setError('Per prenotare devi accettare l\'informativa privacy.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [first, ...rest] = name.trim().split(' ');
      const contact = await repo.createContact({
        first_name: first,
        last_name: rest.join(' ') || '—',
        email: email.trim(),
        lead_status: 'new',
        lifecycle_stage: 'lead',
        tags: ['Booking', `Agenda ${member.first_name}`],
        field_trust: { email: { source: 'user', confidence: 1, updatedAt: new Date().toISOString() } },
        consent: buildConsent({ marketing: false, profiling: false, channels: [], source: 'booking', source_ref: member.id }),
      });

      const start = new Date(selected);
      await repo.createActivity({
        contact_id: contact.id,
        type: 'meeting',
        subject: `Appuntamento: ${meetingType.label} con ${member.first_name} ${member.last_name}`,
        body: `Prenotazione self-service.\nQuando: ${start.toLocaleString('it-IT')}\nDurata: ${meetingType.duration} min${note.trim() ? `\nNote: ${note.trim()}` : ''}`,
        source: 'user',
        confidence: 1,
        due_at: selected,
      });

      // Promemoria al membro del team 60 min prima
      addReminder({
        title: `Appuntamento con ${name.trim()}`,
        note: `Prenotazione via booking link${note.trim() ? ` — ${note.trim()}` : ''}`,
        remind_at: new Date(start.getTime() - 60 * 60_000).toISOString(),
        channels: member.notify_channels,
        user_id: member.id,
        contact_id: contact.id,
        deal_id: null,
        ticket_id: null,
      });

      addBooking({
        member_id: member.id, name: name.trim(), email: email.trim(),
        note: note.trim() || null, slot_iso: selected, duration_min: meetingType.duration, contact_id: contact.id,
      });

      setConfirmed({ iso: selected });
    } catch (e: any) {
      setError(e.message || 'Errore durante la prenotazione.');
    } finally {
      setLoading(false);
    }
  };

  if (confirmed) {
    const start = new Date(confirmed.iso);
    const end = new Date(start.getTime() + meetingType.duration * 60_000);
    return (
      <div className="min-h-screen bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-7 text-center max-w-md w-full shadow-2xl">
          <CheckCircle size={52} className="text-emerald-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">Appuntamento confermato!</h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Con <strong>{member.first_name} {member.last_name}</strong>
          </p>
          <div className="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-4 my-5 border border-surface-150 dark:border-surface-800">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
              <Calendar size={15} className="text-brand-500" />
              {start.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="flex items-center justify-center gap-2 text-sm text-surface-600 dark:text-surface-300 mt-1">
              <Clock size={15} className="text-brand-500" />
              {start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onClick={() => openGoogleCalendar({
              title: `Appuntamento con ${member.first_name} ${member.last_name}`,
              start, end,
              details: note.trim() || `Appuntamento prenotato tramite ${companyName}`,
              withMeet: true,
            })}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            <CalendarPlus size={16} /> Aggiungi a Google Calendar
          </button>
          <p className="text-[11px] text-surface-400 mt-4">Riceverai una conferma all'indirizzo {email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
      <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between shrink-0">
        <Link to="/" className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 transition-colors">
          <ArrowLeft size={14} /> {companyName}
        </Link>
        <span className="text-xs text-surface-400">Prenotazione online</span>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6 p-6">
        {/* Colonna profilo + form */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                {teamId ? '🏢' : `${member.first_name[0]}${member.last_name[0]}`}
              </div>
              <div>
                <h1 className="font-bold text-surface-900 dark:text-white">
                  {teamId ? 'Prenotazione Team' : `${member.first_name} ${member.last_name}`}
                </h1>
                <p className="text-xs text-surface-500 capitalize">
                  {teamId ? 'Il primo operatore disponibile sarà a te assegnato' : member.role}
                </p>
              </div>
            </div>
            
            <div className="mt-5 space-y-2">
              <label className="text-[11px] font-semibold text-surface-500 uppercase tracking-wide">Tipo di incontro</label>
              <div className="grid grid-cols-1 gap-2">
                {MEETING_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => { setMeetingType(type); setSelected(null); }}
                    className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      meetingType.id === type.id
                        ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/20 dark:border-brand-500/50 dark:text-brand-300'
                        : 'bg-white border-surface-200 text-surface-600 hover:border-brand-300 dark:bg-surface-800 dark:border-surface-700 dark:text-surface-300'
                    }`}
                  >
                    <span>{type.label}</span>
                    <Clock size={13} className={meetingType.id === type.id ? "text-brand-500" : "text-surface-400"} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-surface-700 dark:text-surface-200 uppercase tracking-wide">I tuoi dati</h2>
            <label className="block">
              <span className="text-[11px] font-semibold text-surface-500 flex items-center gap-1 mb-1"><User size={12} /> Nome e cognome</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi"
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-surface-500 flex items-center gap-1 mb-1"><Mail size={12} /> Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mario@azienda.it"
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-surface-500 flex items-center gap-1 mb-1"><MessageSquare size={12} /> Note (facoltativo)</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Argomento dell'incontro..."
                className="w-full bg-surface-50 dark:bg-surface-800 text-xs rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </label>
            <label className="flex items-start gap-2 text-[11px] text-surface-600 dark:text-surface-300 cursor-pointer">
              <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} className="mt-0.5 shrink-0" />
              <span>{CONSENT_LABELS.required}{' '}
                <a href="/privacy" target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 underline">Informativa</a>. *
              </span>
            </label>
            {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={13} /> {error}</p>}
            <button
              onClick={handleConfirm}
              disabled={loading || !selected}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Conferma in corso...' : selected ? `Conferma per le ${new Date(selected).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : 'Seleziona uno slot'}
            </button>
          </div>
        </div>

        {/* Colonna slot */}
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-surface-700 dark:text-surface-200 uppercase tracking-wide mb-4 flex items-center gap-1.5">
            <Calendar size={14} className="text-brand-500" /> Scegli data e ora
          </h2>
          {days.length === 0 ? (
            <p className="text-xs text-surface-400 py-8 text-center">Nessuno slot disponibile nei prossimi 14 giorni.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {days.map((d) => (
                <div key={d.dateIso}>
                  <p className="text-xs font-semibold text-surface-600 dark:text-surface-300 capitalize mb-2">{d.label}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {d.slots.map((s) => (
                      <button
                        key={s.iso}
                        onClick={() => { setSelected(s.iso); setError(null); }}
                        className={`text-xs font-semibold py-1.5 rounded-lg border transition-colors ${
                          selected === s.iso
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:border-brand-400'
                        }`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="py-4 text-center text-[10px] text-surface-400 shrink-0">
        Powered by {companyName} · Qi-CRM
      </footer>
    </div>
  );
}
