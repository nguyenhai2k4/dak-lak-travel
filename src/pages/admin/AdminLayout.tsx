import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { cmsApi } from '../../services/cmsApi';
import { CmsUser } from '../../types';

interface AdminAuthContextValue {
  user: CmsUser;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminLayout');
  return ctx;
}

export const AdminLayout: React.FC = () => {
  const [user, setUser] = useState<CmsUser | null>(null);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useAppContext();

  useEffect(() => {
    let cancelled = false;
    cmsApi.getMe().then((u) => {
      if (cancelled) return;
      if (!u) {
        navigate('/admin/login', { replace: true });
      } else {
        setUser(u);
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const logout = async () => {
    await cmsApi.logout();
    showToast('Đã đăng xuất khỏi CMS.');
    navigate('/admin/login', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen do-paper-surface flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#D48C46] border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-stone-600">Đang xác thực phiên làm việc...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-[#D48C46] text-[#132A1E]'
        : 'text-stone-200 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <AdminAuthContext.Provider value={{ user, logout }}>
      <div className="min-h-screen do-paper-surface flex flex-col">
        <header className="sticky top-0 z-30 bg-[#132A1E] text-[#F7F3EB] border-b border-[#D48C46]/30 shadow-md">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link to="/admin" className="flex items-center gap-2.5 shrink-0">
                <img src="/dak-lak-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                <div className="leading-tight">
                  <span className="block font-serif font-bold text-lg tracking-wide">
                    ĐẮK LẮK CMS
                  </span>
                  <span className="block text-[10px] uppercase tracking-widest text-[#D48C46]">
                    {user.role === 'admin' ? 'Ban Biên Tập (Admin)' : 'Cổng Tác Giả (Writer)'}
                  </span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-1.5">
                <NavLink to="/admin" end className={navLinkClass}>
                  Danh sách bài viết
                </NavLink>
                <NavLink to="/admin/posts/new" className={navLinkClass}>
                  + Viết bài mới
                </NavLink>
                {user.role === 'admin' && (
                  <NavLink to="/admin/users" className={navLinkClass}>
                    Tác giả &amp; Phân quyền
                  </NavLink>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right leading-tight">
                <span className="block text-xs font-bold text-white">{user.displayName}</span>
                <span className="block text-[10px] text-stone-300">{user.email}</span>
              </div>

              <Link
                to="/"
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-stone-100 transition-colors"
              >
                Xem trang chính ↗
              </Link>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 rounded-xl bg-[#8C3B2B] hover:bg-[#a64634] text-xs font-bold text-white transition-colors"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </AdminAuthContext.Provider>
  );
};
