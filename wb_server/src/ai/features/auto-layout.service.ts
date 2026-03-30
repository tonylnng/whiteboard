import { Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class AutoLayoutService {
  constructor(private llm: LlmGatewayService) {}

  async arrange(shapes: any[], style: string = 'auto', startPosition: any = { x: 100, y: 100 }): Promise<any[]> {
    const list = shapes.map(s => `[${s.id}] ${s.type} "${s.text || ''}" size=${s.width || 160}x${s.height || 80}`).join('\n');
    const response = await this.llm.chat([
      {
        role: 'system',
        content: `Rearrange elements in a clean ${style === 'auto' ? 'appropriate' : style} layout. Start position: (${startPosition.x}, ${startPosition.y}). Min 40px spacing. Output JSON array: [{"id": "shapeId", "x": number, "y": number}]. Output only JSON array.`,
      },
      { role: 'user', content: list },
    ], { responseFormat: 'json_object', temperature: 0.2 });

    try {
      const parsed = JSON.parse(response.content);
      return Array.isArray(parsed) ? parsed : parsed.positions || parsed.layout || [];
    } catch { return []; }
  }
}
