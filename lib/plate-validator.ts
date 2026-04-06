// Bangladesh number plate formats:
// Metro: ঢাকা মেট্রো ক ১১ ১২৩৪ → DHAKA-METRO-KA-11-1234
// District: ময়মনসিংহ ক ১১ ১২৩৪ → MYMENSINGH-KA-11-1234
// Numeric Latin format is also accepted: DHA-11-1234

const PLATE_PATTERN = /^[A-Z\u0980-\u09FF][A-Z0-9\u0980-\u09FF\s\-]{2,20}$/i;

export function normalizeBangladeshPlate(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9\u0980-\u09FF\-]/g, '')
    .trim();
}

export function isValidPlate(plate: string): boolean {
  if (!plate || plate.length < 3) return false;
  return PLATE_PATTERN.test(plate);
}

export function sanitizePlate(raw: string): string {
  return normalizeBangladeshPlate(raw);
}
