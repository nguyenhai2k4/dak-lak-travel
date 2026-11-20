import { bentoArticlesData, bentoOverviewCards, redEarthStories } from '../data/articles';
import { CmsPostPublic } from '../types';

function slugifySimple(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function getFallbackBentoPosts(): CmsPostPublic[] {
  return bentoOverviewCards.map((card, idx) => {
    const art = bentoArticlesData[card.articleKey];
    return {
      id: idx + 1,
      slug: slugifySimple(card.title),
      legacyKey: card.articleKey,
      section: 'bento',
      status: 'published',
      sortOrder: idx,
      title: art.title,
      excerpt: card.description,
      category: art.category,
      location: art.location,
      readTime: art.readTime,
      cta: card.cta,
      image: card.image,
      imageAlt: card.imageAlt,
      themeKey: art.themeKey,
      previewParagraphs: art.paragraphs,
      contentHtml: art.paragraphs.map((p) => `<p>${p}</p>`).join(''),
      quote: art.quote,
      quoteSource: art.quoteSource,
      glossary: art.glossary,
      bentoConfig: {
        size: card.size,
        imageLayout: card.imageLayout,
        imageBgClass: card.imageBgClass,
        isCultureHighlight: card.articleKey === 'gong' || card.articleKey === 'matriarchy',
      },
      authorId: 1,
      authorName: 'Ban Biên Tập Đắk Lắk',
      publishedAt: null,
      updatedAt: '',
      translationStatus: 'translated',
    };
  });
}

export function getFallbackStoryPosts(): CmsPostPublic[] {
  return redEarthStories.map((story, idx) => ({
    id: 100 + idx,
    slug: slugifySimple(story.title),
    legacyKey: story.id,
    section: 'stories',
    status: 'published',
    sortOrder: idx,
    title: story.title,
    excerpt: story.desc,
    category: story.tag,
    location: story.location,
    readTime: '5 phút đọc',
    cta: story.cta,
    image: story.image,
    imageAlt: story.title,
    themeKey: story.themeKey,
    previewParagraphs: story.fullParas,
    contentHtml: story.fullParas.map((p) => `<p>${p}</p>`).join(''),
    quote: story.quote,
    quoteSource: `— Chuyện của đất đỏ Đắk Lắk • ${story.location}`,
    glossary: [
      {
        term: 'Trải nghiệm gợi ý',
        def: `Ghé thăm ${story.location} vào buổi sớm để cảm nhận trọn vẹn nhịp sống bản địa.`,
      },
      {
        term: 'Kết nối hành trình',
        def: 'Có thể tích hợp trực tiếp vào lịch trình 2N1Đ hoặc 3N2Đ tại Đắk Lắk.',
      },
    ],
    storyConfig: {
      gradient: story.gradient,
      offsetClass: story.offsetClass,
    },
    authorId: 1,
    authorName: 'Ban Biên Tập Đắk Lắk',
    publishedAt: null,
    updatedAt: '',
    translationStatus: 'translated',
  }));
}
