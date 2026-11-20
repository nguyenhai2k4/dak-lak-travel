import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export const EditorialModal: React.FC = () => {
  const { lang, modalArticle, closeArticleModal, addModalTopicToPlanner } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (!modalArticle) return null;

  const isEn = lang === 'en';
  const canOpenFullPage = Boolean(modalArticle.slug || modalArticle.unsavedPreviewPost);

  const handleReadFullArticle = () => {
    const slug = modalArticle.slug;
    const isPreviewMode = modalArticle.isPreviewMode;
    const unsavedPreviewPost = modalArticle.unsavedPreviewPost;
    closeArticleModal();

    if (unsavedPreviewPost) {
      navigate('/blog/preview', { state: { unsavedPreviewPost } });
      return;
    }
    if (slug) {
      navigate(`/blog/${slug}${isPreviewMode ? '?preview=1' : ''}`);
    }
  };

  const handleAddToPlanner = () => {
    const needHomeRedirect = location.pathname !== '/';
    addModalTopicToPlanner();
    if (needHomeRedirect) {
      navigate('/');
      window.setTimeout(() => {
        document.getElementById('itinerary-planner')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 120);
    }
  };

  return (
    <div
      id="editorial-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-article-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeArticleModal();
      }}
      className="fixed inset-0 z-[70] overflow-y-auto bg-[#0D1D14]/80 backdrop-blur-xs p-3 sm:p-6 md:p-10"
    >
      <div
        className="min-h-full flex items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeArticleModal();
        }}
      >
        <div className="relative w-full max-w-3xl rounded-3xl do-paper-surface border border-[#E5DEC9] shadow-2xl overflow-hidden text-[#1C1917] animate-panel-reveal">
          {/* Top Bar */}
          <div className="sticky top-0 z-10 bg-[#F7F3EB]/95 backdrop-blur-md border-b border-[#E5DEC9] px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-sm bg-[#8C3B2B] text-white text-[11px] font-bold uppercase tracking-wider">
                {modalArticle.category}
              </span>
              <span className="text-xs font-medium text-stone-500">{modalArticle.readTime}</span>
              {modalArticle.isPreviewMode && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#D48C46]/20 border border-[#D48C46]/50 text-[#8C3B2B] text-[10px] font-bold uppercase tracking-wider">
                  {isEn ? 'CMS Preview Pop-up' : 'Xem trước Pop-up (CMS)'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={closeArticleModal}
              aria-label={isEn ? 'Close preview' : 'Đóng bài viết'}
              className="w-9 h-9 rounded-xl bg-white/85 hover:bg-white border border-[#E5DEC9] text-[#132A1E] font-bold flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Preview Cover Banner */}
          {modalArticle.image && (
            <div className="relative h-52 sm:h-64 w-full overflow-hidden bg-[#132A1E]">
              <img
                src={modalArticle.image}
                alt={modalArticle.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1D14]/65 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-6 sm:left-10 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xs text-[#F7F3EB] text-[11px] font-bold uppercase tracking-wider border border-white/20">
                {modalArticle.location}
              </span>
            </div>
          )}

          {/* Article Preview Body */}
          <div className="px-6 sm:px-10 py-7 sm:py-9 space-y-5">
            <div className="space-y-2">
              {!modalArticle.image && (
                <span className="block text-xs font-bold uppercase tracking-widest text-[#8C3B2B]">
                  {modalArticle.location}
                </span>
              )}
              <h2
                id="modal-article-title"
                className="font-serif text-3xl sm:text-4xl font-bold text-[#132A1E] leading-[1.16]"
              >
                {modalArticle.title}
              </h2>
              {modalArticle.excerpt && (
                <p className="text-sm sm:text-base text-stone-600 leading-relaxed pt-1">
                  {modalArticle.excerpt}
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 py-1" aria-hidden="true">
              <span className="h-px flex-1 bg-[#D9CEB8]" />
              <span className="w-2.5 h-2.5 rotate-45 border border-[#8C3B2B] flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-[#D48C46]" />
              </span>
              <span className="h-px flex-1 bg-[#D9CEB8]" />
            </div>

            <div className="space-y-4 text-[15px] sm:text-base text-[#1C1917]/90 leading-[1.82]">
              {modalArticle.paragraphs.map((p, idx) => (
                <p key={idx} className={idx === 0 ? 'editorial-dropcap' : ''}>
                  {p}
                </p>
              ))}
            </div>

            {modalArticle.quote && (
              <blockquote className="my-5 pl-5 border-l-2 border-[#8C3B2B] bg-white/70 py-3.5 pr-4 rounded-r-xl">
                <p className="font-serif italic text-xl sm:text-2xl text-[#132A1E] leading-snug">
                  {modalArticle.quote}
                </p>
                {modalArticle.quoteSource && (
                  <footer className="mt-2 text-xs font-medium text-stone-500">
                    {modalArticle.quoteSource}
                  </footer>
                )}
              </blockquote>
            )}

            {modalArticle.glossary.length > 0 && (
              <div className="rounded-2xl bg-white border border-[#E5DEC9] p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C3B2B]">
                  {isEn ? 'Cultural & Travel Notes' : 'Ghi Chú Văn Hóa & Trải Nghiệm'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {modalArticle.glossary.map((g, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#F7F3EB] border border-[#E5DEC9]">
                      <span className="block font-bold text-[#132A1E]">{g.term}</span>
                      <span className="block text-stone-600 mt-1 leading-relaxed">{g.def}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="bg-white border-t border-[#E5DEC9] px-6 sm:px-10 py-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={closeArticleModal}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                {isEn ? 'Close' : 'Đóng'}
              </button>
              <button
                type="button"
                onClick={handleAddToPlanner}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#132A1E]/25 bg-[#F7F3EB] hover:bg-[#EFE6D5] text-[#132A1E] text-xs sm:text-sm font-semibold transition-colors"
              >
                <span>
                  {isEn ? '+ Add to my itinerary' : '+ Thêm vào lịch trình'}
                </span>
              </button>
            </div>

            {canOpenFullPage && (
              <button
                type="button"
                onClick={handleReadFullArticle}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#132A1E] hover:bg-[#8C3B2B] text-[#F7F3EB] text-xs sm:text-sm font-bold shadow-sm transition-colors"
              >
                <span>{isEn ? 'Read full blog post' : 'Đọc toàn bộ bài viết'}</span>
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
