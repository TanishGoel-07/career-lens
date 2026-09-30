import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CodeExecutionController } from './code-execution.controller';
import { CodeExecutionService } from './code-execution.service';
import { CodingProblemsService } from './coding-problems.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'code-execution' })],
  controllers: [CodeExecutionController],
  providers: [CodeExecutionService, CodingProblemsService],
  exports: [CodeExecutionService, CodingProblemsService],
})
export class CodeExecutionModule {}
