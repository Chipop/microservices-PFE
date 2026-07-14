import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainEventPublisher } from '../events/domain-event.publisher';
import { Project, ProjectInvitation, ProjectMember } from './entities/project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectMember, ProjectInvitation])],
  controllers: [ProjectsController],
  providers: [ProjectsService, DomainEventPublisher],
})
export class ProjectsModule {}
