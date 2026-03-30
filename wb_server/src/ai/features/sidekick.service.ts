import { Injectable } from '@nestjs/common';
import { LlmGatewayService, LLMMessage } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class SidekickService {
  constructor(private llm: LlmGatewayService) {}

  getBuiltinSidekicks() {
    return [
      { id: 'ux-expert', name: 'UX Expert', systemPrompt: 'You are a senior UX designer. Provide specific design suggestions focused on usability, accessibility, and user experience.' },
      { id: 'architect', name: 'System Architect', systemPrompt: 'You are a senior system architect. Expert in microservices, database design, API design, and scalability.' },
      { id: 'pm', name: 'Product Manager', systemPrompt: 'You are a senior product manager. Expert in requirements analysis, user stories, prioritization, and roadmap planning.' },
      { id: 'copywriter', name: 'Copywriter', systemPrompt: 'You are a professional copywriter. Expert in UI copy, product descriptions, and marketing content. Concise and impactful.' },
      { id: 'facilitator', name: 'Meeting Facilitator', systemPrompt: 'You are an expert meeting facilitator. Help structure discussions, summarize points, identify action items, and keep conversations productive.' },
    ];
  }

  async invoke(sidekickId: string, message: string, context?: any, chatHistory: LLMMessage[] = []): Promise<string> {
    const sidekick = this.getBuiltinSidekicks().find(s => s.id === sidekickId);
    const systemPrompt = sidekick?.systemPrompt || 'You are a helpful AI assistant.';

    const messages: LLMMessage[] = [{ role: 'system', content: systemPrompt }, ...chatHistory];
    if (context?.boardContent) {
      messages.push({ role: 'user', content: `[Board Context]\n${context.boardContent}\n\n[Question] ${message}` });
    } else {
      messages.push({ role: 'user', content: message });
    }

    const response = await this.llm.chat(messages, { temperature: 0.7 });
    return response.content;
  }
}
