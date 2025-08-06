import dotenv from "dotenv";
dotenv.config();

export const IGusername: string = process.env.IGusername || "default_IGusername";
export const IGpassword: string = process.env.IGpassword || "default_IGpassword";

export const geminiApiKey = process.env.GEMINI_API_KEY || "API_KEY";