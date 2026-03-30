import { Injectable } from '@nestjs/common';
import { LlmGatewayService, LLMMessage } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class CanvasAgentService {
  constructor(private llm: LlmGatewayService) {}

  async processRequest(userMessage: string, canvasState: any, chatHistory: LLMMessage[] = []): Promise<any> {
    const shapes = canvasState.shapes || [];
    const systemPrompt = `You are a canvas AI assistant that can operate on a whiteboard. Available actions: create_shape, update_shape, delete_shape, move_shape, create_text, create_sticky, create_connection, align_shapes, message. Canvas has ${shapes.length} elements. Elements: ${shapes.slice(0, 30).map((s: any) => `[${s.id}] ${s.type} "${s.text || ''}" at (${s.x},${s.y})`).join('\n')} Output JSON: {"actions": [...], "message": "reply to user"}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: userMessage },
    ];

    const response = await this.llm.chat(messages, { responseFormat: 'json_object', temperature: 0.3 });
    try { return JSON.parse(response.content); } catch { return { actions: [], message: response.content }; }
  }
}
