import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DomainEventPublisher } from '../events/domain-event.publisher';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category, CategoryInvitation, CategoryMember } from './entities/category.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Category, CategoryMember, CategoryInvitation])],
  controllers: [CategoriesController],
  providers: [CategoriesService, DomainEventPublisher],
})
export class CategoriesModule {}
