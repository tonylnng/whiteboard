import { Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class SmartConnectService {
  constructor(private llm: LlmGatewayService) {}

  async suggestConnections(shapes: any[]): Promise<any[]> {
    const list = shapes.map(s => `[${s.id}] "${s.text || s.type}"`).join('\n');
    const response = await this.llm.chat([
      {
        role: 'system',
        content: `Analyze whiteboard elements and suggest logical connections between them. Output JSON: {"connections": [{"fromId": "...", "toId": "...", "label": "relationship", "confidence": 0.0-1.0}]} Only suggest connections with confidence >= 0.6. Output only JSON.`,
      },
      { role: 'user', content: list },
    ], { responseFormat: 'json_object', temperature: 0.3 });

    try {
      const parsed = JSON.parse(response.content);
      return (parsed.connections || []).filter((c: any) => c.confidence >= 0.6);
    } catch { return []; }
  }
}
