import { Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class TextAssistantService {
  constructor(private llm: LlmGatewayService) {}

  async process(text: string, action: string, targetLang?: string): Promise<string> {
    const instructions: Record<string, string> = {
      'rewrite': 'Rewrite the following text differently while keeping the same meaning',
      'translate': `Translate the following text to ${targetLang || 'English'}`,
      'expand': 'Expand the following text with more details',
      'simplify': 'Simplify the following text, keep core meaning but be more concise',
      'fix-grammar': 'Fix grammar and spelling errors in the following text',
      'to-bullet': 'Convert the following text to bullet points',
      'formalize': 'Rewrite the following text in a more formal tone',
      'casualize': 'Rewrite the following text in a more casual, friendly tone',
    };

    const response = await this.llm.chat([
      { role: 'system', content: `${instructions[action] || instructions.rewrite}. Output only the processed text, no explanations.` },
      { role: 'user', content: text },
    ], { temperature: 0.5 });

    return response.content;
  }
}
