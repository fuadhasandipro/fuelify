'use client';

import { normalizeBangladeshPlate } from './plate-validator';
import { performAIOcr } from './ocr-action';

// Helper to convert File/Blob to base64 if needed
const getBase64 = (imageData: string | File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof imageData === 'string') {
      // It's likely already a base64 data URL. If it's a normal URL, 
      // OpenRouter can handle public URLs, but for typical camera uploads, it's base64.
      resolve(imageData);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(imageData);
  });
};

export async function extractPlateNumber(
  imageData: string | File | Blob
): Promise<{
  rawText: string;
  plateNumber: string;
  confidence: number;
}> {
  const base64Image = await getBase64(imageData);
  
  // Call the server action to keep our OPENROUTER_API_KEY secure
  const text = await performAIOcr(base64Image);

  const rawText = text.trim();
  
  // Gemini OpenRouter output doesn't give a traditional OCR confidence score.
  // We'll hardcode an arbitrary high score, or you can adjust logic as needed.
  const confidence = 95;
  
  const plateNumber = normalizeBangladeshPlate(rawText);

  return { rawText, plateNumber, confidence };
}
