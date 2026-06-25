import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AIEvaluation {
  id: string;
  timestamp: string;
  query: string;
  deterministicResponse: string;
  geminiNanoResponse: string;
  deterministicRating: 'up' | 'down' | null;
  geminiNanoRating: 'up' | 'down' | null;
  comment: string;
  deterministicDurationMs: number;
  geminiNanoDurationMs: number;
}

interface EvaluationState {
  evaluations: AIEvaluation[];
  addEvaluation: (evalItem: Omit<AIEvaluation, 'id' | 'timestamp'>) => string;
  rateDeterministic: (id: string, rating: 'up' | 'down' | null) => void;
  rateGeminiNano: (id: string, rating: 'up' | 'down' | null) => void;
  addComment: (id: string, comment: string) => void;
  clearEvaluations: () => void;
}

export const useEvaluationStore = create<EvaluationState>()(
  persist(
    (set) => ({
      evaluations: [],

      addEvaluation: (evalItem) => {
        const id = Math.random().toString(36).substring(2, 9);
        const timestamp = new Date().toISOString();
        const newItem: AIEvaluation = {
          ...evalItem,
          id,
          timestamp,
        };
        set((state) => ({
          evaluations: [newItem, ...state.evaluations],
        }));
        return id;
      },

      rateDeterministic: (id, rating) => {
        set((state) => ({
          evaluations: state.evaluations.map((item) =>
            item.id === id ? { ...item, deterministicRating: rating } : item
          ),
        }));
      },

      rateGeminiNano: (id, rating) => {
        set((state) => ({
          evaluations: state.evaluations.map((item) =>
            item.id === id ? { ...item, geminiNanoRating: rating } : item
          ),
        }));
      },

      addComment: (id, comment) => {
        set((state) => ({
          evaluations: state.evaluations.map((item) =>
            item.id === id ? { ...item, comment } : item
          ),
        }));
      },

      clearEvaluations: () => {
        set({ evaluations: [] });
      },
    }),
    {
      name: 'qi-crm-ai-evaluations-v1',
    }
  )
);
