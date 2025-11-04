
import { GoogleGenAI, Modality } from "@google/genai";

// This error message will be caught by the UI components.
const API_KEY_ERROR_MESSAGE = "API_KEY_MISSING";

const getAiClient = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error(API_KEY_ERROR_MESSAGE);
  }
  return new GoogleGenAI({ apiKey });
};


export const generateExampleSentence = async (word: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a single, clear, and concise example sentence for the word: "${word}"`,
        config: {
          temperature: 0.7,
          maxOutputTokens: 50,
          // Per Gemini docs, add thinkingConfig when using maxOutputTokens with gemini-2.5-flash to avoid empty responses.
          thinkingConfig: { thinkingBudget: 25 },
        }
    });
    return response.text.trim();
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error; // Re-throw the specific error for the UI to catch
    }
    console.error("Error generating sentence with Gemini:", error);
    return "Could not generate sentence.";
  }
};

export const explainText = async (text: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Explain the following word or phrase in a simple way, suitable for a vocabulary learner. Provide a definition and one example sentence.\n\nText: "${text}"`,
        config: {
          temperature: 0.5,
          maxOutputTokens: 150,
          thinkingConfig: { thinkingBudget: 75 },
        }
    });
    return response.text.trim();
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error explaining text with Gemini:", error);
    return "Could not get explanation.";
  }
};

export const generateForPrompt = async (promptTemplate: string, sourceValues: Record<string, string>): Promise<string> => {
  const filledPrompt = promptTemplate.replace(/{{(.*?)}}/g, (_, columnName) => {
    return sourceValues[columnName.trim()] || `[${columnName.trim()}]`;
  });

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: filledPrompt,
        config: {
          temperature: 0.8,
          maxOutputTokens: 100,
          thinkingConfig: { thinkingBudget: 50 },
        }
    });
    return response.text.trim().replace(/^"|"$/g, ''); // Also remove quotes
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error generating for prompt with Gemini:", error);
    return "Generation failed.";
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });
    // FIX: response.candidates can be undefined, use optional chaining and nullish coalescing to prevent runtime errors.
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? '';
  } catch (error: any) {
    if (error.message === API_KEY_ERROR_MESSAGE) {
      throw error;
    }
    console.error("Error generating speech with Gemini:", error);
    return "";
  }
};
