import React from 'react';
import { useAppContext } from '../context/AppContext';
import { copyToClipboard } from '../utils/clipboard';

const cssVariablesSnippet = `:root {
  --dl-forest-primary: #132A1E;
  --dl-hero-overlay: rgba(15, 36, 25, 0.50);
  --dl-forest-alt: #182E22;
  --dl-forest-footer: #0D1D14;
  --dl-paper-warm: #F7F3EB;
  --dl-amber-accent: #D48C46;
  --dl-terracotta-accent: #8C3B2B;
}`;

const colorSwatches = [
  { hex: '#132A1E', label: 'Xanh Đại Ngàn', copyName: 'Xanh Đại Ngàn Đậm', border: false },
  { hex: '#F7F3EB', label: 'Kem Giấy Dó', copyName: 'Kem Giấy Dó', border: true },
  { hex: '#D48C46', label: 'Vàng Hổ Phách', copyName: 'Vàng Hổ Phách Cà Phê', border: false },
  { hex: '#8C3B2B', label: 'Đất Đỏ Bazan', copyName: 'Nâu Đất Đỏ Bazan', border: false },
  { hex: '#182E22', label: 'Đại Ngàn Trầm', copyName: 'Xanh Đại Ngàn Trầm', border: false },
  { hex: '#0D1D14', label: 'Đại Ngàn Sẫm', copyName: 'Xanh Đại Ngàn Sẫm', border: false },
];

export const DesignSystemDrawer: React.FC = () => {
  const { isDsDrawerOpen, closeDsDrawer, showToast } = useAppContext();

  if (!isDsDrawerOpen) return null;

  const handleCopyHex = async (hex: string, name: string) => {
    const ok = await copyToClipboard(hex);
    showToast(ok ? `Đã sao chép ${name}: ${hex}` : 'Đã lưu thông tin.');
  };

  const handleCopyTokens = async () => {
    const ok = await copyToClipboard(cssVariablesSnippet);
    showToast(ok ? 'Đã sao chép toàn bộ CSS Variables!' : 'Đã lưu thông tin.');
  };

  return (
    <div
      id="ds-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Đắk Lắk Tourism Design System"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDsDrawer();
      }}
      className="fixed inset-0 z-50 bg-[#0D1D14]/70 backdrop-blur-xs flex justify-end"
    >
      <div className="w-full max-w-xl bg-[#F7F3EB] text-[#1C1917] h-full overflow-y-auto shadow-2xl border-l border-[#E5DEC9] p-6 sm:p-8 space-y-7 animate-panel-reveal">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5DEC9]">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8C3B2B]">
              Preserved Design System
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#132A1E]">
              Hệ Thống Thiết Kế Đắk Lắk
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDsDrawer}
            aria-label="Đóng Design System"
            className="p-2 rounded-xl bg-white border border-[#E5DEC9] text-[#132A1E] hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5DEC9] p-4 space-y-2">
          <span className="text-xs font-bold text-[#132A1E] uppercase tracking-wider">
            Chiến lược Kép: The Hook → The Soul
          </span>
          <p className="text-xs text-stone-600 leading-relaxed">
            Kết hợp <strong>Option 2 (Thủ phủ Cà phê &amp; Khám phá hiện đại)</strong> làm mỏ neo
            nhận diện tức thì với <strong>Option 1 (Bản sắc Di sản &amp; Tạp chí kể chuyện)</strong>{' '}
            làm chiều sâu cảm xúc.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#132A1E]">
              Bảng Màu Chuẩn Hóa (Nhấp để sao chép HEX)
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.hex}
                type="button"
                onClick={() => handleCopyHex(swatch.hex, swatch.copyName)}
                className="p-3 rounded-2xl bg-white border border-[#E5DEC9] text-left hover:border-[#D48C46] transition-all"
              >
                <div
                  className={`h-10 rounded-xl mb-2 ${
                    swatch.border ? 'border border-[#E5DEC9]' : ''
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                />
                <div className="font-bold text-[#132A1E]">{swatch.label}</div>
                <div className="font-mono text-stone-500">{swatch.hex}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#132A1E]">
            Typography Kép (Dual-Voice)
          </h3>
          <div className="rounded-2xl bg-white border border-[#E5DEC9] p-4 space-y-3">
            <div>
              <span className="text-[11px] font-mono text-[#8C3B2B]">
                Serif Display • Cormorant Garamond
              </span>
              <p className="font-serif text-2xl font-bold text-[#132A1E]">
                Nơi hạt cà phê đánh thức đại ngàn
              </p>
            </div>
            <div className="pt-2 border-t border-stone-100">
              <span className="text-[11px] font-mono text-[#132A1E]">
                Sans-serif UI • Plus Jakarta Sans
              </span>
              <p className="text-xs text-stone-600 leading-relaxed">
                Hỗ trợ dấu tiếng Việt sắc nét cho thẻ khám phá, bộ lọc lịch trình và nội dung đọc
                dài.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#132A1E]">
              CSS Variables
            </h3>
            <button
              type="button"
              onClick={handleCopyTokens}
              className="text-xs font-bold text-[#8C3B2B] hover:underline"
            >
              Copy CSS
            </button>
          </div>
          <pre className="rounded-2xl bg-[#132A1E] text-stone-200 font-mono text-[11px] p-4 overflow-x-auto leading-relaxed">
            <code>{cssVariablesSnippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
