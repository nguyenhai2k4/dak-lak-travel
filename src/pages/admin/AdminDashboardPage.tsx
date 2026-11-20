import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { cmsApi } from '../../services/cmsApi';
import { CmsPostAdmin, CmsSectionType, PostStatus } from '../../types';
import { useAdminAuth } from './AdminLayout';

const STATUS_BADGES: Record<PostStatus, { label: string; cls: string }> = {
  draft: { label: 'Bản nháp', cls: 'bg-stone-200 text-stone-700' },
  in_review: { label: 'Chờ Admin duyệt', cls: 'bg-amber-100 text-amber-800 border border-amber-300' },
  published: { label: 'Đã xuất bản', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
};

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { openPostPreview, refreshPublicPosts, showToast } = useAppContext();

  const [posts, setPosts] = useState<CmsPostAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState<CmsSectionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await cmsApi.getAdminPosts({
        section: sectionFilter,
        status: statusFilter,
        q: searchQuery,
      });
      setPosts(list);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không tải được danh sách bài viết.');
    } finally {
      setLoading(false);
    }
  }, [sectionFilter, statusFilter, searchQuery, showToast]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const handleSubmitForReview = async (post: CmsPostAdmin) => {
    setBusyId(post.id);
    try {
      const updated = await cmsApi.submitPostForReview(post.id);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      showToast(`Đã gửi bài "${post.title}" cho Admin duyệt.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gửi duyệt thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = async (post: CmsPostAdmin) => {
    setBusyId(post.id);
    try {
      const updated = await cmsApi.reviewPost(post.id, 'publish');
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      await refreshPublicPosts();
      showToast(
        `Đã xuất bản "${updated.title}" & tự động tạo bản tiếng Anh (${updated.translationProvider || 'EN'}).`
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xuất bản thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReturnDraft = async (post: CmsPostAdmin) => {
    const note =
      window.prompt('Nhập ghi chú chỉnh sửa gửi lại tác giả (có thể bỏ trống):', '') ?? null;
    if (note === null) return;

    setBusyId(post.id);
    try {
      const updated = await cmsApi.reviewPost(post.id, 'return_draft', note);
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      await refreshPublicPosts();
      showToast(`Đã chuyển "${updated.title}" về trạng thái Bản nháp.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Thao tác thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (post: CmsPostAdmin) => {
    if (!window.confirm(`Xóa vĩnh viễn bài viết "${post.title}"?`)) return;
    setBusyId(post.id);
    try {
      await cmsApi.deletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      await refreshPublicPosts();
      showToast('Đã xóa bài viết.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Xóa thất bại.');
    } finally {
      setBusyId(null);
    }
  };

  const handleMoveOrder = async (post: CmsPostAdmin, delta: -1 | 1) => {
    const sameSection = posts.filter((p) => p.section === post.section);
    const idx = sameSection.findIndex((p) => p.id === post.id);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= sameSection.length) return;

    const reordered = [...sameSection];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, moved);

    try {
      await cmsApi.reorderPosts(
        post.section,
        reordered.map((p) => p.id)
      );
      await loadPosts();
      await refreshPublicPosts();
      showToast('Đã cập nhật thứ tự hiển thị.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Đổi thứ tự thất bại.');
    }
  };

  const pendingCount = posts.filter((p) => p.status === 'in_review').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#132A1E]">
            {user.role === 'admin' ? 'Quản lý & Duyệt Bài Viết' : 'Bài Viết Của Tôi'}
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            {user.role === 'admin'
              ? 'Kiểm duyệt bài viết từ tác giả, xem trước Pop-up và xuất bản (tự động dịch tiếng Anh).'
              : 'Soạn thảo bài viết giàu định dạng, xem trước Pop-up và gửi Admin duyệt xuất bản.'}
          </p>
        </div>

        <Link
          to="/admin/posts/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#132A1E] hover:bg-[#8C3B2B] text-[#F7F3EB] text-sm font-bold shadow-sm transition-colors shrink-0"
        >
          <span>+ Tạo bài viết mới</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white border border-[#E5DEC9] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'in_review', 'draft', 'published'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-[#132A1E] text-[#F7F3EB]'
                  : 'bg-[#F7F3EB] text-stone-700 hover:bg-[#EFE6D5]'
              }`}
            >
              {st === 'all' && 'Tất cả trạng thái'}
              {st === 'in_review' && `Chờ duyệt${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
              {st === 'draft' && 'Bản nháp'}
              {st === 'published' && 'Đã xuất bản'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value as CmsSectionType | 'all')}
            className="px-3 py-2 rounded-xl border border-[#D9CEB8] text-xs font-semibold bg-white"
          >
            <option value="all">Cả 2 chuyên mục</option>
            <option value="bento">Mục 2: Bức tranh toàn cảnh Đắk Lắk</option>
            <option value="stories">Mục 4: Chuyện của đất đỏ Đắk Lắk</option>
          </select>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, địa điểm..."
            className="px-3.5 py-2 rounded-xl border border-[#D9CEB8] text-xs w-56 focus:outline-none focus:border-[#8C3B2B]"
          />
        </div>
      </div>

      {/* Posts Table / Cards */}
      <div className="rounded-2xl bg-white border border-[#E5DEC9] overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-10 text-center text-sm text-stone-500">Đang tải bài viết...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-stone-600">Chưa có bài viết nào phù hợp bộ lọc hiện tại.</p>
            <Link
              to="/admin/posts/new"
              className="inline-block px-4 py-2 rounded-xl bg-[#D48C46] text-[#132A1E] text-xs font-bold"
            >
              + Viết bài đầu tiên
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E5DEC9]">
            {posts.map((post) => {
              const badge = STATUS_BADGES[post.status];
              const isBusy = busyId === post.id;
              const canWriterEdit =
                user.role === 'admin' || (post.authorId === user.id && post.status !== 'published');
              const canDelete =
                user.role === 'admin' || (post.authorId === user.id && post.status === 'draft');

              return (
                <div
                  key={post.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#F7F3EB]/45 transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-20 h-20 sm:w-24 sm:h-20 rounded-xl object-cover bg-[#132A1E] shrink-0 border border-[#E5DEC9]"
                    />
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#132A1E]/8 text-[#132A1E] text-[10px] font-bold">
                          {post.section === 'bento' ? 'Bức tranh toàn cảnh' : 'Chuyện đất đỏ'}
                        </span>
                        {post.status === 'published' && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              post.translationStatus === 'translated'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {post.translationStatus === 'translated'
                              ? `EN: Đã dịch (${post.translationProvider || 'auto'})`
                              : 'EN: Chưa dịch'}
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-xl font-bold text-[#132A1E] leading-snug truncate">
                        {post.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        <span>Tác giả: {post.authorName}</span>
                        <span>•</span>
                        <span>{post.location}</span>
                        <span>•</span>
                        <span className="font-mono text-[11px]">/blog/{post.slug}</span>
                      </div>

                      {post.reviewNote && post.status === 'draft' && (
                        <div className="text-xs text-[#8C3B2B] bg-[#8C3B2B]/8 border border-[#8C3B2B]/20 rounded-lg px-2.5 py-1.5">
                          <strong>Ghi chú từ Admin:</strong> {post.reviewNote}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {user.role === 'admin' && sectionFilter !== 'all' && (
                      <div className="inline-flex items-center border border-[#D9CEB8] rounded-xl overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(post, -1)}
                          className="px-2 py-1.5 text-xs hover:bg-stone-100"
                          title="Đưa lên trước"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(post, 1)}
                          className="px-2 py-1.5 text-xs hover:bg-stone-100 border-l border-[#D9CEB8]"
                          title="Đưa xuống sau"
                        >
                          ↓
                        </button>
                      </div>
                    )}

                    {/* Per-blog Preview Pop-up button */}
                    <button
                      type="button"
                      onClick={() => openPostPreview(post, { isPreviewMode: true })}
                      className="px-3 py-1.5 rounded-xl border border-[#D48C46] bg-[#D48C46]/12 hover:bg-[#D48C46]/25 text-[#132A1E] text-xs font-bold transition-colors"
                    >
                      Xem trước Pop-up
                    </button>

                    {canWriterEdit && (
                      <Link
                        to={`/admin/posts/${post.id}/edit`}
                        className="px-3 py-1.5 rounded-xl border border-[#D9CEB8] bg-white hover:bg-stone-100 text-xs font-bold text-[#132A1E]"
                      >
                        Chỉnh sửa
                      </Link>
                    )}

                    {user.role === 'writer' && post.status === 'draft' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSubmitForReview(post)}
                        className="px-3 py-1.5 rounded-xl bg-[#D48C46] hover:bg-[#c57d36] text-[#132A1E] text-xs font-bold disabled:opacity-50"
                      >
                        Gửi duyệt
                      </button>
                    )}

                    {user.role === 'admin' && post.status !== 'published' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handlePublish(post)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50"
                      >
                        {isBusy ? 'Đang dịch & xuất bản...' : 'Duyệt & Xuất bản'}
                      </button>
                    )}

                    {user.role === 'admin' && post.status !== 'draft' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleReturnDraft(post)}
                        className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold disabled:opacity-50"
                      >
                        {post.status === 'published' ? 'Gỡ về nháp' : 'Trả về nháp'}
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(post)}
                        className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
