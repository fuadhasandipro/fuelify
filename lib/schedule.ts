export type TimeSlot = 'A' | 'B' | 'C';

export const TIME_WINDOWS = {
  A: { label: 'সকাল ১০টা – দুপুর ১টা', start: '10:00 AM', end: '1:00 PM', startHour: 10, endHour: 13 },
  B: { label: 'দুপুর ২টা – সন্ধ্যা ৬টা', start: '2:00 PM', end: '6:00 PM', startHour: 14, endHour: 18 },
  C: { label: 'সন্ধ্যা ৬টা – রাত ১০টা', start: '6:00 PM', end: '10:00 PM', startHour: 18, endHour: 22 },
};

export function generateReturnSchedule(fueledAt: Date): {
  returnDate: Date;
  slot: TimeSlot;
  slotLabel: string;
  nextAllowedAt: Date;
} {
  const returnDate = new Date(fueledAt);
  returnDate.setDate(returnDate.getDate() + 3);

  const currentHour = fueledAt.getHours();
  let slot: TimeSlot;

  if (currentHour >= 10 && currentHour < 13) {
    slot = 'A';
  } else if (currentHour >= 14 && currentHour < 18) {
    slot = 'B';
  } else if (currentHour >= 18 && currentHour < 22) {
    slot = 'C';
  } else {
    slot = 'A';
    if (currentHour >= 22) {
      returnDate.setDate(returnDate.getDate() + 1);
    }
  }

  const window = TIME_WINDOWS[slot];
  returnDate.setHours(window.startHour, 0, 0, 0);

  const nextAllowedAt = new Date(returnDate);

  return {
    returnDate,
    slot,
    slotLabel: window.label,
    nextAllowedAt,
  };
}

export function formatBanglaDate(date: Date): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const banglaMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

  const toBanglaNum = (n: number) =>
    String(n).split('').map(d => banglaDigits[parseInt(d)]).join('');

  return `${toBanglaNum(date.getDate())} ${banglaMonths[date.getMonth()]} ${toBanglaNum(date.getFullYear())} (${banglaDays[date.getDay()]})`;
}

export function formatBanglaDateTime(date: Date): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const toBanglaNum = (n: number) =>
    String(n).split('').map(d => banglaDigits[parseInt(d)]).join('');

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const isPM = hours >= 12;
  const period = isPM ? 'রাত' : 'সকাল';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  return `${toBanglaNum(hours)}:${toBanglaNum(minutes).padStart(2, '০')} ${period}`;
}
