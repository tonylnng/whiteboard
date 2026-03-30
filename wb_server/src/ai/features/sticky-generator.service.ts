import { Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class StickyGeneratorService {
  constructor(private llm: LlmGatewayService) {}

  async generate(topic: string, count: number = 8): Promise<any[]> {
    const response = await this.llm.chat([
      {
        role: 'system',
        content: `Generate ${count} sticky note ideas for the given topic. Each idea should be concise (10-30 words). Output JSON array: [{"text": "...", "color": "#hex", "category": "..."}] Use colors: #FEFF9C (yellow), #FF7EB3 (pink), #7AFCFF (blue), #98FB98 (green), #FFB347 (orange), #DDA0DD (purple). Output only JSON array.`,
      },
      { role: 'user', content: `Topic: ${topic}` },
    ], { temperature: 0.8 });

    try {
      const parsed = JSON.parse(response.content);
      return Array.isArray(parsed) ? parsed : parsed.stickies || parsed.notes || [];
    } catch { return []; }
  }
}
