import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TextToDiagramService } from './features/text-to-diagram.service';
import { StickyGeneratorService } from './features/sticky-generator.service';
import { StickyClusterService } from './features/sticky-cluster.service';
import { BoardSummaryService } from './features/board-summary.service';
import { TextAssistantService } from './features/text-assistant.service';
import { CanvasAgentService } from './features/canvas-agent.service';
import { AutoLayoutService } from './features/auto-layout.service';
import { SmartConnectService } from './features/smart-connect.service';
import { SidekickService } from './features/sidekick.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private textToDiagram: TextToDiagramService,
    private stickyGenerator: StickyGeneratorService,
    private stickyCluster: StickyClusterService,
    private boardSummary: BoardSummaryService,
    private textAssistant: TextAssistantService,
    private canvasAgent: CanvasAgentService,
    private autoLayout: AutoLayoutService,
    private smartConnect: SmartConnectService,
    private sidekick: SidekickService,
  ) {}

  @Post('text-to-diagram')
  generateDiagram(@Body() body: { description: string; type?: string }) {
    return this.textToDiagram.generate(body.description, body.type);
  }

  @Post('generate-stickies')
  generateStickies(@Body() body: { topic: string; count?: number }) {
    return this.stickyGenerator.generate(body.topic, body.count);
  }

  @Post('cluster-stickies')
  clusterStickies(@Body() body: { stickies: any[]; mode?: string }) {
    return this.stickyCluster.cluster(body.stickies, body.mode);
  }

  @Post('board-summary')
  summarizeBoard(@Body() body: { elements: any[]; format?: string }) {
    return this.boardSummary.summarize(body.elements, body.format);
  }

  @Post('text-assist')
  async textAssist(@Body() body: { text: string; action: string; targetLang?: string }) {
    return { result: await this.textAssistant.process(body.text, body.action, body.targetLang) };
  }

  @Post('canvas-agent')
  agentRequest(@Body() body: { message: string; canvasState: any; chatHistory?: any[] }) {
    return this.canvasAgent.processRequest(body.message, body.canvasState, body.chatHistory);
  }

  @Post('auto-layout')
  arrangeShapes(@Body() body: { shapes: any[]; style?: string; startPosition?: any }) {
    return this.autoLayout.arrange(body.shapes, body.style, body.startPosition);
  }

  @Post('smart-connect')
  suggestConnections(@Body() body: { shapes: any[] }) {
    return this.smartConnect.suggestConnections(body.shapes);
  }

  @Post('sidekick/invoke')
  async invokeSidekick(@Body() body: { sidekickId: string; message: string; context?: any; chatHistory?: any[] }) {
    return { reply: await this.sidekick.invoke(body.sidekickId, body.message, body.context, body.chatHistory) };
  }

  @Post('sidekick/list')
  listSidekicks() {
    return this.sidekick.getBuiltinSidekicks();
  }
}
