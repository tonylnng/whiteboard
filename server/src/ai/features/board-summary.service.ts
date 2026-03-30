import { Injectable } from '@nestjs/common';
import { LlmGatewayService } from '../llm-gateway/llm-gateway.service';

@Injectable()
export class BoardSummaryService {
  constructor(private llm: LlmGatewayService) {}

  async summarize(elements: Array<{ type: string; text: string }>, format: string = 'summary'): Promise<any> {
    const allText = elements.map(e => `[${e.type}] ${e.text}`).join('\n');

    const formatInstructions: Record<string, string> = {
      'meeting-notes': 'Generate structured meeting notes with agenda, discussion points, and conclusions',
      'action-items': 'Extract all action items in - [ ] format with assignee and deadline if mentioned',
      'key-decisions': 'List all key decisions and conclusions',
      'summary': 'Generate a concise summary with main themes and key points',
      'brainstorm-insights': `Analyze this brainstorming session and provide:

## 🔍 主題分群
Group the ideas into 3-5 main themes. List each theme with its related ideas.

## ⭐ 最有潛力的想法 (Top 5)
Pick the 5 most interesting/promising ideas and explain why briefly.

## 🔄 共同模式
Identify any recurring patterns, concerns, or opportunities mentioned multiple times.

## ✅ 建議下一步行動 (Action Items)
- [ ] Suggest 3-5 concrete next actions based on the content
- [ ] Each action should be specific and actionable

## 📊 摘要
A 2-3 sentence executive summary of the brainstorm session.

Be concise and insightful. Use Traditional Chinese where appropriate.`,
    };

    const response = await this.llm.chat([
      { role: 'system', content: `You are a brainstorming facilitator expert. ${formatInstructions[format] || formatInstructions.summary}` },
      { role: 'user', content: `Whiteboard content:\n${allText}` },
    ], { temperature: 0.4, maxTokens: 2000 });

    return { content: response.content, format };
  }
}
