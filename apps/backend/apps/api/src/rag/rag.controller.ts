import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RagService } from './rag.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class RagQueryDto {
  @IsString() query!: string;
  @IsOptional() @IsString() ownerType?: 'RESUME' | 'JOB';
  @IsOptional() @IsString() ownerId?: string;
}

@ApiTags('rag')
@UseGuards(JwtAuthGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('query')
  searchKnowledge(@CurrentUser() user: AuthenticatedUser, @Body() dto: RagQueryDto) {
    return this.ragService.queryKnowledge(dto.query, dto.ownerType, dto.ownerId);
  }
}
