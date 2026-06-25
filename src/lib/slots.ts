// ============================================================
// Generatore di slot di prenotazione a partire dagli orari di
// lavoro definiti in orgSettingsStore.business_hours.
// Riusato dalla pagina pubblica /book/:memberId.
// ============================================================

export interface BusinessHours {
  start: string;   // 'HH:MM'
  end: string;     // 'HH:MM'
  days: number[];  // 0=Dom .. 6=Sab (ISO: 1=Lun)
}

export interface DaySlots {
  dateIso: string;       // YYYY-MM-DD
  label: string;         // es. "Lun 23 giu"
  slots: { iso: string; time: string }[];
}

const WD = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MO = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * Genera gli slot disponibili per i prossimi `daysAhead` giorni.
 * @param booked insieme di ISO già prenotati (per escluderli)
 * @param slotMinutes durata slot (default 30)
 */
export function generateSlots(
  bh: BusinessHours,
  booked: Set<string>,
  daysAhead = 14,
  slotMinutes = 30,
): DaySlots[] {
  const out: DaySlots[] = [];
  const now = Date.now();
  const startMin = toMin(bh.start);
  const endMin = toMin(bh.end);

  for (let d = 0; d < daysAhead; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);
    if (!bh.days.includes(day.getDay())) continue;

    const slots: { iso: string; time: string }[] = [];
    for (let m = startMin; m + slotMinutes <= endMin; m += slotMinutes) {
      const slot = new Date(day);
      slot.setMinutes(m);
      if (slot.getTime() <= now) continue;            // niente slot nel passato
      const iso = slot.toISOString();
      if (booked.has(iso)) continue;                  // già prenotato
      const hh = String(slot.getHours()).padStart(2, '0');
      const mm = String(slot.getMinutes()).padStart(2, '0');
      slots.push({ iso, time: `${hh}:${mm}` });
    }
    if (slots.length === 0) continue;

    out.push({
      dateIso: day.toISOString().slice(0, 10),
      label: `${WD[day.getDay()]} ${day.getDate()} ${MO[day.getMonth()]}`,
      slots,
    });
  }
  return out;
}
