// utils/time.ts
export const US_OPTIMAL_HOURS = [6, 10, 14, 18, 22]; // Saqlang, lekin ishlatilmaydi

// ✅ Test rejimida — HAMMA NARSA HOZIRGI VAQTDAN 10 SONIYA KEYIN
export function getScheduledSlotsForDate(date: Date): Date[] {
  const now = new Date();
  const slot = new Date(now.getTime() + 10000); // 10 soniya keyin
  return [slot];
}
