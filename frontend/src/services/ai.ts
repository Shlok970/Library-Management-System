import { GoogleGenAI, Type } from "@google/genai";
import { Book } from "../types";

export const aiService = {
  async getRecommendations(userPreferences: string, availableBooks: Book[]) {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set. AI recommendations are disabled.");
        return [];
      }
      const ai = new GoogleGenAI({ apiKey });
      const bookContext = availableBooks.map(b => 
        `ID: ${b.id}, Title: ${b.title}, Author: ${b.author}, Category: ${b.category}, Description: ${b.description}`
      ).join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on these books in the library:\n${bookContext}\n\nRecommend 3 books for a user who likes: ${userPreferences}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                bookId: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["bookId", "reason"]
            }
          }
        }
      });

      const recommendations = JSON.parse(response.text || "[]");
      return recommendations as { bookId: string; reason: string }[];
    } catch (error) {
      console.error("AI Recommendation Error:", error);
      return [];
    }
  }
};
