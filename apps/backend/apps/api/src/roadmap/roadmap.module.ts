import { Module } from '@nestjs/common';
import { RoadmapController } from './roadmap.controller';
import { RoadmapService } from './roadmap.service';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [SkillsModule],
  controllers: [RoadmapController],
  providers: [RoadmapService],
})
export class RoadmapModule {}
