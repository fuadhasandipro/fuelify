'use client';

import Tesseract from 'tesseract.js';
import { normalizeBangladeshPlate } from './plate-validator';

// Helper to preprocess the image to grayscale and binarize it for better OCR accuracy
const preprocessImage = async (
  imageData: string | File | Blob
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let src = '';
    if (typeof imageData === 'string') {
      src = imageData;
    } else {
      src = URL.createObjectURL(imageData);
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // scale up to help tesseract see better
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(src); // fallback
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // Binarize (threshold ~130)
        let color = luminance > 130 ? 255 : 0;
        
        data[i] = color;
        data[i + 1] = color;
        data[i + 2] = color;
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      // fallback to original if image fails to load in canvas
      resolve(src);
    };
    img.src = src;
  });
};

export async function extractPlateNumber(
  imageData: string | File | Blob
): Promise<{
  rawText: string;
  plateNumber: string;
  confidence: number;
}> {
  const processedData = await preprocessImage(imageData);

  // Use createWorker to allow setting OCR parameters
  const worker = await Tesseract.createWorker('ben', 1, {
    logger: undefined
  });

  // 11 = PSM.SPARSE_TEXT
  await worker.setParameters({
    tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
  });

  const result = await worker.recognize(processedData);
  await worker.terminate();

  const rawText = result.data.text.trim();
  const confidence = result.data.confidence;
  const plateNumber = normalizeBangladeshPlate(rawText);

  return { rawText, plateNumber, confidence };
}
