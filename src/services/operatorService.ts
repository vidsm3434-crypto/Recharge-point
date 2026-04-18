import { GoogleGenAI, Type } from "@google/genai";

// Use the API key from environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function detectOperatorAndCircle(mobile: string) {
  if (!mobile || mobile.length < 10) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Identify the Indian mobile operator and circle (state) for the number: ${mobile}.
      Return the result as JSON including 'operator' (Airtel, Jio, Vi, or BSNL) and 'circle' (The state name).
      Common Indian circles: West Bengal, Bihar, Delhi, Maharashtra, Karnataka, Tamil Nadu, Uttar Pradesh, Rajasthan, Gujarat, Punjab, Haryana, Kerala.
      If unsure, return 'Unknown' for fields.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            operator: { type: Type.STRING },
            circle: { type: Type.STRING }
          },
          required: ["operator", "circle"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("AI Operator Detection Error:", error);
    return null;
  }
}

// Fallback logic based on common prefixes if AI is unavailable or slow
export function detectOperatorByPrefix(mobile: string) {
  if (mobile.length < 4) return null;
  const p4 = mobile.substring(0, 4);
  const p3 = mobile.substring(0, 3);
  const p2 = mobile.substring(0, 2);

  // Broad Jio series
  if (['600', '700', '800', '900', '910', '930'].includes(p3)) return { operator: 'Jio' };
  
  // Airtel
  if (['984', '994', '974', '964', '954', '944', '914', '814', '804', '704', '980', '981'].includes(p3)) return { operator: 'Airtel' };

  // Vi
  if (['989', '999', '979', '969', '959', '949', '919', '819', '809', '709', '982', '983'].includes(p3)) return { operator: 'Vi' };

  // BSNL
  if (['94', '84', '74'].includes(p2)) return { operator: 'BSNL' };

  return null;
}
