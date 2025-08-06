import dotenv from "dotenv";
dotenv.config();

export const geminiApiKey = process.env.GEMINI_API_KEY || "API_KEY";