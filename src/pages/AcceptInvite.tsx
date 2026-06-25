import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Crown, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { useTeamStore } from '../store/teamStore';
import { useAuthStore } from '../store/authStore';
import { ROLE_META } from '../lib/permissions';

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const getByToken = useTeamStore((s) => s.getByToken);
  const acceptInvite = useTeamStore((s) => s.acceptInvite);
  const signIn = useAuthStore((s) => s.signIn);

  const member = token ? getByToken(token) : undefined;
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!token || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
        <div className="text-center">
          <p className="text-surface-600 dark:text-surface-300 font-medium">Invito non valido o già utilizzato</p>
          <button onClick={() => navigate('/login')} className="text-brand-500 hover:underline text-sm mt-2">
            Vai al login
          </button>
        </div>
      </div>
    );
  }

  if (member.status === 'active') return <Navigate to="/login" replace />;

  const meta = ROLE_META[member.role];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pwd.length < 6) return setError('La password deve avere almeno 6 caratteri');
    if (pwd !== pwd2) return setError('Le password non coincidono');
    setLoading(true);
    acceptInvite(token, pwd);
    await signIn(member.email, pwd);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-3 shadow-lg shadow-brand-600/30">
            <Crown className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Qi-CRM</h1>
        </div>

        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-surface-100 dark:border-surface-800">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                 style={{ backgroundColor: meta.color }}>
              {member.first_name[0]}{member.last_name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Ciao {member.first_name}! 👋
              </p>
              <p className="text-xs text-surface-400">
                Sei stato invitato come <span style={{ color: meta.color }} className="font-medium">{meta.label}</span>
              </p>
            </div>
          </div>

          <p className="text-sm text-surface-500 dark:text-surface-400 mb-4">
            Imposta una password per completare la registrazione di <strong>{member.email}</strong>.
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-surface-500 mb-1 flex items-center gap-1.5"><Lock size={14} /> Password</span>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" className="auth-input" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-surface-500 mb-1 flex items-center gap-1.5"><Lock size={14} /> Conferma password</span>
              <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="••••••••" className="auth-input" />
            </label>

            {error && <p className="text-xs text-risk-high">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700
                         text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 mt-1">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Completa registrazione
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
