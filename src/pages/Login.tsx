import { useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useNavigate } from 'react-router-dom';
import { Crown, Loader2, Mail, Lock, User, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { USING_MOCK } from '../lib/repo';
import { logAudit } from '../lib/audit';

const DEMO_ACCOUNTS = [
  { name: 'Giuseppe (Superadmin)', email: 'superadmin', pwd: 'superadmin2026!', badge: 'Superadmin', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
  { name: 'Anna (Amministrativo)', email: 'anna@sovrano.it', pwd: 'demo', badge: 'Admin', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { name: 'Marco (Commerciale)', email: 'marco@sovrano.it', pwd: 'demo', badge: 'Commerciale', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
  { name: 'Sara (Telefonista)', email: 'sara@sovrano.it', pwd: 'demo', badge: 'Telefonista', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  { name: 'Luca (Configuratore)', email: 'luca@sovrano.it', pwd: 'demo', badge: 'Configuratore', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
];

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuthStore(
    useShallow((s) => ({ signIn: s.signIn, signUp: s.signUp }))
  );
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') await signIn(form.email, form.password);
      else await signUp(form.email, form.password, form.fullName);
      logAudit('login', 'session', 'Accesso');
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di autenticazione');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email: string, pass: string) => {
    setError('');
    setLoading(true);
    try {
      await signIn(email, pass);
      logAudit('login', 'session', `Accesso rapido come ${email}`);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di autenticazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4">
      <div className="w-full max-w-md my-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-3 shadow-lg shadow-brand-600/30">
            <Crown className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">Qi-CRM</h1>
          <p className="text-sm text-surface-400 mt-1">Il CRM che tratta il dato come entità viva</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 shadow-sm space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-lg">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === m
                    ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                {m === 'signin' ? 'Accedi' : 'Registrati'}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'signup' && (
              <Field icon={<User size={15} />} label="Nome completo">
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Mario Rossi"
                  className="auth-input"
                />
              </Field>
            )}
            <Field icon={<Mail size={15} />} label={mode === 'signin' ? 'Email o username' : 'Email'}>
              <input
                required
                type={mode === 'signin' ? 'text' : 'email'}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={mode === 'signin' ? 'tu@azienda.it o superadmin' : 'tu@azienda.it'}
                className="auth-input"
              />
            </Field>
            <Field icon={<Lock size={15} />} label="Password">
              <input
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="auth-input"
              />
            </Field>

            {error && <p className="text-xs text-risk-high">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600
                         hover:bg-brand-700 text-white text-sm font-medium rounded-lg
                         transition-colors disabled:opacity-60 mt-2"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {mode === 'signin' ? 'Accedi' : 'Crea account'}
            </button>
          </form>

          {USING_MOCK && mode === 'signin' && (
            <div className="pt-4 border-t border-surface-100 dark:border-surface-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-surface-500 mb-3">
                <KeyRound size={13} className="text-brand-500" />
                <span>ACCESSO RAPIDO DEMO (1-CLICK)</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(acc.email, acc.pwd)}
                    className="flex items-center justify-between text-left p-2.5 rounded-lg border border-surface-200
                               dark:border-surface-700 hover:border-brand-500 hover:bg-surface-50
                               dark:hover:bg-surface-800/50 transition-all text-xs group"
                  >
                    <div>
                      <div className="font-medium text-surface-900 dark:text-surface-100 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-surface-400 mt-0.5">
                        User: <code className="bg-surface-100 dark:bg-surface-800 px-1 py-0.2 rounded">{acc.email}</code>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${acc.color}`}>
                      {acc.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-surface-400 dark:text-surface-500 mt-6">
          Powered by <span className="font-semibold text-surface-600 dark:text-surface-400">Giuseppe Lobbene / Lobbenedesign</span>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-surface-500 mb-1 flex items-center gap-1.5">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
