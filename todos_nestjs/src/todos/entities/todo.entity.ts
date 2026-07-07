import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Mirrors the original todos_django `Todo` model 1:1 so this service stays a
 * drop-in replacement behind the gateway:
 *   user_id (from the JWT, never the client) · title · done · created_at
 */
@Entity({ name: 'todos' })
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  // The id pulled from the JWT `user_id` claim. Server-side only — never
  // serialized to the client (see TodosService.toResponse).
  @Column({ name: 'user_id', type: 'int' })
  user_id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'boolean', default: false })
  done: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
