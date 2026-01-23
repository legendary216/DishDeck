import { GoogleGenerativeAI } from "@google/generative-ai";

// Replace with your actual API Key from Google AI Studio
const API_KEY = "AIzaSyCGprAuMPgRU1eAsnogOEtJX9yNOPYwpmw"; 
const genAI = new GoogleGenerativeAI(API_KEY);

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });