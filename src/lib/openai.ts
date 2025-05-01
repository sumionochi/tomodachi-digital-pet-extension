import OpenAI from 'openai';

// Instantiate with your API key
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });