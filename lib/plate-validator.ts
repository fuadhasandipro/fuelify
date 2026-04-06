// Strict Bangladesh number plate formats:
// Example: ঢাকা মেট্রো-ল ৫০-০২০৩
// Format: [City/Metro]-(Class Letter) (2-digits)-(4-digits)

const STRICT_PLATE_PATTERN = /^([A-Z\u0980-\u09FF]+(?:\s[A-Z\u0980-\u09FF]+)*)-([A-Z\u0980-\u09FF]{1,2})\s([0-9\u09E6-\u09EF]{2})-([0-9\u09E6-\u09EF]{4})$/i;

export function normalizeBangladeshPlate(raw: string): string {
  let normalized = raw
    .toUpperCase()
    // Remove unwanted characters but KEEP spaces and hyphens
    .replace(/[^\sA-Z0-9\u0980-\u09FF\-]/g, '')
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    .trim();
    
  // Strictly remove spaces around hyphens
  normalized = normalized.replace(/\s*-\s*/g, '-');
  
  return normalized;
}

export function isValidPlate(plate: string): boolean {
  if (!plate) return false;
  return STRICT_PLATE_PATTERN.test(plate.trim());
}

export function sanitizePlate(raw: string): string {
  return normalizeBangladeshPlate(raw);
}

