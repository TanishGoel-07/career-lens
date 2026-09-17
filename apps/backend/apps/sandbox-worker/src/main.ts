import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Runs as its own container/host, separate from apps/api and
 * apps/job-worker, with `docker` available on its PATH to launch
 * per-submission sandbox containers (docker-outside-of-docker or a
 * dedicated VM — NOT docker-in-docker with a shared daemon that would
 * undermine the isolation). See docs/sandbox-security.md.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  Logger.log('CareerLens sandbox-worker started — consuming: code-execution');
  await app.init();
}
bootstrap();
