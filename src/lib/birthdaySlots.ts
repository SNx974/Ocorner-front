export const SLOTS = [
  { start: 9 * 60,       end: 12 * 60,      label: '09h00 – 12h00' },
  { start: 12 * 60 + 30, end: 15 * 60 + 30, label: '12h30 – 15h30' },
  { start: 16 * 60,      end: 19 * 60,      label: '16h00 – 19h00' },
];

export const MAX_PER_SLOT = 5;

export function getCurrentSlotIndex(): number {
  const now = new Date();
  const m   = now.getHours() * 60 + now.getMinutes();
  return SLOTS.findIndex(s => m >= s.start && m < s.end);
}
