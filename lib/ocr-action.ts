'use server';

export async function performAIOcr(base64Image: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not defined in environment variables');
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://fuelify.vercel.app",
      "X-Title": "Fuelify",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "google/gemini-3.1-flash-lite-preview",
      "messages": [
        {
          "role": "system",
          "content": "You are a raw data API. You MUST output ONLY valid JSON and absolutely nothing else. Your output format MUST be: {\"plate\": \"[City] [Metro]-[Class] [2-digits]-[4-digits]\"}."
        },
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": "Identify the license plate number. Do NOT describe the image. Do NOT say 'The license plate is'. Return ONLY JSON format. Example: {\"plate\": \"ঢাকা মেট্রো-ল ৫০-০২০৩\"}. WARNING: Do NOT add spaces around the hyphen. Never write conversational text."
            },
            {
              "type": "image_url",
              "image_url": {
                "url": base64Image
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error:", errorText);
    throw new Error(`OpenRouter API failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || "";

  // Attempt to parse JSON from the response
  let extractedPlate = text;
  try {
    // Sometimes LLMs wrap JSON in markdown block ```json ... ```
    const jsonStr = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.plate) {
      extractedPlate = parsed.plate;
    }
  } catch (e) {
    console.warn("Failed to parse JSON from AI response, falling back to raw text:", text);
  }

  return extractedPlate;
}
