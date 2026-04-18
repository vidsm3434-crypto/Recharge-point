import { GoogleGenAI, Type } from "@google/genai";

// Use the API key from environment
export async function detectOperatorAndCircle(mobile: string) {
  if (!mobile || mobile.length < 10) return null;

  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!apiKey) {
      console.warn("Gemini API key not found for operator detection");
      return null;
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Identify the Indian mobile operator and circle (state) for the number: ${mobile}.
    Return JSON: {"operator": "Airtel" | "Jio" | "Vi" | "BSNL" | "Unknown", "circle": "State Name" | "Unknown"}.
    Note: Operator must strictly be one of [Airtel, Jio, Vi, BSNL].
    Common Circles: West Bengal, Bihar, Delhi, Maharashtra, Karnataka, Tamil Nadu, Uttar Pradesh, Rajasthan, Gujarat, Punjab, Haryana, Kerala, Andhra Pradesh, Madhya Pradesh, Assam, Odisha.`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const data = JSON.parse(response.text);
    
    // Normalization
    let finalOperator = data.operator || 'Unknown';
    if (finalOperator.toLowerCase().includes('jio')) finalOperator = 'Jio';
    else if (finalOperator.toLowerCase().includes('airtel')) finalOperator = 'Airtel';
    else if (finalOperator.toLowerCase().includes('vodafone') || finalOperator.toLowerCase().includes('idea') || finalOperator === 'Vi') finalOperator = 'Vi';
    else if (finalOperator.toLowerCase().includes('bsnl')) finalOperator = 'BSNL';

    return {
      operator: finalOperator,
      circle: data.circle || 'Unknown'
    };
  } catch (error) {
    console.error("AI Operator Detection Error:", error);
    return null;
  }
}

// Fallback logic based on common prefixes if AI is unavailable or slow
export function detectOperatorByPrefix(mobile: string) {
  if (mobile.length < 4) return null;
  const p3 = mobile.substring(0, 3);
  const p2 = mobile.substring(0, 2);

  // Broad Jio series (600, 700, 800, 900, etc)
  if (['600', '700', '800', '810', '820', '830', '840', '850', '860', '870', '880', '890', '900', '910', '920', '930'].includes(p3)) {
    return { operator: 'Jio' };
  }
  
  // Airtel (starts with 9, 8, 7)
  if (['99', '98', '97', '96', '95', '91', '81', '80', '70'].includes(p2)) {
    // Some of these overlap with VI, but let's try p3 for better accuracy
    if (['990', '991', '980', '981', '970', '971', '960', '961', '950', '951', '914', '814', '804', '704'].includes(p3)) return { operator: 'Airtel' };
    if (['991', '992', '993', '994', '995', '996', '997', '998', '999'].includes(p3)) return { operator: 'Airtel' }; // Very common Airtel range
    return { operator: 'Airtel' }; // Default fallback for 9x
  }

  // Vi (Vodafone Idea)
  if (['989', '999', '979', '969', '959', '949', '919', '819', '809', '709', '982', '983', '888', '777'].includes(p3)) return { operator: 'Vi' };

  // BSNL
  if (['94', '84', '74'].includes(p2)) return { operator: 'BSNL' };

  return null;
}
