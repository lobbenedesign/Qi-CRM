import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { X, ArrowLeft, ArrowRight, Play, Pause, Check } from 'lucide-react';
import { useTourStore } from '../../store/tourStore';
import { TOUR_STEPS } from '../../lib/tour/steps';

const PAD = 8;
const BUBBLE_W = 320;
const AUTOPLAY_MS = 5200;

interface Rect { top: number; left: number; width: number; height: number; }

export function TourOverlay() {
  const { active, stepIndex, autoplay, next, prev, stop, toggleAutoplay } = useTourStore(
    useShallow((s) => ({ active: s.active, stepIndex: s.stepIndex, autoplay: s.autoplay, next: s.next, prev: s.prev, stop: s.stop, toggleAutoplay: s.toggleAutoplay }))
  );
  const [rect, setRect] = useState<Rect | null>(null);
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Misura al cambio passo (con piccolo delay per lo scroll) + su resize/scroll
  useLayoutEffect(() => {
    if (!active) return;
    measure();
    const t = setTimeout(measure, 350);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, stepIndex, measure]);

  // Autoplay
  useEffect(() => {
    if (!active || !autoplay) return;
    const t = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [active, autoplay, stepIndex, next]);

  // Tastiera
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, next, prev, stop]);

  if (!active || !step) return null;

  // Posizione del fumetto
  const vw = window.innerWidth, vh = window.innerHeight;
  let bubbleTop: number, bubbleLeft: number;
  const placement = rect ? (step.placement ?? 'bottom') : 'center';

  if (!rect || placement === 'center') {
    bubbleTop = vh / 2 - 120;
    bubbleLeft = vw / 2 - BUBBLE_W / 2;
  } else {
    const cx = rect.left + rect.width / 2;
    switch (placement) {
      case 'right':  bubbleTop = rect.top; bubbleLeft = rect.left + rect.width + 16; break;
      case 'left':   bubbleTop = rect.top; bubbleLeft = rect.left - BUBBLE_W - 16; break;
      case 'top':    bubbleTop = rect.top - 16 - 180; bubbleLeft = cx - BUBBLE_W / 2; break;
      default:       bubbleTop = rect.top + rect.height + 16; bubbleLeft = cx - BUBBLE_W / 2;
    }
  }
  // Clamp ai bordi
  bubbleLeft = Math.max(12, Math.min(bubbleLeft, vw - BUBBLE_W - 12));
  bubbleTop = Math.max(12, Math.min(bubbleTop, vh - 220));

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Spotlight: il riquadro evidenziato con buco nell'ombra */}
      {rect ? (
        <div
          className="absolute rounded-xl pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72)',
            border: '2px solid rgba(99, 102, 241, 0.9)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(15, 23, 42, 0.72)' }} />
      )}

      {/* Click-catcher (blocca interazioni sotto) */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Fumetto */}
      <div
        className="absolute bg-white dark:bg-surface-900 rounded-2xl shadow-2xl border
                   border-surface-200 dark:border-surface-700 p-4 transition-all duration-300 ease-out"
        style={{ top: bubbleTop, left: bubbleLeft, width: BUBBLE_W }}
      >
        <button
          onClick={stop}
          className="absolute top-3 right-3 text-surface-400 hover:text-surface-600"
          title="Chiudi tour"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1.5">
          {step.emoji && <span className="text-xl">{step.emoji}</span>}
          <h3 className="text-sm font-bold text-surface-900 dark:text-surface-50 pr-5">{step.title}</h3>
        </div>
        <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">{step.body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => useTourStore.getState().goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-5 bg-brand-500' : 'w-1.5 bg-surface-300 dark:bg-surface-600'
              }`}
            />
          ))}
        </div>

        {/* Controlli */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleAutoplay}
              title={autoplay ? 'Pausa demo' : 'Demo automatica'}
              className="p-1.5 rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              {autoplay ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <span className="text-[11px] text-surface-400">{stepIndex + 1}/{TOUR_STEPS.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {stepIndex > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-surface-600 dark:text-surface-400
                           hover:bg-surface-100 dark:hover:bg-surface-800 rounded-md transition-colors"
              >
                <ArrowLeft size={13} /> Indietro
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-brand-600
                         hover:bg-brand-700 text-white rounded-md transition-colors"
            >
              {isLast ? <><Check size={13} /> Fine</> : <>Avanti <ArrowRight size={13} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
