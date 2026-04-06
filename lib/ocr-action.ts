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
          "role": "user",
          "content": [
            {
              "text": "Identify the license plate number in this image. Strict Rule: ONLY return the raw text of the license plate exactly in this specific format: '[City/District Name] [Metro if applicable]-[Class Letter] [2-digit series]-[4-digit number]'. You MUST include the correct spaces and hyphens exactly as shown in this example: 'ঢাকা মেট্রো-ল ৫০-০২০৩'. WARNING: Do NOT add spaces around hyphens (e.g., 'মেট্রো - ল' is WRONG). Do NOT explain, output markdown, or say anything else."
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

  return text;
}
