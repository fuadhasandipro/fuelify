'use client';

import Tesseract from 'tesseract.js';
import { normalizeBangladeshPlate } from './plate-validator';

export async function extractPlateNumber(
  imageData: string | File | Blob
): Promise<{
  rawText: string;
  plateNumber: string;
  confidence: number;
}> {
  const result = await Tesseract.recognize(imageData, 'eng', {
    // @ts-expect-error tesseract options
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
    logger: undefined,
  });

  const rawText = result.data.text.trim();
  const confidence = result.data.confidence;
  const plateNumber = normalizeBangladeshPlate(rawText);

  return { rawText, plateNumber, confidence };
}
