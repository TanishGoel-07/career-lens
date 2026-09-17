import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiGatewayService } from './ai-gateway.service';
import { MockProvider } from './providers/mock.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    MockProvider,
    OpenAiProvider,
    GeminiProvider,
    {
      provide: 'AI_PROVIDERS',
      inject: [MockProvider, OpenAiProvider, GeminiProvider],
      useFactory: (mock: MockProvider, openai: OpenAiProvider, gemini: GeminiProvider) => [
        mock,
        openai,
        gemini,
      ],
    },
    {
      // Primary provider first, MockProvider always last as a safety net
      // ONLY in non-production environments — never silently degrade to
      // fabricated data quality in prod without that being an explicit,
      // reviewed decision (hence the environment gate here).
      provide: 'AI_FALLBACK_ORDER',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const primary = config.get<string>('AI_PROVIDER', 'mock');
        const isProd = config.get<string>('NODE_ENV') === 'production';
        if (primary === 'mock') return ['mock'];
        return isProd ? [primary] : [primary, 'mock'];
      },
    },
    AiGatewayService,
  ],
  exports: [AiGatewayService],
})
export class AiModule {}
