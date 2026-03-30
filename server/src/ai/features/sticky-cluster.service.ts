import { Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class StickyClusterService {
  constructor(private llm: LlmGatewayService) {}

  async cluster(stickies: Array<{ id: string; text: string }>, mode: string = 'keyword'): Promise<any> {
    const list = stickies.map(s => `[${s.id}] ${s.text}`).join('\n');
    const response = await this.llm.chat([
      {
        role: 'system',
        content: `Group the following sticky notes by ${mode === 'sentiment' ? 'sentiment (positive/negative/neutral/question)' : 'theme/keyword'}. Output JSON: {"clusters": [{"name": "...", "color": "#hex", "stickyIds": ["id1","id2"]}]} Each sticky belongs to exactly one cluster. Output only JSON.`,
      },
      { role: 'user', content: list },
    ], { responseFormat: 'json_object', temperature: 0.3 });

    try { return JSON.parse(response.content); } catch { return { clusters: [] }; }
  }
}
