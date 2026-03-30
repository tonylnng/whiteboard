import { Injectable } from '@nestjs/common';
import { LlmGatewayService, LLMMessage } from '../llm-gateway/llm-gateway.service';

function extractJson(text: string): any {
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

@Injectable()
export class CanvasAgentService {
  constructor(private llm: LlmGatewayService) {}

  async processRequest(userMessage: string, canvasState: any, chatHistory: LLMMessage[] = []): Promise<any> {
    const shapes = canvasState.shapes || [];
    const viewport = canvasState.viewportBounds || { x: 0, y: 0, w: 1200, h: 800 };
    const cx = Math.round(viewport.x + viewport.w / 2);
    const cy = Math.round(viewport.y + viewport.h / 2);

    const systemPrompt = `You are a canvas AI assistant. Return ONLY raw JSON, no markdown, no code blocks.

Response format:
{"actions": [ACTION, ...], "message": "brief reply to user"}

Actions:
- create_sticky: {"type":"create_sticky","params":{"x":N,"y":N,"width":200,"height":120,"text":"ACTUAL CONTENT HERE","color":"yellow"}}
- create_text: {"type":"create_text","params":{"x":N,"y":N,"text":"ACTUAL CONTENT HERE","fontSize":"m"}}
- create_shape: {"type":"create_shape","params":{"x":N,"y":N,"type":"rectangle","width":160,"height":80,"text":"label","color":"blue"}}
- update_shape: {"type":"update_shape","params":{"id":"ID","color":"yellow"}} — use this to change color or text of EXISTING shapes, DO NOT delete+recreate
- move_shape: {"type":"move_shape","params":{"id":"ID","x":N,"y":N}}
- delete_shape: {"type":"delete_shape","params":{"id":"ID"}}

RULES:
1. To change color of existing shapes: use update_shape with the shape's id and new color — NEVER delete and recreate
2. Always put meaningful text in the "text" field - never leave it empty when creating
3. Place shapes near viewport center (${cx}, ${cy})
4. For 3 items in a row: x = ${cx-230}, ${cx}, ${cx+230}, same y = ${cy}
5. For 3 items in a column: same x = ${cx}, y = ${cy-150}, ${cy}, ${cy+150}
6. Valid colors: yellow, green, blue, orange, violet, light-red, light-blue, light-green

Canvas has ${shapes.length} shapes:
${shapes.slice(0, 20).map((s: any) => `  [${s.id}] ${s.type} color=${s.color||'?'} "${s.text||''}" at(${s.x},${s.y})`).join('\n') || '  (empty)'}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: userMessage },
    ];

    const response = await this.llm.chat(messages, { temperature: 0.3, maxTokens: 2048 });
    const parsed = extractJson(response.content);
    if (parsed && parsed.actions) return parsed;
    return { actions: [], message: response.content };
  }
}
