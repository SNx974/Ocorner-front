export const SLOTS = [
  { start: 8 * 60,       end: 10 * 60 + 30, label: '08h00 – 10h30' },
  { start: 10 * 60 + 30, end: 13 * 60,      label: '10h30 – 13h00' },
  { start: 13 * 60,      end: 15 * 60 + 30, label: '13h00 – 15h30' },
  { start: 15 * 60 + 30, end: 18 * 60,      label: '15h30 – 18h00' },
  { start: 18 * 60,      end: 20 * 60 + 30, label: '18h00 – 20h30' },
  { start: 20 * 60 + 30, end: 22 * 60,      label: '20h30 – 22h00' },
];

export const MAX_PER_SLOT = 5;

export function getCurrentSlotIndex(): number {
  const now = new Date();
  const m   = now.getHours() * 60 + now.getMinutes();
  return SLOTS.findIndex(s => m >= s.start && m < s.end);
}
