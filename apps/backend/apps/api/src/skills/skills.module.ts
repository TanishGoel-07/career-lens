import { Module } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillGraphService } from './skill-graph.service';
import { SkillGapService } from './skill-gap.service';

@Module({
  controllers: [SkillsController],
  providers: [SkillGraphService, SkillGapService],
  exports: [SkillGraphService, SkillGapService],
})
export class SkillsModule {}
