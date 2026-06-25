import { create } from 'zustand';

interface UiState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Command palette (⌘K)
  commandOpen: boolean;
  openCommand: () => void;
  closeCommand: () => void;

  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Active page
  activePage: string;
  setActivePage: (page: string) => void;

  // Notification panel
  notifOpen: boolean;
  toggleNotif: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  commandOpen: false,
  openCommand:  () => set({ commandOpen: true }),
  closeCommand: () => set({ commandOpen: false }),

  darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      document.documentElement.classList.toggle('dark', next);
      return { darkMode: next };
    }),

  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  notifOpen: false,
  toggleNotif: () => set((s) => ({ notifOpen: !s.notifOpen })),
}));
