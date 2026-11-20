import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { cmsApi } from '../../services/cmsApi';
import { CmsUser, UserRole } from '../../types';
import { useAdminAuth } from './AdminLayout';

export const AdminUsersPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { showToast } = useAppContext();
  const [users, setUsers] = useState<CmsUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('writer');
  const [creating, setCreating] = useState(false);

  if (user.role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await cmsApi.getUsers();
      setUsers(list);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không tải được danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const created = await cmsApi.createUser({ email, displayName, password, role });
      setUsers((prev) => [...prev, created]);
      setEmail('');
      setDisplayName('');
      setPassword('');
      setRole('writer');
      showToast(`Đã tạo tài khoản ${created.displayName} (${created.role}).`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Tạo tài khoản thất bại.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (target: CmsUser) => {
    try {
      const updated = await cmsApi.updateUser(target.id, { isActive: !target.isActive });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(updated.isActive ? 'Đã kích hoạt tài khoản.' : 'Đã tạm khóa tài khoản.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cập nhật thất bại.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#132A1E]">Quản lý Tác giả &amp; Biên tập viên</h1>
        <p className="text-sm text-stone-600 mt-1">
          Tài khoản <strong>Writer</strong> có thể viết bài và gửi duyệt; tài khoản{' '}
          <strong>Admin</strong> kiểm duyệt và xuất bản bài viết.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreateUser}
          className="lg:col-span-4 rounded-2xl bg-white border border-[#E5DEC9] p-6 space-y-4 h-fit shadow-xs"
        >
          <h2 className="font-serif text-xl font-bold text-[#132A1E]">+ Thêm tài khoản mới</h2>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-600">Tên hiển thị</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-600">Email đăng nhập</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tacgia@daklak.travel"
              className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-600">Mật khẩu (tối thiểu 6 ký tự)</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-stone-600">Vai trò</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-sm bg-white"
            >
              <option value="writer">Writer (Tác giả)</option>
              <option value="admin">Admin (Ban biên tập)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full py-2.5 rounded-xl bg-[#132A1E] hover:bg-[#8C3B2B] text-[#F7F3EB] text-sm font-bold transition-colors disabled:opacity-60"
          >
            {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </form>

        <div className="lg:col-span-8 rounded-2xl bg-white border border-[#E5DEC9] overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-8 text-center text-sm text-stone-500">Đang tải danh sách...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F7F3EB] border-b border-[#E5DEC9] text-xs uppercase text-stone-600">
                  <tr>
                    <th className="px-5 py-3">Tác giả</th>
                    <th className="px-5 py-3">Vai trò</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DEC9]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F7F3EB]/40">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[#132A1E]">{u.displayName}</div>
                        <div className="text-xs text-stone-500">{u.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-[#132A1E] text-[#D48C46]'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            u.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {u.id !== user.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            className="px-3 py-1 rounded-lg border border-[#D9CEB8] text-xs font-semibold hover:bg-stone-100"
                          >
                            {u.isActive ? 'Tạm khóa' : 'Kích hoạt'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
