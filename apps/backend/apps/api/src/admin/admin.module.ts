import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'resume-processing' }, { name: 'code-execution' }),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
