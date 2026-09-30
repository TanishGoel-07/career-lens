import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { GitHubService } from './github.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class SyncGitHubDto {
  @IsString()
  username!: string;
}

@ApiTags('github')
@UseGuards(JwtAuthGuard)
@Controller('github')
export class GitHubController {
  constructor(private readonly githubService: GitHubService) {}

  @Post('sync')
  sync(@CurrentUser() user: AuthenticatedUser, @Body() dto: SyncGitHubDto) {
    return this.githubService.syncProfile(user.id, dto.username);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.githubService.getProfile(user.id);
  }
}
