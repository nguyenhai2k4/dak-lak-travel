import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { cmsApi } from '../../services/cmsApi';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    cmsApi.getMe().then((u) => {
      if (u) navigate('/admin', { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const user = await cmsApi.login(email, password);
      showToast(`Chào mừng ${user.displayName}!`);
      navigate('/admin', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen do-paper-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#E5DEC9] shadow-2xl overflow-hidden">
        <div className="bg-[#132A1E] px-7 py-6 text-[#F7F3EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/dak-lak-logo.png" alt="Logo Đắk Lắk" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-wide">Cổng Tác Giả &amp; CMS</h1>
              <p className="text-[11px] uppercase tracking-widest text-[#D48C46]">
                Khám Phá Đắk Lắk
              </p>
            </div>
          </div>
          <Link to="/" className="text-xs text-stone-300 hover:text-white underline">
            Trang chủ
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="cms-email" className="block text-xs font-bold uppercase tracking-wider text-stone-600">
              Email tài khoản
            </label>
            <input
              id="cms-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@daklak.travel"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CEB8] text-sm focus:outline-none focus:border-[#8C3B2B]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cms-password" className="block text-xs font-bold uppercase tracking-wider text-stone-600">
              Mật khẩu
            </label>
            <input
              id="cms-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CEB8] text-sm focus:outline-none focus:border-[#8C3B2B]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-[#132A1E] hover:bg-[#8C3B2B] text-[#F7F3EB] text-sm font-bold transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập vào CMS'}
          </button>

          {import.meta.env.DEV && (
            <div className="rounded-2xl bg-[#F7F3EB] border border-[#E5DEC9] p-3.5 text-[11px] text-stone-600 space-y-2">
              <div className="font-bold text-[#132A1E] uppercase tracking-wider">
                Tài khoản thử nghiệm (Dev Mode)
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@daklak.travel');
                    setPassword('Admin@123');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D9CEB8] hover:border-[#8C3B2B] font-semibold text-[#132A1E]"
                >
                  Điền Admin (Duyệt &amp; Xuất bản)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('writer@daklak.travel');
                    setPassword('Writer@123');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D9CEB8] hover:border-[#8C3B2B] font-semibold text-[#132A1E]"
                >
                  Điền Writer (Viết &amp; Gửi duyệt)
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
