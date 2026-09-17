import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from '@career-lens/db';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() headline?: string;
  @IsOptional() @IsInt() @Min(0) experienceYears?: number;
  @IsOptional() @IsInt() @Min(1) learningPaceHoursPerWeek?: number;
}

@ApiTags('users')
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, role: true, createdAt: true, profile: true },
    });
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.prisma.profile.upsert({
      where: { userId: user.id },
      update: dto,
      create: { userId: user.id, ...dto },
    });
  }
}
