// AI client with dynamic import to avoid bundling z-ai-web-dev-sdk at compile time
let _zai: any = null;

async function getAI() {
  if (!_zai) {
    const { default: ZAI } = await import('z-ai-web-dev-sdk');
    _zai = await ZAI.create();
  }
  return _zai;
}

export async function chatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const zai = await getAI();
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
    return response.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('AI chat completion failed:', error);
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