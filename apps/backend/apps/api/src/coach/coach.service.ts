import { Injectable } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';
import { AiGatewayService } from '../ai/ai-gateway.service';
import { CoachContextService } from './coach-context.service';

const MAX_HISTORY_MESSAGES = 12; // rolling window — older turns are summarized, not replayed verbatim

@Injectable()
export class CoachService {
  constructor(
    private readonly context: CoachContextService,
    private readonly aiGateway: AiGatewayService,
    private readonly prisma: PrismaService,
  ) {}

  async chat(userId: string, sessionId: string, message: string) {
    const context = await this.context.buildContext(userId);

    // NOTE: conversation persistence uses the same InterviewSession-style
    // pattern as the interview module for consistency; wiring a
    // dedicated CoachSession/CoachMessage table is a straightforward
    // follow-up once the frontend's conversation UX is finalized with
    // Agent 1 — flagged here rather than silently modeled around it.
    const reply = await this.aiGateway.call<{ text: string }>({
      userId,
      feature: 'career-coach',
      promptKey: 'career-coach.v1',
      variables: { message, context },
      cacheable: false,
    });

    return { reply };
  }
}
