import { Module } from '@nestjs/common';
import { LlmGatewayService } from './llm-gateway/llm-gateway.service';
import { TextToDiagramService } from './features/text-to-diagram.service';
import { StickyGeneratorService } from './features/sticky-generator.service';
import { StickyClusterService } from './features/sticky-cluster.service';
import { BoardSummaryService } from './features/board-summary.service';
import { TextAssistantService } from './features/text-assistant.service';
import { CanvasAgentService } from './features/canvas-agent.service';
import { AutoLayoutService } from './features/auto-layout.service';
import { SmartConnectService } from './features/smart-connect.service';
import { SidekickService } from './features/sidekick.service';
import { AiController } from './ai.controller';

@Module({
  providers: [
    LlmGatewayService,
    TextToDiagramService,
    StickyGeneratorService,
    StickyClusterService,
    BoardSummaryService,
    TextAssistantService,
    CanvasAgentService,
    AutoLayoutService,
    SmartConnectService,
    SidekickService,
  ],
  controllers: [AiController],
})
export class AiModule {}
