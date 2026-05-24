import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Helper to fetch image buffer and convert to base64
async function urlToGenerativePart(url: string, mimeType: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };
}

export const generateVisualTags = async (imageUrl: string, title: string, description: string): Promise<string[]> => {
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Skipping AI tag generation.');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      Analyze this lost/found item.
      Title: ${title}
      Description: ${description}
      
      Look closely at the provided image (if any).
      Generate a comma-separated list of up to 5 visual or descriptive tags (e.g., color, brand, distinct marks, item type) that would help identify this exact item.
      Return ONLY the comma-separated list.
    `;

    let result;

    if (imageUrl && imageUrl.startsWith('http')) {
      const imagePart = await urlToGenerativePart(imageUrl, 'image/jpeg');
      result = await model.generateContent([prompt, imagePart]);
    } else {
      result = await model.generateContent(prompt);
    }
    
    const text = result.response.text();
    return text.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
  } catch (error) {
    console.error('Error generating tags with Gemini:', error);
    return [];
  }
};

export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Skipping embedding generation.');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
};

// Cosine Similarity utility
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const verifyClaimContext = async (
  itemData: any,
  claimantData: any
): Promise<{ score: number; reasoning: string }> => {
  if (!apiKey) {
    return { score: 50, reasoning: 'AI verification disabled (no API key).' };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
      You are an intelligent ownership verification assistant for a campus lost and found system.
      A finder has reported an item with the following details:
      - Title: ${itemData.title}
      - Description: ${itemData.description}
      - Found Location: ${itemData.location}
      - Found Time: ${itemData.timeFound || 'Not specified'}
      - Hidden Notes (Only known to finder): ${itemData.hiddenNotes || 'None'}

      A claimant is trying to claim this item and has provided the following contextual answers:
      - Where they lost it: ${claimantData.lostLocation}
      - When they lost it: ${claimantData.lostTime}
      - Route/Building nearby: ${claimantData.route}
      - Last action before losing: ${claimantData.lastAction}
      - Unique identifying features: ${claimantData.uniqueFeatures}

      Analyze the consistency and feasibility between the finder's reality and the claimant's story. 
      Pay special attention to geographical proximity on a campus, timeline logic (fuzzy match within hours), and if their unique features match the hidden notes or description.
      
      Respond with ONLY a strict JSON object (no markdown, no backticks) in the following format:
      {
        "score": <number from 0 to 100 representing confidence they are the owner>,
        "reasoning": "<short 1-2 sentence explanation for the score>"
      }
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    // Clean up potential markdown formatting
    text = text.replace(/^```json/g, '').replace(/```$/g, '').trim();
    const parsed = JSON.parse(text);
    
    return {
      score: parsed.score || 0,
      reasoning: parsed.reasoning || 'Could not determine reasoning.'
    };
  } catch (error) {
    console.error('Error verifying claim context:', error);
    return { score: 50, reasoning: 'AI verification failed due to server error.' };
  }
};
