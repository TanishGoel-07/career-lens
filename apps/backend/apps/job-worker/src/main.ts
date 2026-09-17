import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * This process has no HTTP server — it only runs BullMQ workers. It's
 * a separate deployable from apps/api so a spike in resume-processing
 * volume (or a stuck AI call) never starves API request handling
 * (architecture §17).
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  Logger.log('CareerLens job-worker started — consuming: resume-processing, embeddings, ai-analysis, job-ingestion');
  await app.init();
}
bootstrap();
