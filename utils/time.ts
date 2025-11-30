// utils/time.ts
export const US_OPTIMAL_HOURS = [6, 10, 14, 18, 22]; // 6 AM, 10 AM, 2 PM, 6 PM, 10 PM EST

// AQSH kuni bo'yicha 5 ta sanani qaytaradi (bugun uchun)
export function getTodaysScheduledSlots(): Date[] {
  const now = new Date();
  const estOffset = -5 * 60; // EST UTC-5
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const est = new Date(utc + (estOffset * 60000));

  const slots: Date[] = [];
  for (const hour of US_OPTIMAL_HOURS) {
    const slot = new Date(est);
    slot.setUTCHours(hour + 5, 0, 0, 0); // EST → UTC (5 soat qo'shish)
    if (slot > now) {
      slots.push(slot);
    }
  }
  return slots;
}

// Berilgan kunga mos 5 ta sanani qaytarish (har kungi optimal soatlar)
export function getScheduledSlotsForDate(date: Date): Date[] {
  const slots: Date[] = [];
  for (const hour of US_OPTIMAL_HOURS) {
    const slot = new Date(date);
    slot.setUTCHours(hour + 5, 0, 0, 0); // EST → UTC
    slots.push(slot);
  }
  return slots;
}
