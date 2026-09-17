import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';
import { ResumesRepository } from './resumes.repository';
import { StorageService } from './storage.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'resume-processing' })],
  controllers: [ResumesController],
  providers: [ResumesService, ResumesRepository, StorageService],
  exports: [ResumesRepository, StorageService],
})
export class ResumesModule {}
