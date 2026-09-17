import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from '@career-lens/db';

import { ResumeProcessor } from './processors/resume.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { AiAnalysisProcessor } from './processors/ai-analysis.processor';
import { JobIngestionProcessor } from './processors/job-ingestion.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') },
      }),
    }),
    BullModule.registerQueue(
      { name: 'resume-processing' },
      { name: 'embeddings' },
      { name: 'ai-analysis' },
      { name: 'job-ingestion' },
    ),
  ],
  providers: [
    PrismaService,
    ResumeProcessor,
    EmbeddingProcessor,
    AiAnalysisProcessor,
    JobIngestionProcessor,
  ],
})
export class AppModule {}
