import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainEventPublisher } from '../events/domain-event.publisher';
import { CommentsController, InternalCommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment])],
  controllers: [CommentsController, InternalCommentsController],
  providers: [CommentsService, DomainEventPublisher],
})
export class CommentsModule {}
