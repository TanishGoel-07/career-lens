import { Module } from '@nestjs/common';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResumesModule } from './resumes/resumes.module';
import { JobsModule } from './jobs/jobs.module';
import { MatchingModule } from './matching/matching.module';
import { SkillsModule } from './skills/skills.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { AiModule } from './ai/ai.module';
import { RagModule } from './rag/rag.module';
import { CoachModule } from './coach/coach.module';
import { InterviewModule } from './interview/interview.module';
import { CodeExecutionModule } from './code-execution/code-execution.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,

    // Rate limiting (architecture §18/§22): a conservative global
    // default; individual routes (e.g. auth/login) tighten this further
    // via @Throttle() where brute-force risk is highest.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),

    BullModule.forRootAsync({
      imports: [NestConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') },
      }),
    }),

    AuthModule,
    UsersModule,
    ResumesModule,
    JobsModule,
    MatchingModule,
    SkillsModule,
    RoadmapModule,
    AiModule,
    RagModule,
    CoachModule,
    InterviewModule,
    CodeExecutionModule,
    AdminModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
