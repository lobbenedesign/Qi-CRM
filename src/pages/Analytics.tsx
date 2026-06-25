import { BarChart2, Loader2, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useDeals, usePipelineStages } from '../hooks/useDeals';
import { useContacts } from '../hooks/useContacts';
import { useDealsStore } from '../store/dealsStore';
import { useContactsStore } from '../store/contactsStore';
import { aggregateTrust } from '../lib/trust';
import { formatCurrency } from '../lib/utils';

const TRUST_COLORS = { high: '#22c55e', medium: '#f59e0b', low: '#ef4444' };

export default function Analytics() {
  const { isLoading: l1 } = useDeals();
  const { isLoading: l2 } = useContacts();
  usePipelineStages();
  const deals = useDealsStore((s) => s.deals);
  const stages = useDealsStore((s) => s.stages);
  const contacts = useContactsStore((s) => s.contacts);

  if (l1 || l2) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand-500" size={28} /></div>;
  }

  // Pipeline per stage
  const byStage = stages.filter((s) => s.stage_key !== 'lost').map((s) => ({
    stage: s.name,
    valore: deals.filter((d) => d.stage === s.stage_key).reduce((sum, d) => sum + d.value, 0),
    count: deals.filter((d) => d.stage === s.stage_key).length,
  }));

  // Win rate
  const won = deals.filter((d) => d.stage === 'won');
  const lost = deals.filter((d) => d.stage === 'lost');
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const openValue = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + d.value, 0);
  const wonValue = won.reduce((s, d) => s + d.value, 0);

  // Trust distribution
  const trustBuckets = { high: 0, medium: 0, low: 0 };
  contacts.forEach((c) => { trustBuckets[aggregateTrust(c.field_trust).label]++; });
  const trustData = [
    { name: 'Alto', value: trustBuckets.high, key: 'high' as const },
    { name: 'Medio', value: trustBuckets.medium, key: 'medium' as const },
    { name: 'Basso', value: trustBuckets.low, key: 'low' as const },
  ].filter((d) => d.value > 0);

  const churnCount = contacts.filter((c) => c.churn_risk && c.churn_risk.score > 0.5).length;
  const reviewCount = contacts.filter((c) => aggregateTrust(c.field_trust).needsReview).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart2 className="text-brand-500" size={22} />
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">Analytics</h1>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<TrendingUp size={18} />} label="Pipeline aperta" value={formatCurrency(openValue)} color="text-brand-500" />
        <Kpi icon={<TrendingUp size={18} />} label="Vinto" value={formatCurrency(wonValue)} color="text-trust-high" />
        <Kpi icon={<BarChart2 size={18} />} label="Win rate" value={`${winRate}%`} color="text-purple-500" />
        <Kpi icon={<AlertTriangle size={18} />} label="A rischio churn" value={String(churnCount)} color="text-risk-high" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline value by stage */}
        <div className="lg:col-span-2 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
          <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-100 mb-4">Valore pipeline per stage</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byStage} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Valore']} />
              <Bar dataKey="valore" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trust distribution — il differenziatore */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
          <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-100 mb-1 flex items-center gap-1.5">
            <ShieldCheck size={15} className="text-trust-high" /> Affidabilità dati
          </h2>
          <p className="text-xs text-surface-400 mb-2">{reviewCount} contatti da verificare</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={trustData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                {trustData.map((d) => <Cell key={d.key} fill={TRUST_COLORS[d.key]} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4">
      <div className={`flex items-center gap-1.5 ${color}`}>{icon}</div>
      <p className="text-xl font-bold text-surface-900 dark:text-surface-50 mt-2">{value}</p>
      <p className="text-xs text-surface-400 mt-0.5">{label}</p>
    </div>
  );
}
