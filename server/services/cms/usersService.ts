import { getDb, isUsingSupabase } from '../../db/database.ts';
import { getSupabaseAdmin } from '../../db/supabaseClient.ts';
import { type CmsUser, type UserRole } from '../../../src/types/index.ts';
import { type AuthUser, hashPassword } from '../core/auth.ts';
import { ServiceError } from '../core/errors.ts';

interface UserRow {
  id: number;
  email: string;
  display_name: string;
  role: UserRole;
  is_active: number | boolean;
  created_at: string;
}

export interface UserLoginRow extends UserRow {
  password_hash: string;
}

function isActiveFlag(val: number | boolean): boolean {
  return val === true || val === 1;
}

function mapUserRow(u: UserRow): CmsUser {
  return {
    id: Number(u.id),
    email: u.email,
    displayName: u.display_name,
    role: u.role,
    isActive: isActiveFlag(u.is_active),
    createdAt: u.created_at,
  };
}

export async function findUserForLoginByEmail(email: string): Promise<UserLoginRow | null> {
  const cleaned = email.trim().toLowerCase();
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, password_hash, role, is_active, created_at')
      .eq('email', cleaned)
      .maybeSingle();
    if (error) {
      throw new Error(`Supabase login query failed: ${error.message}`);
    }
    return (data as UserLoginRow | null) ?? null;
  }

  const db = getDb();
  const row = db
    .prepare(
      'SELECT id, email, display_name, password_hash, role, is_active, created_at FROM users WHERE email = ?'
    )
    .get(cleaned) as UserLoginRow | undefined;
  return row ?? null;
}

export async function listUsers(admin: AuthUser): Promise<CmsUser[]> {
  if (admin.role !== 'admin') {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'Chỉ quản trị viên (Admin) mới có quyền thực hiện thao tác này.'
    );
  }

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, role, is_active, created_at')
      .order('id', { ascending: true });
    if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);
    return ((data || []) as UserRow[]).map(mapUserRow);
  }

  const db = getDb();
  const rows = db
    .prepare('SELECT id, email, display_name, role, is_active, created_at FROM users ORDER BY id ASC')
    .all() as unknown as UserRow[];

  return rows.map(mapUserRow);
}

export async function findAuthUserByEmail(email: string): Promise<AuthUser | null> {
  const cleaned = email.trim().toLowerCase();

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, role, is_active')
      .eq('email', cleaned)
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as UserRow;
    if (!isActiveFlag(row.is_active)) return null;
    return {
      id: Number(row.id),
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      isActive: true,
    };
  }

  const db = getDb();
  const row = db
    .prepare(
      'SELECT id, email, display_name, role, is_active FROM users WHERE email = ? LIMIT 1'
    )
    .get(cleaned) as UserRow | undefined;

  if (!row || !isActiveFlag(row.is_active)) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: true,
  };
}

export async function createUser(
  admin: AuthUser,
  body: { email?: unknown; displayName?: unknown; password?: unknown; role?: unknown }
): Promise<CmsUser> {
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

  const now = new Date().toISOString();

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: dup } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (dup) {
      throw new ServiceError(409, 'CONFLICT', 'Email này đã tồn tại trong hệ thống.');
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        display_name: displayName,
        password_hash: hashPassword(password),
        role,
        is_active: true,
        created_at: now,
      })
      .select('id, email, display_name, role, is_active, created_at')
      .single();

    if (error || !data) {
      throw new Error(`Supabase createUser failed: ${error?.message || 'Unknown error'}`);
    }
    return mapUserRow(data as UserRow);
  }

  const db = getDb();
  const dup = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (dup) {
    throw new ServiceError(409, 'CONFLICT', 'Email này đã tồn tại trong hệ thống.');
  }

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

export async function updateUser(
  admin: AuthUser,
  id: number,
  body: { isActive?: unknown; role?: unknown }
): Promise<CmsUser> {
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

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from('users')
      .select('id, email, display_name, role, is_active, created_at')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) throw new Error(`Supabase updateUser fetch failed: ${fetchErr.message}`);
    if (!existing) {
      throw new ServiceError(404, 'NOT_FOUND', 'Không tìm thấy tài khoản.');
    }

    if (admin.id === id && body.isActive === false) {
      throw new ServiceError(
        400,
        'VALIDATION_ERROR',
        'Không thể tự khóa tài khoản đang đăng nhập.'
      );
    }

    const existingRow = existing as UserRow;
    const nextActive =
      typeof body.isActive === 'boolean' ? body.isActive : isActiveFlag(existingRow.is_active);
    const nextRole: UserRole =
      body.role === 'admin' || body.role === 'writer' ? body.role : existingRow.role;

    const { data: updated, error: updateErr } = await supabase
      .from('users')
      .update({ is_active: nextActive, role: nextRole })
      .eq('id', id)
      .select('id, email, display_name, role, is_active, created_at')
      .single();

    if (updateErr || !updated) {
      throw new Error(`Supabase updateUser failed: ${updateErr?.message || 'Unknown error'}`);
    }
    return mapUserRow(updated as UserRow);
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
    typeof body.isActive === 'boolean'
      ? body.isActive
        ? 1
        : 0
      : isActiveFlag(existing.is_active)
        ? 1
        : 0;
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
