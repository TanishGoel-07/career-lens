import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@career-lens/db';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
