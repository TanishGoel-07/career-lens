import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { validateEnv } from './env.validation';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../.env'),
        resolve(process.cwd(), '../../.env'),
        resolve(__dirname, '../../../../.env'),
      ],
      validate: validateEnv,
    }),
  ],
})
export class ConfigModule {}
