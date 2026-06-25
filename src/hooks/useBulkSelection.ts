import { useState, useCallback } from 'react';

/** Selezione multipla riutilizzabile per le tabelle (azioni bulk). */
export function useBulkSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelected((s) => (s.size === ids.length && ids.length > 0 ? new Set() : new Set(ids)));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return {
    selected,
    ids: [...selected],
    count: selected.size,
    toggle,
    toggleAll,
    clear,
    isSelected,
    allSelected: (ids: string[]) => ids.length > 0 && ids.every((i) => selected.has(i)),
  };
}
