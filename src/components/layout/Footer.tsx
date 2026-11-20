import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { openBentoArticle, openDsDrawer, showToast } = useAppContext();
  const [email, setEmail] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const goToSection = (sectionId: string) => {
    if (location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      showToast(`Cảm ơn bạn! Cẩm nang Đắk Lắk sẽ được gửi tới ${email.trim()}`);
      setEmail('');
    }
  };

  return (
    <footer className="bg-[#0D1D14] text-stone-300 relative">
      {/* Đường viền họa tiết thổ cẩm Ê Đê tinh tế ở mép trên */}
      <div
        className="w-full h-3.5 bg-[#132A1E] border-t border-b border-[#D48C46]/35 relative overflow-hidden"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(212,140,70,0.38) 0 1px, transparent 1px 14px), repeating-linear-gradient(45deg, rgba(140,59,43,0.42) 0 1px, transparent 1px 14px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-14 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Cột 1: Thương hiệu */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 overflow-hidden shrink-0">
                <img
                  src="/dak-lak-logo.png"
                  alt="Logo Đắk Lắk"
                  className="w-full h-full object-cover object-center"
                  style={{ transform: 'scale(1.68) translateY(10.7%)' }}
                />
              </div>
              <span className="font-serif font-bold text-xl tracking-[0.16em] text-[#F7F3EB]">
                ĐẮK LẮK
              </span>
            </div>

            <p className="font-serif italic text-lg text-[#E6C29F] leading-relaxed">
              “Chạm vào hồn thiêng đại ngàn, lắng nghe nhịp thở đất đỏ bazan.”
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  showToast('Đang kết nối Fanpage Khám Phá Đắk Lắk');
                }}
                aria-label="Facebook"
                className="w-9 h-9 rounded-full bg-white/8 hover:bg-[#D48C46] border border-white/10 text-stone-200 hover:text-[#132A1E] flex items-center justify-center transition-colors"
              >
                <i className="fa-brands fa-facebook-f text-sm" aria-hidden="true" />
              </a>
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  showToast('Đang kết nối Instagram @khamphadaklak');
                }}
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-white/8 hover:bg-[#D48C46] border border-white/10 text-stone-200 hover:text-[#132A1E] flex items-center justify-center transition-colors"
              >
                <i className="fa-brands fa-instagram text-[15px]" aria-hidden="true" />
              </a>
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  showToast('Đang kết nối TikTok Khám Phá Đắk Lắk');
                }}
                aria-label="TikTok"
                className="w-9 h-9 rounded-full bg-white/8 hover:bg-[#D48C46] border border-white/10 text-stone-200 hover:text-[#132A1E] flex items-center justify-center transition-colors"
              >
                <i className="fa-brands fa-tiktok text-sm" aria-hidden="true" />
              </a>
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  showToast('Đang kết nối YouTube Khám Phá Đắk Lắk');
                }}
                aria-label="YouTube"
                className="w-9 h-9 rounded-full bg-white/8 hover:bg-[#D48C46] border border-white/10 text-stone-200 hover:text-[#132A1E] flex items-center justify-center transition-colors"
              >
                <i className="fa-brands fa-youtube text-[15px]" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Cột 2: Khám phá */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D48C46]">Khám phá</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-stone-400">
              <li>
                <button
                  type="button"
                  onClick={() => goToSection('bento-overview')}
                  className="hover:text-[#F7F3EB] transition-colors text-left"
                >
                  Điểm đến nổi bật
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openBentoArticle('coffee')}
                  className="hover:text-[#F7F3EB] transition-colors text-left"
                >
                  Bản đồ cà phê
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openBentoArticle('matriarchy')}
                  className="hover:text-[#F7F3EB] transition-colors text-left"
                >
                  Văn hóa mẫu hệ
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToSection('four-seasons')}
                  className="hover:text-[#F7F3EB] transition-colors text-left"
                >
                  Cẩm nang 4 mùa
                </button>
              </li>
            </ul>
          </div>

          {/* Cột 3: Hỗ trợ du khách */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D48C46]">
              Hỗ trợ du khách
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-stone-400">
              <li>
                <button
                  type="button"
                  onClick={() => goToSection('itinerary-planner')}
                  className="hover:text-[#F7F3EB] transition-colors text-left"
                >
                  Tư vấn lịch trình
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => goToSection('itinerary-planner')}
                  className="hover:text-[#F7F3EB] transition-colors text-left"
                >
                  Lưu trú &amp; Homestay
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openDsDrawer}
                  className="hover:text-[#D48C46] transition-colors text-left"
                >
                  Hệ thống thiết kế (DS)
                </button>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 text-[#D48C46] hover:text-[#F7F3EB] font-semibold transition-colors"
                >
                  <i className="fa-solid fa-pen-nib text-[11px]" aria-hidden="true" />
                  <span>Cổng tác giả &amp; CMS</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 4: Bản tin Cao nguyên */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#D48C46]">
              Bản tin Cao nguyên
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Nhận cẩm nang mùa hoa cà phê, lịch lễ hội cồng chiêng và cung đường khám phá mới mỗi
              tháng.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row lg:flex-col gap-2 pt-1">
              <input
                type="email"
                id="newsletter-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Nhập email của bạn..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/8 border border-white/15 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-[#D48C46]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] text-xs font-bold transition-colors shrink-0"
              >
                Đăng ký
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-7 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <span>© 2026 Khám Phá Đắk Lắk. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault();
                showToast('Chính sách bảo mật thông tin du khách');
              }}
              className="hover:text-stone-300 transition-colors"
            >
              Chính sách bảo mật
            </a>
            <span>|</span>
            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault();
                showToast('Điều khoản sử dụng cổng thông tin du lịch Đắk Lắk');
              }}
              className="hover:text-stone-300 transition-colors"
            >
              Điều khoản sử dụng
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
