import { Inject, Injectable } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../shared/config/database/drizzle.provider';
import { UserEmailAlreadyExistsError } from '../../domain/errors/user-errors';
import { User } from '../../domain/user.entity';
import { PaginatedUsers, UserRepository } from '../../domain/user.repository';
import { users } from './schema';

const PG_UNIQUE_VIOLATION = '23505';

type UserRow = typeof users.$inferSelect;

function toEntity(row: UserRow): User {
  return User.restore(row);
}

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.user_id, id))
      .limit(1);

    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findMany({ page, limit }: { page: number; limit: number }): Promise<PaginatedUsers> {
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(users)
        .orderBy(users.user_id)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(users),
    ]);

    return { items: rows.map(toEntity), total };
  }

  async save(user: User): Promise<void> {
    try {
      await this.db.insert(users).values({
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        password_hash: user.password_hash,
        role_id: user.role_id,
      }).onConflictDoUpdate({
        target: users.user_id,
        set: {
          name: user.name,
          email: user.email,
          password_hash: user.password_hash,
          role_id: user.role_id,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new UserEmailAlreadyExistsError(user.email, { cause: error });
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.user_id, id));
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return (
    candidate.code === PG_UNIQUE_VIOLATION || isUniqueViolation(candidate.cause)
  );
}
