import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum CategoryRole {
  CATEGORY_OWNER = 'CATEGORY_OWNER',
  CATEGORY_ADMIN = 'CATEGORY_ADMIN',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER',
}

export enum CategoryInvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

@Entity({ name: 'categories' })
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  workspace_id: number;

  @Column({ type: 'varchar', length: 200 })
  workspace_name_snapshot: string;

  @Column({ type: 'int' })
  @Index()
  author_user_id: number;

  @Column({ type: 'int' })
  @Index()
  owner_user_id: number;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'timestamptz', nullable: true })
  archived_at: Date | null;

  @Column({ type: 'int', nullable: true })
  archived_by_user_id: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @Column({ type: 'int', nullable: true })
  deleted_by_user_id: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

@Entity({ name: 'category_members' })
@Unique(['category_id', 'user_id'])
export class CategoryMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  category_id: number;

  @Column({ type: 'int' })
  @Index()
  user_id: number;

  @Column({ type: 'enum', enum: CategoryRole })
  role: CategoryRole;

  @Column({ type: 'int' })
  added_by_user_id: number;

  @Column({ type: 'timestamptz', nullable: true })
  removed_at: Date | null;

  @Column({ type: 'int', nullable: true })
  removed_by_user_id: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}

@Entity({ name: 'category_invitations' })
export class CategoryInvitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  category_id: number;

  @Column({ type: 'varchar', length: 254 })
  @Index()
  invited_email: string;

  @Column({ type: 'int', nullable: true })
  invited_user_id: number | null;

  @Column({ type: 'enum', enum: CategoryRole })
  role: CategoryRole;

  @Column({ type: 'varchar', length: 64, unique: true })
  token_hash: string;

  @Column({ type: 'enum', enum: CategoryInvitationStatus, default: CategoryInvitationStatus.PENDING })
  @Index()
  status: CategoryInvitationStatus;

  @Column({ type: 'int' })
  created_by_user_id: number;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  responded_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
