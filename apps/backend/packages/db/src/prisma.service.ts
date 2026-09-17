import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper so Nest can manage the Prisma connection lifecycle.
 * This is the ONLY place @prisma/client is imported outside repositories
 * that extend it — controllers/services depend on repository classes,
 * never on PrismaClient directly (architecture doc §5 layering rule).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
