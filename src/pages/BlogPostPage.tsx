import React, { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BackpackToggleButton } from '../components/backpack/BackpackIcon';
import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { useAppContext } from '../context/AppContext';
import { cmsApi } from '../services/cmsApi';
import { CmsPostPublic } from '../types';
import { buildBackpackItemFromPost } from '../utils/backpackHelpers';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    lang,
    bentoPosts,
    storyPosts,
    backpackItems,
    isInBackpack,
    addBackpackItem,
    openBackpackDrawer,
    askBackpackAi,
  } = useAppContext();

  const isPreview = searchParams.get('preview') === '1';
  const unsavedState = (location.state as { unsavedPreviewPost?: CmsPostPublic } | null)
    ?.unsavedPreviewPost;

  const [post, setPost] = useState<CmsPostPublic | null>(unsavedState || null);
  const [related, setRelated] = useState<CmsPostPublic[]>([]);
  const [loading, setLoading] = useState(!unsavedState);
  const [errorMsg, setErrorMsg] = useState('');

  const isEn = lang === 'en';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [slug]);

  useEffect(() => {
    if (slug === 'preview' && unsavedState) {
      setPost(unsavedState);
      setRelated([]);
      setLoading(false);
      setErrorMsg('');
      return;
    }

    if (!slug) return;

    let cancelled = false;
    setLoading(true);
    setErrorMsg('');

    cmsApi
      .getPublicPostBySlug(slug, lang, isPreview)
      .then((res) => {
        if (cancelled) return;
        setPost(res.post);
        setRelated(res.related);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        // Fallback to locally loaded posts if server unavailable
        const allLocal = [...bentoPosts, ...storyPosts];
        const localMatch = allLocal.find((p) => p.slug === slug || p.legacyKey === slug);
        if (localMatch) {
          setPost(localMatch);
          setRelated(allLocal.filter((p) => p.slug !== localMatch.slug).slice(0, 3));
          setLoading(false);
        } else {
          setErrorMsg(err instanceof Error ? err.message : 'Không tìm thấy bài viết.');
          setPost(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, lang, isPreview, unsavedState, bentoPosts, storyPosts]);

  useEffect(() => {
    if (post?.title) {
      document.title = `${post.title} — Đắk Lắk`;
    }
    return () => {
      document.title = 'Khám Phá Đắk Lắk — Trái Tim Tây Nguyên';
    };
  }, [post?.title]);

  const safeHtml = useMemo(() => {
    if (!post) return '';
    const html =
      post.contentHtml && post.contentHtml.trim()
        ? post.contentHtml
        : (post.previewParagraphs || []).map((p) => `<p>${p}</p>`).join('');
    return DOMPurify.sanitize(html);
  }, [post]);

  const postBackpackItem = useMemo(() => (post ? buildBackpackItemFromPost(post) : null), [post]);
  const isPostPacked = postBackpackItem ? isInBackpack(postBackpackItem.id) : false;

  const handleAskAiAboutPost = () => {
    if (!post || !postBackpackItem) return;
    if (!isInBackpack(postBackpackItem.id)) {
      addBackpackItem(postBackpackItem);
    }
    openBackpackDrawer();
    const q = isEn
      ? `What are the ticket prices, best visiting hours, and transport tips for ${postBackpackItem.title}?`
      : `Cho mình hỏi giá vé, giờ mở cửa đẹp nhất và cách di chuyển tới ${postBackpackItem.title}?`;
    window.setTimeout(() => {
      void askBackpackAi('custom', q);
    }, 60);
  };

  const sectionHash = post?.section === 'stories' ? 'red-earth-stories' : 'bento-overview';
  const sectionLabel =
    post?.section === 'stories'
      ? isEn
        ? 'Stories of Đắk Lắk Red Earth'
        : 'Chuyện của đất đỏ Đắk Lắk'
      : isEn
        ? 'The Panorama of Đắk Lắk'
        : 'Bức tranh toàn cảnh Đắk Lắk';

  const handleBackToSection = () => {
    navigate('/');
    window.setTimeout(() => {
      document.getElementById(sectionHash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  return (
    <div className="min-h-screen flex flex-col do-paper-surface">
      <Header />

      <main className="flex-1 pt-20 sm:pt-24 pb-20">
        {loading ? (
          <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
            <div className="w-10 h-10 mx-auto rounded-full border-2 border-[#D48C46] border-t-transparent animate-spin" />
            <p className="text-sm text-stone-600">
              {isEn ? 'Loading story...' : 'Đang tải bài viết...'}
            </p>
          </div>
        ) : errorMsg || !post ? (
          <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-5">
            <span className="inline-block px-3 py-1 rounded-full bg-[#8C3B2B]/10 text-[#8C3B2B] text-xs font-bold uppercase tracking-wider">
              404
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#132A1E]">
              {isEn ? 'Article Not Found' : 'Không tìm thấy bài viết'}
            </h1>
            <p className="text-sm text-stone-600">{errorMsg}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#132A1E] text-[#F7F3EB] text-sm font-bold hover:bg-[#8C3B2B] transition-colors"
            >
              ← {isEn ? 'Return to home' : 'Quay lại trang chủ'}
            </Link>
          </div>
        ) : (
          <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Preview Banner if Draft / In-Review */}
            {(isPreview || slug === 'preview' || post.status !== 'published') && (
              <div className="rounded-2xl bg-[#D48C46]/15 border border-[#D48C46] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#132A1E]">
                  <span className="px-2 py-0.5 rounded bg-[#8C3B2B] text-white text-[10px] font-bold uppercase">
                    Preview
                  </span>
                  <span>
                    {isEn
                      ? 'You are viewing an editorial preview of this article.'
                      : 'Bạn đang xem bản xem trước toàn trang của bài viết trong CMS.'}
                  </span>
                </div>
                <Link
                  to="/admin"
                  className="text-xs font-bold text-[#8C3B2B] hover:underline"
                >
                  ← {isEn ? 'Back to CMS Portal' : 'Quay về Cổng quản trị CMS'}
                </Link>
              </div>
            )}

            {/* Breadcrumb */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/" className="hover:text-[#8C3B2B] font-medium">
                  {isEn ? 'Home' : 'Trang chủ'}
                </Link>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={handleBackToSection}
                  className="hover:text-[#8C3B2B] font-medium"
                >
                  {sectionLabel}
                </button>
                <span aria-hidden="true">/</span>
                <span className="text-[#8C3B2B] font-semibold truncate max-w-[220px] sm:max-w-xs">
                  {post.category}
                </span>
              </div>

              <button
                type="button"
                onClick={handleBackToSection}
                className="inline-flex items-center gap-1.5 font-bold text-[#132A1E] hover:text-[#8C3B2B] transition-colors"
              >
                <span>←</span>
                <span>{isEn ? 'Back to section' : 'Quay lại chuyên mục'}</span>
              </button>
            </div>

            {/* Article Header */}
            <header className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-sm bg-[#8C3B2B] text-white text-xs font-bold uppercase tracking-wider">
                  {post.category}
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-[#132A1E]/70">
                  {post.location}
                </span>
                <span className="text-stone-400">•</span>
                <span className="text-xs font-medium text-stone-500">{post.readTime}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[52px] font-bold text-[#132A1E] leading-[1.12]">
                {post.title}
              </h1>

              <p className="text-base sm:text-lg text-stone-700 leading-relaxed">
                {post.excerpt}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5DEC9] text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[#132A1E] text-[#D48C46] font-bold flex items-center justify-center text-[11px]">
                    {post.authorName.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong className="text-[#132A1E]">{post.authorName}</strong>
                    {post.publishedAt && (
                      <>
                        {' · '}
                        {new Date(post.publishedAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </>
                    )}
                  </span>
                </div>

                {postBackpackItem && (
                  <BackpackToggleButton
                    item={postBackpackItem}
                    variant="inline-pill"
                    className="!py-1.5 !px-3 !text-xs"
                  />
                )}
              </div>
            </header>

            {/* Hero Cover Image */}
            {post.image && (
              <figure className="rounded-3xl overflow-hidden border border-[#E5DEC9] shadow-xl bg-[#132A1E]">
                <img
                  src={post.image}
                  alt={post.imageAlt || post.title}
                  className="w-full max-h-[540px] object-cover"
                />
              </figure>
            )}

            {/* Full Rich HTML Content */}
            <div
              className="blog-rich-content rounded-3xl bg-white/80 border border-[#E5DEC9] p-6 sm:p-10 md:p-12 shadow-sm"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />

            {/* Pull Quote */}
            {post.quote && (
              <blockquote className="pl-6 border-l-4 border-[#8C3B2B] bg-white/80 py-5 pr-6 rounded-r-2xl shadow-xs">
                <p className="font-serif italic text-2xl sm:text-3xl text-[#132A1E] leading-snug">
                  {post.quote}
                </p>
                {post.quoteSource && (
                  <footer className="mt-2.5 text-xs font-medium text-stone-500">
                    {post.quoteSource}
                  </footer>
                )}
              </blockquote>
            )}

            {/* Cultural Glossary */}
            {post.glossary.length > 0 && (
              <section className="rounded-3xl bg-white border border-[#E5DEC9] p-6 sm:p-8 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#8C3B2B]">
                  {isEn ? 'Cultural & Travel Notes' : 'Ghi Chú Văn Hóa & Trải Nghiệm'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {post.glossary.map((g, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-[#F7F3EB] border border-[#E5DEC9]">
                      <span className="block font-bold text-[#132A1E]">{g.term}</span>
                      <span className="block text-stone-600 mt-1.5 text-xs leading-relaxed">
                        {g.def}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Trip Backpack Callout */}
            {postBackpackItem && (
              <section className="rounded-3xl bg-[#132A1E] text-[#F7F3EB] p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-lg">
                <div className="space-y-1.5 max-w-xl">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#D48C46]">
                    {isEn ? 'Save to Trip Backpack' : 'Lưu Vào Balo Hành Trình'}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold">
                    {isEn
                      ? 'Want to visit this spot on your Đắk Lắk trip?'
                      : 'Bạn muốn ghé trải nghiệm điểm này trong chuyến đi?'}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-300">
                    {isEn
                      ? 'Pack it into your Backpack and keep reading. Later, map your picks yourself or ask AI for ticket prices, transport, and route optimization.'
                      : 'Lưu nhanh vào Balo mà không cần rời trang. Khi thu thập đủ điểm thích, bạn có thể tự xem bản đồ hoặc nhờ AI tính chi phí, phương tiện và sắp lịch tối ưu.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <BackpackToggleButton item={postBackpackItem} variant="banner-cta" />
                  {isPostPacked && (
                    <button
                      type="button"
                      onClick={openBackpackDrawer}
                      className="px-4 py-3 rounded-xl bg-white/12 hover:bg-white/20 border border-white/25 text-[#F7F3EB] text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                    >
                      {isEn
                        ? `Open Backpack (${backpackItems.length}) →`
                        : `Mở Balo (${backpackItems.length}) →`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAskAiAboutPost}
                    className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-stone-200 hover:text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-[#D48C46] text-xs" aria-hidden="true" />
                    <span>{isEn ? 'Ask AI tips' : 'Hỏi AI giá vé & cách đi'}</span>
                  </button>
                </div>
              </section>
            )}

            {/* Related Posts */}
            {related.length > 0 && (
              <section className="pt-6 border-t border-[#E5DEC9] space-y-6">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#132A1E]">
                  {isEn ? 'More Stories from Đắk Lắk' : 'Bài viết liên quan'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {related.map((rel) => (
                    <Link
                      key={rel.id}
                      to={`/blog/${rel.slug}`}
                      className="rounded-2xl glass-card-light overflow-hidden border border-[#E5DEC9] hover:border-[#D48C46] transition-all group flex flex-col"
                    >
                      <div className="h-40 bg-[#132A1E] overflow-hidden relative">
                        <img
                          src={rel.image}
                          alt={rel.imageAlt || rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/55 text-[#F7F3EB] text-[10px] font-bold uppercase tracking-wider">
                          {rel.category}
                        </span>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                        <h3 className="font-serif text-xl font-bold text-[#132A1E] group-hover:text-[#8C3B2B] transition-colors line-clamp-2">
                          {rel.title}
                        </h3>
                        <span className="text-xs font-bold text-[#8C3B2B]">
                          {isEn ? 'Read article →' : 'Đọc bài viết →'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </main>

      <Footer />
    </div>
  );
};
