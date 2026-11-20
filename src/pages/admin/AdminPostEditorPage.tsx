import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RichTextEditor } from '../../components/cms/RichTextEditor';
import { useAppContext } from '../../context/AppContext';
import { cmsApi } from '../../services/cmsApi';
import {
  CmsPostAdmin,
  CmsPostPublic,
  CmsSectionType,
  GlossaryItem,
  PostStatus,
  ThemeType,
} from '../../types';
import { useAdminAuth } from './AdminLayout';

const STORY_GRADIENTS = [
  { label: 'Rừng già & Đất đỏ', value: 'from-[#132A1E] to-[#8C3B2B]' },
  { label: 'Lá cà phê & Hổ phách', value: 'from-[#1D3B2A] to-[#B08968]' },
  { label: 'Đại ngàn Sêrêpốk', value: 'from-[#0F2419] to-[#2C4A3E]' },
  { label: 'Thổ cẩm Đỏ', value: 'from-[#8C3B2B] to-[#3B1E14]' },
  { label: 'Bình minh Hồ Lắk', value: 'from-[#182E22] to-[#D48C46]' },
];

const STORY_OFFSETS = ['mt-0', 'mt-2', 'mt-4', 'mt-6', 'mt-8'];

function slugifyClient(input: string): string {
  return input
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export const AdminPostEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const { openPostPreview, refreshPublicPosts, showToast } = useAppContext();

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [activeLangTab, setActiveLangTab] = useState<'vi' | 'en'>('vi');
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [status, setStatus] = useState<PostStatus>('draft');
  const [reviewNote, setReviewNote] = useState('');
  const [translationStatus, setTranslationStatus] = useState('none');
  const [translationProvider, setTranslationProvider] = useState('');

  // VI Fields
  const [section, setSection] = useState<CmsSectionType>('stories');
  const [themeKey, setThemeKey] = useState<ThemeType>('coffee');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Chuyện Đất Đỏ');
  const [location, setLocation] = useState('Buôn Ma Thuột • Đắk Lắk');
  const [readTime, setReadTime] = useState('5 phút đọc');
  const [cta, setCta] = useState('Khám phá câu chuyện');
  const [image, setImage] = useState(
    'https://images.unsplash.com/photo-1513528916469-746b1cf609e2?auto=format&fit=crop&w=1000&q=80'
  );
  const [imageAlt, setImageAlt] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [contentHtml, setContentHtml] = useState('<p></p>');
  const [quote, setQuote] = useState('');
  const [quoteSource, setQuoteSource] = useState('');
  const [glossary, setGlossary] = useState<GlossaryItem[]>([]);

  // Section layout configs
  const [bentoSize, setBentoSize] = useState<'large' | 'small'>('small');
  const [bentoImageLayout, setBentoImageLayout] = useState<'left' | 'top'>('top');
  const [isCultureHighlight, setIsCultureHighlight] = useState(false);
  const [storyGradient, setStoryGradient] = useState('from-[#132A1E] to-[#8C3B2B]');
  const [storyOffset, setStoryOffset] = useState('mt-0');

  // EN Fields (Admin inspection / override)
  const [titleEn, setTitleEn] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [categoryEn, setCategoryEn] = useState('');
  const [locationEn, setLocationEn] = useState('');
  const [readTimeEn, setReadTimeEn] = useState('');
  const [ctaEn, setCtaEn] = useState('');
  const [previewTextEn, setPreviewTextEn] = useState('');
  const [contentHtmlEn, setContentHtmlEn] = useState('');
  const [quoteEn, setQuoteEn] = useState('');
  const [quoteSourceEn, setQuoteSourceEn] = useState('');

  const hydrateFromPost = (p: CmsPostAdmin) => {
    setStatus(p.status);
    setReviewNote(p.reviewNote || '');
    setTranslationStatus(p.translationStatus);
    setTranslationProvider(p.translationProvider || '');
    setSection(p.section);
    setThemeKey(p.themeKey);
    setTitle(p.title);
    setSlug(p.slug);
    setExcerpt(p.excerpt);
    setCategory(p.category);
    setLocation(p.location);
    setReadTime(p.readTime);
    setCta(p.cta);
    setImage(p.image);
    setImageAlt(p.imageAlt || '');
    setPreviewText((p.previewParagraphs || []).join('\n\n'));
    setContentHtml(p.contentHtml || '<p></p>');
    setQuote(p.quote || '');
    setQuoteSource(p.quoteSource || '');
    setGlossary(p.glossary || []);

    if (p.bentoConfig) {
      setBentoSize(p.bentoConfig.size);
      setBentoImageLayout(p.bentoConfig.imageLayout);
      setIsCultureHighlight(Boolean(p.bentoConfig.isCultureHighlight));
    }
    if (p.storyConfig) {
      setStoryGradient(p.storyConfig.gradient);
      setStoryOffset(p.storyConfig.offsetClass);
    }

    setTitleEn(p.titleEn || '');
    setExcerptEn(p.excerptEn || '');
    setCategoryEn(p.categoryEn || '');
    setLocationEn(p.locationEn || '');
    setReadTimeEn(p.readTimeEn || '');
    setCtaEn(p.ctaEn || '');
    setPreviewTextEn((p.previewParagraphsEn || []).join('\n\n'));
    setContentHtmlEn(p.contentHtmlEn || '');
    setQuoteEn(p.quoteEn || '');
    setQuoteSourceEn(p.quoteSourceEn || '');
  };

  useEffect(() => {
    if (!isEditing || !id) return;
    let cancelled = false;
    setLoading(true);
    cmsApi
      .getAdminPostById(Number(id))
      .then((p) => {
        if (!cancelled) {
          hydrateFromPost(p);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : 'Không tải được bài viết.');
          navigate('/admin', { replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, isEditing, navigate, showToast]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(slugifyClient(val));
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await cmsApi.uploadImage(file);
      setImage(url);
      showToast('Đã tải ảnh bìa lên máy chủ!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload ảnh bìa thất bại.');
    } finally {
      setUploadingCover(false);
    }
  };

  const buildPayload = (targetStatus?: PostStatus): Partial<CmsPostAdmin> => {
    const previewParagraphs = previewText
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);

    const previewParagraphsEn = previewTextEn
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      section,
      themeKey,
      status: targetStatus ?? status,
      title: title.trim(),
      slug: slug.trim() || slugifyClient(title),
      excerpt: excerpt.trim(),
      category: category.trim(),
      location: location.trim(),
      readTime: readTime.trim(),
      cta: cta.trim(),
      image: image.trim(),
      imageAlt: imageAlt.trim() || title.trim(),
      previewParagraphs,
      contentHtml,
      quote: quote.trim(),
      quoteSource: quoteSource.trim(),
      glossary: glossary.filter((g) => g.term.trim() || g.def.trim()),
      bentoConfig:
        section === 'bento'
          ? {
              size: bentoSize,
              imageLayout: bentoImageLayout,
              imageBgClass: 'bg-[#132A1E]',
              isCultureHighlight,
            }
          : undefined,
      storyConfig:
        section === 'stories'
          ? {
              gradient: storyGradient,
              offsetClass: storyOffset,
            }
          : undefined,
      ...(user.role === 'admin' && isEditing
        ? {
            titleEn,
            excerptEn,
            categoryEn,
            locationEn,
            readTimeEn,
            ctaEn,
            previewParagraphsEn,
            contentHtmlEn,
            quoteEn,
            quoteSourceEn,
          }
        : {}),
    };
  };

  const handleOpenPreviewPopup = () => {
    const useEn = activeLangTab === 'en';
    const previewParasVi = previewText
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);
    const previewParasEn = previewTextEn
      .split(/\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);

    const unsavedPost: CmsPostPublic = {
      id: isEditing ? Number(id) : 0,
      slug: slug.trim() || slugifyClient(title || 'xem-truoc'),
      legacyKey: null,
      section,
      status,
      sortOrder: 0,
      title: (useEn && titleEn) || title || 'Tiêu đề bài viết',
      excerpt: (useEn && excerptEn) || excerpt || 'Mô tả ngắn cho thẻ bài viết...',
      category: (useEn && categoryEn) || category || 'Khám phá Đắk Lắk',
      location: (useEn && locationEn) || location || 'Đắk Lắk',
      readTime: (useEn && readTimeEn) || readTime || '5 phút đọc',
      cta: (useEn && ctaEn) || cta || 'Đọc thêm',
      image,
      imageAlt: imageAlt || title,
      themeKey,
      previewParagraphs:
        useEn && previewParasEn.length > 0
          ? previewParasEn
          : previewParasVi.length > 0
            ? previewParasVi
            : [excerpt || 'Nội dung xem trước của bài viết...'],
      contentHtml: (useEn && contentHtmlEn) || contentHtml,
      quote: (useEn && quoteEn) || quote,
      quoteSource: (useEn && quoteSourceEn) || quoteSource,
      glossary,
      bentoConfig:
        section === 'bento'
          ? { size: bentoSize, imageLayout: bentoImageLayout, imageBgClass: 'bg-[#132A1E]' }
          : undefined,
      storyConfig:
        section === 'stories' ? { gradient: storyGradient, offsetClass: storyOffset } : undefined,
      authorId: user.id,
      authorName: user.displayName,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      translationStatus: 'none',
    };

    openPostPreview(unsavedPost, {
      isPreviewMode: true,
      unsavedPreviewPost: unsavedPost,
    });
  };

  const handleSave = async (targetStatus?: PostStatus) => {
    if (!title.trim() || !excerpt.trim()) {
      showToast('Vui lòng nhập Tiêu đề và Mô tả ngắn trước khi lưu.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(targetStatus);
      let saved: CmsPostAdmin;
      if (isEditing && id) {
        saved = await cmsApi.updatePost(Number(id), payload);
      } else {
        saved = await cmsApi.createPost(payload);
      }

      if (targetStatus === 'published' || saved.status === 'published') {
        await refreshPublicPosts();
      }

      if (targetStatus === 'published') {
        showToast('Đã xuất bản bài viết & tự động tạo bản dịch tiếng Anh!');
      } else if (targetStatus === 'in_review') {
        showToast('Đã gửi bài viết cho Admin kiểm duyệt!');
      } else {
        showToast('Đã lưu bài viết!');
      }

      if (!isEditing) {
        navigate(`/admin/posts/${saved.id}/edit`, { replace: true });
      } else {
        hydrateFromPost(saved);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lưu bài viết thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetranslate = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await cmsApi.retranslatePost(Number(id));
      hydrateFromPost(updated);
      await refreshPublicPosts();
      showToast(`Đã cập nhật bản dịch tiếng Anh (${updated.translationProvider}).`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Dịch lại thất bại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-stone-500">Đang tải dữ liệu bài viết...</div>;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Sticky Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white border border-[#E5DEC9] p-4 sm:p-5 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Link to="/admin" className="hover:text-[#8C3B2B] font-semibold">
              ← Danh sách bài viết
            </Link>
            <span>•</span>
            <span className="uppercase font-bold text-[#8C3B2B]">{status}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#132A1E]">
            {isEditing ? 'Chỉnh sửa bài viết' : 'Soạn bài viết mới'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenPreviewPopup}
            className="px-4 py-2.5 rounded-xl border border-[#D48C46] bg-[#D48C46]/15 hover:bg-[#D48C46]/30 text-[#132A1E] text-xs sm:text-sm font-bold transition-colors"
          >
            Xem trước Pop-up
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('draft')}
            className="px-4 py-2.5 rounded-xl border border-[#D9CEB8] bg-white hover:bg-stone-100 text-xs sm:text-sm font-bold text-[#132A1E] disabled:opacity-50"
          >
            Lưu nháp
          </button>

          {user.role === 'writer' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('in_review')}
              className="px-4 py-2.5 rounded-xl bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] text-xs sm:text-sm font-bold disabled:opacity-50"
            >
              Gửi Admin duyệt
            </button>
          )}

          {user.role === 'admin' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('published')}
              className="px-5 py-2.5 rounded-xl bg-[#132A1E] hover:bg-[#8C3B2B] text-[#F7F3EB] text-xs sm:text-sm font-bold disabled:opacity-50"
            >
              {saving ? 'Đang xử lý...' : 'Duyệt & Xuất bản'}
            </button>
          )}
        </div>
      </div>

      {reviewNote && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 px-5 py-3 text-xs sm:text-sm text-amber-900">
          <strong>Phản hồi từ Admin:</strong> {reviewNote}
        </div>
      )}

      {/* Language Tabs (VI Source vs EN Translation) */}
      {isEditing && user.role === 'admin' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-[#E5DEC9] px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveLangTab('vi')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                activeLangTab === 'vi'
                  ? 'bg-[#132A1E] text-[#F7F3EB]'
                  : 'bg-[#F7F3EB] text-stone-700'
              }`}
            >
              Tiếng Việt (Bản gốc)
            </button>
            <button
              type="button"
              onClick={() => setActiveLangTab('en')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                activeLangTab === 'en'
                  ? 'bg-[#132A1E] text-[#F7F3EB]'
                  : 'bg-[#F7F3EB] text-stone-700'
              }`}
            >
              English (Bản dịch tự động)
            </button>
            <span className="text-[11px] text-stone-500 ml-2">
              Trạng thái dịch: <strong>{translationStatus}</strong>
              {translationProvider ? ` (${translationProvider})` : ''}
            </span>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={handleRetranslate}
            className="px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold"
          >
            Dịch lại sang tiếng Anh
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-6">
          {activeLangTab === 'vi' ? (
            <>
              {/* Title, Slug & Excerpt */}
              <div className="rounded-2xl bg-white border border-[#E5DEC9] p-6 space-y-4 shadow-xs">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    Tiêu đề bài viết *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="VD: Đêm Cồng Chiêng Bên Bếp Lửa Buôn Ako Dhông"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D9CEB8] font-serif text-xl font-bold text-[#132A1E] focus:outline-none focus:border-[#8C3B2B]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    Đường dẫn trang blog (Slug)
                  </label>
                  <div className="flex items-center rounded-xl border border-[#D9CEB8] overflow-hidden bg-[#F7F3EB]/50">
                    <span className="px-3 text-xs font-mono text-stone-500">/blog/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(e.target.value);
                      }}
                      className="flex-1 px-2 py-2 text-xs font-mono bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                    Mô tả ngắn trên thẻ bài &amp; đầu trang *
                  </label>
                  <textarea
                    rows={2}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="1–2 câu tóm tắt thu hút người đọc click xem Pop-up..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CEB8] text-sm focus:outline-none focus:border-[#8C3B2B]"
                  />
                </div>
              </div>

              {/* Preview Pop-up Content */}
              <div className="rounded-2xl bg-white border border-[#E5DEC9] p-6 space-y-4 shadow-xs">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#132A1E]">
                    Nội dung hiển thị trong Preview Pop-up
                  </h2>
                  <p className="text-xs text-stone-500">
                    Khi người dùng bấm CTA trên trang chủ, Pop-up sẽ hiển thị phần tóm tắt này cùng nút dẫn tới trang bài viết đầy đủ.
                  </p>
                </div>

                <textarea
                  rows={4}
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Nhập 1–2 đoạn văn mở đầu cho Pop-up (phân tách đoạn bằng 1 dòng trống). Nếu bỏ trống, hệ thống tự trích từ bài viết đầy đủ."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D9CEB8] text-sm leading-relaxed focus:outline-none focus:border-[#8C3B2B]"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-600">Câu trích dẫn nổi bật</label>
                    <input
                      type="text"
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      placeholder="“Mỗi tách cà phê là tinh túy của nắng gió...”"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-600">Nguồn trích dẫn</label>
                    <input
                      type="text"
                      value={quoteSource}
                      onChange={(e) => setQuoteSource(e.target.value)}
                      placeholder="— Tư liệu Văn hóa Bản địa"
                      className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Full Blog Rich Text Editor */}
              <div className="rounded-2xl bg-white border border-[#E5DEC9] p-6 space-y-3 shadow-xs">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#132A1E]">
                    Nội dung trang Blog đầy đủ (Rich-Text Editor)
                  </h2>
                  <p className="text-xs text-stone-500">
                    Định dạng tiêu đề, danh sách, trích dẫn, liên kết và chèn ảnh trực tiếp vào bài viết.
                  </p>
                </div>

                <RichTextEditor value={contentHtml} onChange={setContentHtml} />
              </div>

              {/* Cultural Glossary */}
              <div className="rounded-2xl bg-white border border-[#E5DEC9] p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-[#132A1E]">
                      Ghi chú Văn hóa &amp; Thuật ngữ
                    </h2>
                    <p className="text-xs text-stone-500">Hiển thị dưới dạng thẻ chú giải ở cuối bài.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGlossary((prev) => [...prev, { term: '', def: '' }])}
                    className="px-3 py-1.5 rounded-xl bg-[#F7F3EB] border border-[#D9CEB8] text-xs font-bold text-[#132A1E] hover:bg-[#EFE6D5]"
                  >
                    + Thêm ghi chú
                  </button>
                </div>

                {glossary.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">Chưa có ghi chú văn hóa nào.</p>
                ) : (
                  <div className="space-y-3">
                    {glossary.map((g, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                        <input
                          type="text"
                          value={g.term}
                          onChange={(e) =>
                            setGlossary((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, term: e.target.value } : item))
                            )
                          }
                          placeholder="Thuật ngữ / Địa danh"
                          className="sm:col-span-4 px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={g.def}
                          onChange={(e) =>
                            setGlossary((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, def: e.target.value } : item))
                            )
                          }
                          placeholder="Giải thích ngắn gọn..."
                          className="sm:col-span-7 px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setGlossary((prev) => prev.filter((_, i) => i !== idx))}
                          className="sm:col-span-1 py-2 rounded-xl bg-red-50 text-red-700 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* English (EN) Override Editor for Admin */
            <div className="rounded-2xl bg-white border border-[#E5DEC9] p-6 space-y-4 shadow-xs">
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
                Bản tiếng Anh được tự động tạo khi xuất bản. Bạn có thể tinh chỉnh trực tiếp tại đây hoặc bấm{' '}
                <strong>Dịch lại sang tiếng Anh</strong> khi kết nối AI API key.
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600">Title (EN)</label>
                <input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9CEB8] font-serif text-lg font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600">Excerpt (EN)</label>
                <textarea
                  rows={2}
                  value={excerptEn}
                  onChange={(e) => setExcerptEn(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9CEB8] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={categoryEn}
                  onChange={(e) => setCategoryEn(e.target.value)}
                  placeholder="Category (EN)"
                  className="px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
                />
                <input
                  type="text"
                  value={locationEn}
                  onChange={(e) => setLocationEn(e.target.value)}
                  placeholder="Location (EN)"
                  className="px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
                />
                <input
                  type="text"
                  value={readTimeEn}
                  onChange={(e) => setReadTimeEn(e.target.value)}
                  placeholder="Read time (e.g. 5 min read)"
                  className="px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
                />
                <input
                  type="text"
                  value={ctaEn}
                  onChange={(e) => setCtaEn(e.target.value)}
                  placeholder="CTA Label (EN)"
                  className="px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600">Preview Pop-up Paragraphs (EN)</label>
                <textarea
                  rows={3}
                  value={previewTextEn}
                  onChange={(e) => setPreviewTextEn(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D9CEB8] text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600">Full Content (EN)</label>
                <RichTextEditor
                  value={contentHtmlEn}
                  onChange={setContentHtmlEn}
                  placeholder="English article body..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={quoteEn}
                  onChange={(e) => setQuoteEn(e.target.value)}
                  placeholder="Quote (EN)"
                  className="px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
                />
                <input
                  type="text"
                  value={quoteSourceEn}
                  onChange={(e) => setQuoteSourceEn(e.target.value)}
                  placeholder="Quote source (EN)"
                  className="px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Metadata & Section Settings */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Placement & Taxonomy */}
          <div className="rounded-2xl bg-white border border-[#E5DEC9] p-5 space-y-4 shadow-xs">
            <h2 className="font-serif text-xl font-bold text-[#132A1E]">Vị trí &amp; Phân loại</h2>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-600">Chuyên mục hiển thị</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as CmsSectionType)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-sm bg-white font-semibold"
              >
                <option value="bento">Mục 2: Bức tranh toàn cảnh Đắk Lắk</option>
                <option value="stories">Mục 4: Chuyện của đất đỏ Đắk Lắk</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-600">Chủ đề kết nối Lịch trình AI</label>
              <select
                value={themeKey}
                onChange={(e) => setThemeKey(e.target.value as ThemeType)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-sm bg-white"
              >
                <option value="coffee">Cà phê &amp; Nghỉ dưỡng</option>
                <option value="culture">Văn hóa &amp; Cồng chiêng</option>
                <option value="nature">Thiên nhiên &amp; Thác nước</option>
                <option value="cuisine">Ẩm thực bản địa</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600">Nhãn / Tag</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-600">Thời gian đọc</label>
                <input
                  type="text"
                  value={readTime}
                  onChange={(e) => setReadTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-600">Địa điểm</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-600">Chữ nút CTA trên thẻ</label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
              />
            </div>
          </div>

          {/* Cover Image */}
          <div className="rounded-2xl bg-white border border-[#E5DEC9] p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-[#132A1E]">Ảnh bìa</h2>
              <button
                type="button"
                disabled={uploadingCover}
                onClick={() => coverInputRef.current?.click()}
                className="px-3 py-1 rounded-lg bg-[#F7F3EB] border border-[#D9CEB8] text-xs font-bold hover:bg-[#EFE6D5]"
              >
                {uploadingCover ? 'Đang tải...' : '↑ Tải ảnh lên'}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>

            {image && (
              <img
                src={image}
                alt={imageAlt || title}
                className="w-full h-44 object-cover rounded-xl border border-[#E5DEC9] bg-[#132A1E]"
              />
            )}

            <input
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="URL ảnh bìa (https://... hoặc /uploads/...)"
              className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
            />
            <input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              placeholder="Mô tả ảnh (Alt text)"
              className="w-full px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs"
            />
          </div>

          {/* Section Card Presentation */}
          <div className="rounded-2xl bg-white border border-[#E5DEC9] p-5 space-y-3 shadow-xs">
            <h2 className="font-serif text-xl font-bold text-[#132A1E]">Hiển thị thẻ bài</h2>
            {section === 'bento' ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-stone-600 block mb-1">Kích thước lưới</label>
                    <select
                      value={bentoSize}
                      onChange={(e) => setBentoSize(e.target.value as 'large' | 'small')}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#D9CEB8] bg-white"
                    >
                      <option value="large">Lớn (8 cột)</option>
                      <option value="small">Nhỏ (4 cột)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-stone-600 block mb-1">Vị trí ảnh</label>
                    <select
                      value={bentoImageLayout}
                      onChange={(e) => setBentoImageLayout(e.target.value as 'left' | 'top')}
                      className="w-full px-2.5 py-2 rounded-xl border border-[#D9CEB8] bg-white"
                    >
                      <option value="top">Ảnh ở trên</option>
                      <option value="left">Ảnh bên trái</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 font-semibold text-stone-700 pt-1">
                  <input
                    type="checkbox"
                    checked={isCultureHighlight}
                    onChange={(e) => setIsCultureHighlight(e.target.checked)}
                  />
                  <span>Làm nổi bật khi bấm “Văn hóa bản địa”</span>
                </label>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-stone-600 block mb-1">Màu sắc thẻ phủ</label>
                  <select
                    value={storyGradient}
                    onChange={(e) => setStoryGradient(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-[#D9CEB8] bg-white"
                  >
                    {STORY_GRADIENTS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-600 block mb-1">Độ lệch dọc (Stagger)</label>
                  <select
                    value={storyOffset}
                    onChange={(e) => setStoryOffset(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-[#D9CEB8] bg-white"
                  >
                    {STORY_OFFSETS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
