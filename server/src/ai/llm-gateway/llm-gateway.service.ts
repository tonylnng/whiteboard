import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
}

@Injectable()
export class LlmGatewayService {
  private readonly logger = new Logger('LlmGateway');

  constructor(private config: ConfigService) {}

  async chat(messages: LLMMessage[], options: LLMOptions = {}): Promise<{ content: string; tokensUsed: any }> {
    const model = options.model || this.config.get('AI_DEFAULT_MODEL');
    const baseUrl = this.config.get('OPENROUTER_BASE_URL');
    const apiKey = this.config.get('OPENROUTER_API_KEY');

    this.logger.log(`Calling model=${model}`);

    const body: any = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    // MiniMax models do not support response_format parameter
    const isMinimaxModel = model.toLowerCase().includes('minimax');
    if (options.responseFormat === 'json_object' && !isMinimaxModel) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://whiteboard.toniclab.ai',
        'X-Title': 'Whiteboard Platform',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LLM Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      tokensUsed: data.usage,
    };
  }
}
