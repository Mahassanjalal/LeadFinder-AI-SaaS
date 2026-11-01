// AI client backed by Freebuff API (OpenAI-compatible).
// Set OPENAI_API_KEY in .env (points to https://freebuff.com/api/v1/paid).
// Falls back to deterministic generators in the calling routes if the key is missing or the request fails.
import OpenAI from 'openai';

let _client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!_client) {
    _client = new OpenAI({
      apiKey,
      baseURL: 'https://freebuff.com/api/v1/paid',
    });
  }
  return _client;
}

export async function chatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getClient();
  if (!client) {
    console.warn('OPENAI_API_KEY not set — AI features will use deterministic fallback.');
    return '';
  }
  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });
    return response.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('Freebuff API chat completion failed:', error);
    return '';
  }
}

export function stripMarkdownCodeBlocks(text: string): string {
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/g;
  const match = codeBlockRegex.exec(text);
  if (match && match[1]) {
    return match[1].trim();
  }
  return text.trim();
}

export function parseAIJson<T>(raw: string): T | null {
  const cleaned = stripMarkdownCodeBlocks(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
