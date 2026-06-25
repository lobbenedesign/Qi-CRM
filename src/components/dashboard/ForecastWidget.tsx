import { useMemo } from 'react';
import { TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useDealsStore } from '../../store/dealsStore';
import { cn, formatCurrency } from '../../lib/utils';

interface Props {
  targetAmount: number; // e.g. 100000
}

export function ForecastWidget({ targetAmount = 50000 }: Props) {
  const deals = useDealsStore((s) => s.deals);

  const forecast = useMemo(() => {
    // Pipeline probability mapping
    const probMap: Record<string, number> = {
      lead: 0.1,
      contacted: 0.2,
      qualified: 0.4,
      proposal: 0.6,
      negotiation: 0.8,
      won: 1.0,
      lost: 0.0
    };

    let totalExpected = 0;
    let won = 0;
    let openExpected = 0;

    deals.forEach(d => {
      const prob = probMap[d.stage] ?? 0.1;
      if (d.stage === 'won') {
        won += d.value;
      } else if (d.stage !== 'lost') {
        openExpected += d.value * prob;
      }
    });

    totalExpected = won + openExpected;

    return {
      won,
      openExpected,
      totalExpected,
      percentToTarget: Math.min(100, (totalExpected / targetAmount) * 100)
    };
  }, [deals, targetAmount]);

  const isOnTrack = forecast.totalExpected >= targetAmount;

  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 rounded-xl shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
          <TrendingUp className="text-brand-500" size={18} />
          Sales Forecast
        </h3>
        <span className="text-xs font-semibold text-surface-500 bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded-full">
          Mese Corrente
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl font-extrabold text-surface-900 dark:text-white leading-none">
            {formatCurrency(forecast.totalExpected)}
          </span>
          <span className="text-sm font-medium text-surface-500 pb-1">/ {formatCurrency(targetAmount)}</span>
        </div>

        <div className="h-3 w-full bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden mb-4 relative flex">
          <div 
            className="h-full bg-trust-high transition-all" 
            style={{ width: `${(forecast.won / targetAmount) * 100}%` }} 
            title={`Vinto: ${formatCurrency(forecast.won)}`}
          />
          <div 
            className="h-full bg-brand-400 transition-all opacity-60" 
            style={{ width: `${(forecast.openExpected / targetAmount) * 100}%` }} 
            title={`Previsto (Open): ${formatCurrency(forecast.openExpected)}`}
          />
        </div>

        <div className="space-y-2 mt-auto">
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-500 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-trust-high" /> Già Vinto</span>
            <span className="font-semibold text-surface-900 dark:text-white">{formatCurrency(forecast.won)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-500 flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-brand-400 opacity-60" /> Previsione Ponderata</span>
            <span className="font-semibold text-surface-900 dark:text-white">{formatCurrency(forecast.openExpected)}</span>
          </div>
        </div>
      </div>

      <div className={cn(
        "mt-5 p-3 rounded-lg flex items-start gap-2 text-xs font-medium border",
        isOnTrack 
          ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400"
          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-400"
      )}>
        {isOnTrack ? <ArrowUpRight size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
        {isOnTrack 
          ? `Ottimo! Siete in linea per superare il target mensile del ${(forecast.percentToTarget - 100).toFixed(1)}%.`
          : `Attenzione: la previsione attuale è inferiore al target. Mancano ${formatCurrency(targetAmount - forecast.totalExpected)}.`}
      </div>
    </div>
  );
}
