import { Module } from '@nestjs/common';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachContextService } from './coach-context.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [CoachController],
  providers: [CoachService, CoachContextService],
})
export class CoachModule {}
