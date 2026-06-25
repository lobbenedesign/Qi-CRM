import { useState } from 'react';
import { BookOpen, ChevronDown, ExternalLink } from 'lucide-react';

export interface GuideStep {
  text: string;
  link?: { label: string; url: string };
}

interface Props {
  title?: string;
  steps: GuideStep[];
  defaultOpen?: boolean;
}

/** Mini-guida passo-passo collassabile per configurare un'integrazione. */
export function SetupGuide({ title = 'Come configurarlo', steps, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-brand-200 dark:border-brand-900/40 bg-brand-50/50 dark:bg-brand-900/10 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-brand-700 dark:text-brand-300"
      >
        <BookOpen size={14} />
        {title}
        <ChevronDown size={14} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="px-3 pb-3 space-y-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-xs text-surface-600 dark:text-surface-300">
              <span className="shrink-0 w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] flex items-center justify-center font-semibold mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">
                {s.text}{' '}
                {s.link && (
                  <a href={s.link.url} target="_blank" rel="noopener noreferrer"
                     className="text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-0.5">
                    {s.link.label} <ExternalLink size={10} />
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
