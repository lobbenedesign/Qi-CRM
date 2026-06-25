import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TOUR_STEPS } from '../lib/tour/steps';

interface TourState {
  active: boolean;
  stepIndex: number;
  autoplay: boolean;
  hasSeenTour: boolean;

  start: (autoplay?: boolean) => void;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  stop: () => void;
  toggleAutoplay: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      active: false,
      stepIndex: 0,
      autoplay: false,
      hasSeenTour: false,

      start: (autoplay = false) => set({ active: true, stepIndex: 0, autoplay }),
      next: () => {
        const { stepIndex } = get();
        if (stepIndex >= TOUR_STEPS.length - 1) set({ active: false, autoplay: false, hasSeenTour: true });
        else set({ stepIndex: stepIndex + 1 });
      },
      prev: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
      goTo: (i) => set({ stepIndex: Math.max(0, Math.min(TOUR_STEPS.length - 1, i)) }),
      stop: () => set({ active: false, autoplay: false, hasSeenTour: true }),
      toggleAutoplay: () => set((s) => ({ autoplay: !s.autoplay })),
    }),
    { name: 'qi-crm-tour-v2', partialize: (s) => ({ hasSeenTour: s.hasSeenTour }) },
  ),
);
