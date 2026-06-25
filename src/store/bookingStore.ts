import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Booking {
  id: string;
  member_id: string;       // membro del team che riceve l'appuntamento
  name: string;            // nome di chi prenota
  email: string;
  note: string | null;
  slot_iso: string;        // inizio appuntamento (ISO)
  duration_min: number;
  contact_id: string | null;
  created_at: string;
}

interface BookingState {
  bookings: Booking[];
  add: (b: Omit<Booking, 'id' | 'created_at'>) => Booking;
  forMember: (memberId: string) => Booking[];
  bookedSlots: (memberId: string) => Set<string>;
  remove: (id: string) => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      bookings: [],
      add: (b) => {
        const booking: Booking = { ...b, id: `bk-${crypto.randomUUID().slice(0, 8)}`, created_at: new Date().toISOString() };
        set((s) => ({ bookings: [booking, ...s.bookings] }));
        return booking;
      },
      forMember: (memberId) =>
        get().bookings.filter((b) => b.member_id === memberId).sort((a, b) => a.slot_iso.localeCompare(b.slot_iso)),
      bookedSlots: (memberId) =>
        new Set(get().bookings.filter((b) => b.member_id === memberId).map((b) => b.slot_iso)),
      remove: (id) => set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) })),
    }),
    { name: 'qi-crm-bookings-v1' },
  ),
);
