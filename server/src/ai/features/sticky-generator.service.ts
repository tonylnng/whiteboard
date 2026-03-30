import { Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';

function extractJson(text: string): any {
  // Strip markdown code blocks
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  // Try direct parse
  try { return JSON.parse(cleaned); } catch {}
  // Try to find JSON array
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
  // Try to find JSON object
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  return null;
}

@Injectable()
export class StickyGeneratorService {
  constructor(private llm: LlmGatewayService) {}

  async generate(topic: string, count: number = 8): Promise<any[]> {
    const response = await this.llm.chat([
      {
        role: 'system',
        content: `Generate exactly ${count} sticky note ideas for the given topic. Each must be concise (10-30 words).
Return ONLY a raw JSON array, no markdown, no explanation:
[{"text": "idea here", "color": "yellow", "category": "category"}, ...]
Use colors: yellow, green, blue, orange, violet, light-red, light-blue, light-green`,
      },
      { role: 'user', content: `Topic: ${topic}` },
    ], { temperature: 0.8, maxTokens: 2048 });

    const parsed = extractJson(response.content);
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.stickies) return parsed.stickies;
    if (parsed?.notes) return parsed.notes;
    if (parsed?.items) return parsed.items;
    
    // Last resort: try to extract from text manually
    console.error('[StickyGenerator] Could not parse:', response.content.substring(0, 200));
    return [];
  }
}
