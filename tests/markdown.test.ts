import test from 'node:test';
import assert from 'node:assert/strict';
import {
  documentToPostPayload,
  generatePostTemplate,
  htmlToMarkdown,
  markdownToHtml,
  parsePostInputFile,
  serializePostToMarkdown,
} from '../cli/markdown.ts';
import { validatePostPayload } from '../cli/validate.ts';
import { CmsPostAdmin } from '../src/types/index.ts';

test('markdownToHtml converts blocks and sanitizes unsafe tags', () => {
  const md = [
    '## Buổi sáng ở Ban Mê',
    '',
    'Uống **cà phê rang mộc** bên *hàng hiên gỗ* và [xem bản đồ](https://example.com).',
    '',
    '- Điểm 1',
    '- Điểm 2',
    '',
    '> Cao nguyên thức giấc.',
    '',
    '<script>alert(1)</script>',
  ].join('\n');

  const html = markdownToHtml(md);
  assert.match(html, /<h2>Buổi sáng ở Ban Mê<\/h2>/);
  assert.match(html, /<strong>cà phê rang mộc<\/strong>/);
  assert.match(html, /<em>hàng hiên gỗ<\/em>/);
  assert.match(html, /<a href="https:\/\/example\.com"[^>]*>xem bản đồ<\/a>/);
  assert.match(html, /<ul><li>Điểm 1<\/li><li>Điểm 2<\/li><\/ul>/);
  assert.match(html, /<blockquote><p>Cao nguyên thức giấc\.<\/p><\/blockquote>/);
  assert.doesNotMatch(html, /<script>/i);
});

test('parsePostInputFile parses bilingual Markdown with frontmatter and glossary', () => {
  const template = generatePostTemplate({
    section: 'stories',
    themeKey: 'coffee',
    title: 'Mùa hoa cà phê trắng',
    bilingual: true,
  });

  const doc = parsePostInputFile(template);
  assert.equal(doc.section, 'stories');
  assert.equal(doc.themeKey, 'coffee');
  assert.equal(doc.title, 'Mùa hoa cà phê trắng');
  assert.equal(doc.storyConfig?.gradient, 'from-[#132A1E] to-[#8C3B2B]');
  assert.equal(doc.glossary?.length, 1);
  assert.equal(doc.glossary?.[0].term, 'Từ khóa văn hóa');
  assert.equal(doc.titleEn, 'English Title');
  assert.match(doc.contentHtml || '', /<h2>Mùa hoa cà phê trắng<\/h2>/);
  assert.match(doc.contentHtmlEn || '', /<h2>English Heading<\/h2>/);

  const payload = documentToPostPayload(doc);
  const report = validatePostPayload(payload, { checkTranslation: true });
  assert.equal(report.valid, true);
  assert.equal(report.stats.hasEnglishTranslation, true);
});

test('serializePostToMarkdown and htmlToMarkdown preserve bilingual structure', () => {
  const samplePost: CmsPostAdmin = {
    id: 42,
    slug: 'thac-dray-nur',
    legacyKey: null,
    section: 'stories',
    status: 'published',
    sortOrder: 0,
    title: 'Thác Dray Nur mùa nước đổ',
    excerpt: 'Dòng Sêrêpốk cuộn chảy giữa đại ngàn.',
    category: 'Thiên nhiên',
    location: 'Krông Ana • Đắk Lắk',
    readTime: '4 phút đọc',
    cta: 'Khám phá',
    image: '/uploads/dray-nur.jpg',
    imageAlt: 'Thác Dray Nur',
    themeKey: 'nature',
    previewParagraphs: ['Đoạn mở đầu.'],
    contentHtml: '<h2>Sức sống Sêrêpốk</h2><p>Đoạn <strong>chi tiết</strong>.</p>',
    quote: 'Tiếng thác như trống chiêng.',
    quoteSource: '— Lữ khách',
    glossary: [{ term: 'Sêrêpốk', def: 'Dòng sông chảy ngược.' }],
    storyConfig: { gradient: 'from-[#0F2419] to-[#2C4A3E]', offsetClass: 'mt-2' },
    authorId: 1,
    authorName: 'Admin',
    publishedAt: '2026-11-16T00:00:00.000Z',
    updatedAt: '2026-11-16T00:00:00.000Z',
    translationStatus: 'translated',
    reviewNote: '',
    reviewedBy: 1,
    titleEn: 'Dray Nur Waterfall in Flood Season',
    excerptEn: 'The Serepok River rushes through the highland forest.',
    categoryEn: 'Nature',
    locationEn: 'Krong Ana • Dak Lak',
    readTimeEn: '4 min read',
    ctaEn: 'Explore',
    previewParagraphsEn: ['Opening paragraph.'],
    contentHtmlEn: '<h2>Life of the Serepok</h2><p>Detailed <strong>story</strong>.</p>',
    quoteEn: 'The waterfall sounds like gongs.',
    quoteSourceEn: '— Traveler',
    glossaryEn: [{ term: 'Serepok', def: 'The reverse-flowing river.' }],
    translationProvider: 'ai-agent',
    translatedAt: '2026-11-16T00:00:00.000Z',
    createdAt: '2026-11-16T00:00:00.000Z',
  };

  const md = serializePostToMarkdown(samplePost, { bilingual: true });
  const parsed = parsePostInputFile(md);
  assert.equal(parsed.id, 42);
  assert.equal(parsed.slug, 'thac-dray-nur');
  assert.equal(parsed.titleEn, 'Dray Nur Waterfall in Flood Season');
  assert.equal(parsed.glossaryEn?.[0].term, 'Serepok');
  assert.match(htmlToMarkdown(samplePost.contentHtml), /## Sức sống Sêrêpốk/);
});
