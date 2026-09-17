import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CodeExecutionController } from './code-execution.controller';
import { CodeExecutionService } from './code-execution.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'code-execution' })],
  controllers: [CodeExecutionController],
  providers: [CodeExecutionService],
})
export class CodeExecutionModule {}
