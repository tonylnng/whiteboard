import { Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class BoardSummaryService {
  constructor(private llm: LlmGatewayService) {}

  async summarize(elements: Array<{ type: string; text: string }>, format: string = 'summary'): Promise<any> {
    const allText = elements.map(e => `[${e.type}] ${e.text}`).join('\n');
    const formats: Record<string, string> = {
      'meeting-notes': 'structured meeting notes with agenda, discussion points, and conclusions',
      'action-items': 'action items list with - [ ] format, assignee and deadline if mentioned',
      'key-decisions': 'list of key decisions and conclusions',
      'summary': 'concise summary with main themes and key points',
    };

    const response = await this.llm.chat([
      { role: 'system', content: `Analyze whiteboard content and generate ${formats[format] || formats.summary}. Be concise and professional.` },
      { role: 'user', content: `Whiteboard content:\n${allText}` },
    ], { temperature: 0.3 });

    return { content: response.content, format };
  }
}
