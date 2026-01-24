import { GoogleGenerativeAI } from "@google/generative-ai";

// Access the variable from the environment
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  console.error("Gemini API Key is missing! Check your .env file.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // or "gemini-pro"
});