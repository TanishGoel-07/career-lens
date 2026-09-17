import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ResumesService } from './resumes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OwnershipGuard, CheckOwnership } from '../common/guards/ownership.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('resumes')
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: any) {
    return this.resumesService.upload(user.id, file);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.resumesService.listForUser(user.id);
  }

  @UseGuards(OwnershipGuard)
  @CheckOwnership({ model: 'resume', paramIdKey: 'id' })
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumesService.getForUser(user.id, id);
  }

  @UseGuards(OwnershipGuard)
  @CheckOwnership({ model: 'resume', paramIdKey: 'id' })
  @Get(':id/evaluation')
  getEvaluation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumesService.getEvaluation(user.id, id);
  }
}
