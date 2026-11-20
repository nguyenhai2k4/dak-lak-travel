import { getDb } from '../db/database.ts';
import { CmsUser, UserRole } from '../../src/types/index.ts';
import { AuthUser, hashPassword } from './auth.ts';
import { ServiceError } from './errors.ts';

interface UserRow {
  id: number;
  email: string;
  display_name: string;
  role: UserRole;
  is_active: number;
  created_at: string;
}

function mapUserRow(u: UserRow): CmsUser {
  return {
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    role: u.role,
    isActive: u.is_active === 1,
    createdAt: u.created_at,
  };
}

export function listUsers(admin: AuthUser): CmsUser[] {
  if (admin.role !== 'admin') {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'Chỉ quản trị viên (Admin) mới có quyền thực hiện thao tác này.'
    );
  }

  const db = getDb();
  const rows = db
    .prepare('SELECT id, email, display_name, role, is_active, created_at FROM users ORDER BY id ASC')
    .all() as unknown as UserRow[];

  return rows.map(mapUserRow);
}

export function findAuthUserByEmail(email: string): AuthUser | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT id, email, display_name, role, is_active FROM users WHERE email = ? LIMIT 1'
    )
    .get(email.trim().toLowerCase()) as
    | {
        id: number;
        email: string;
        display_name: string;
        role: UserRole;
        is_active: number;
      }
    | undefined;

  if (!row || row.is_active !== 1) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: true,
  };
}

export function createUser(
  admin: AuthUser,
  body: { email?: unknown; displayName?: unknown; password?: unknown; role?: unknown }
): CmsUser {
  if (admin.role !== 'admin') {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'Chỉ quản trị viên (Admin) mới có quyền thực hiện thao tác này.'
    );
  }

  const email = String(body.email || '').trim().toLowerCase();
  const displayName = String(body.displayName || '').trim();
  const password = String(body.password || '');
  const role: UserRole = body.role === 'admin' ? 'admin' : 'writer';

  if (!email || !displayName || password.length < 6) {
    throw new ServiceError(
      400,
      'VALIDATION_ERROR',
      'Email, tên hiển thị và mật khẩu (tối thiểu 6 ký tự) là bắt buộc.'
    );
  }

  const db = getDb();
  const dup = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (dup) {
    throw new ServiceError(409, 'CONFLICT', 'Email này đã tồn tại trong hệ thống.');
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO users (email, display_name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`
    )
    .run(email, displayName, hashPassword(password), role, now);

  return {
    id: Number(result.lastInsertRowid),
    email,
    displayName,
    role,
    isActive: true,
    createdAt: now,
  };
}

export function updateUser(
  admin: AuthUser,
  id: number,
  body: { isActive?: unknown; role?: unknown }
): CmsUser {
  if (admin.role !== 'admin') {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'Chỉ quản trị viên (Admin) mới có quyền thực hiện thao tác này.'
    );
  }
  if (!Number.isInteger(id)) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'ID tài khoản không hợp lệ.');
  }

  const db = getDb();
  const existing = db
    .prepare('SELECT id, email, display_name, role, is_active, created_at FROM users WHERE id = ?')
    .get(id) as UserRow | undefined;

  if (!existing) {
    throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản.');
  }

  if (admin.id === id && body.isActive === false) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Không thể tự khóa tài khoản đang đăng nhập.');
  }

  const nextActive =
    typeof body.isActive === 'boolean' ? (body.isActive ? 1 : 0) : existing.is_active;
  const nextRole: UserRole =
    body.role === 'admin' || body.role === 'writer' ? body.role : existing.role;

  db.prepare('UPDATE users SET is_active = ?, role = ? WHERE id = ?').run(nextActive, nextRole, id);

  return {
    id: existing.id,
    email: existing.email,
    displayName: existing.display_name,
    role: nextRole,
    isActive: nextActive === 1,
    createdAt: existing.created_at,
  };
}
