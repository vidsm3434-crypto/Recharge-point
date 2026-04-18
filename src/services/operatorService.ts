import { GoogleGenAI, Type } from "@google/genai";

// Use the API key from environment
export async function detectOperatorAndCircle(mobile: string) {
  if (!mobile || mobile.length < 10) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
    
    const prompt = `Identify the Indian mobile operator and circle (state) for the number: ${mobile}.
    Return JSON: {"operator": "Airtel" | "Jio" | "Vi" | "BSNL" | "Unknown", "circle": "State Name" | "Unknown"}.
    Note: Operator must strictly be one of [Airtel, Jio, Vi, BSNL].
    Common Circles: West Bengal, Bihar, Delhi, Maharashtra, Karnataka, Tamil Nadu, Uttar Pradesh, Rajasthan, Gujarat, Punjab, Haryana, Kerala.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const data = JSON.parse(response.text);
    
    // Normalization
    let finalOperator = data.operator;
    if (finalOperator.includes('Jio')) finalOperator = 'Jio';
    else if (finalOperator.includes('Airtel')) finalOperator = 'Airtel';
    else if (finalOperator.includes('Vodafone') || finalOperator.includes('Idea') || finalOperator === 'Vi') finalOperator = 'Vi';
    else if (finalOperator.includes('BSNL')) finalOperator = 'BSNL';

    return {
      operator: finalOperator,
      circle: data.circle
    };
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
