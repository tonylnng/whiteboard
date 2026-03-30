import { Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class TextToDiagramService {
  constructor(private llm: LlmGatewayService) {}

  async generate(description: string, diagramType?: string): Promise<any> {
    const response = await this.llm.chat([
      {
        role: 'system',
        content: `You are a diagram generation expert. Generate structured diagram data based on user description. Output JSON format: { "type": "flowchart|mindmap|sequence|er|architecture", "shapes": [ { "id": "unique_id", "type": "rectangle|ellipse|diamond|arrow|text", "x": number, "y": number, "width": number, "height": number, "text": "label", "color": "#hex", "from": "sourceId (for arrows)", "to": "targetId (for arrows)" } ] } Rules: arrange elements logically, min 40px spacing, rectangles 160x80, diamonds 120x80. Output only JSON.`,
      },
      { role: 'user', content: diagramType ? `Create a ${diagramType}: ${description}` : description },
    ], { responseFormat: 'json_object', temperature: 0.3 });

    try { return JSON.parse(response.content); } catch { return { type: 'flowchart', shapes: [] }; }
  }
}
