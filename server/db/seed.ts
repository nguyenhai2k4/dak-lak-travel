import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_WRITER_EMAIL,
  DEFAULT_WRITER_PASSWORD,
} from '../config.ts';
import {
  bentoArticlesData,
  bentoOverviewCards,
  redEarthStories,
} from '../../src/data/articles.ts';
import { dakLakPlaceDirectory } from '../../src/data/places.ts';
import { hashPassword } from '../services/core/auth.ts';
import { slugifyVietnamese } from '../services/core/slugify.ts';
import { getDb, isUsingSupabase } from './database.ts';
import { getSupabaseAdmin } from './supabaseClient.ts';
import { seedBentoEn, seedStoriesEn } from './seedEn.ts';

function paragraphsToHtml(paragraphs: string[]): string {
  return paragraphs.map((p) => `<p>${p}</p>`).join('\n');
}

const INITIAL_STAYS = [
  {
    name: 'Homestay Nhà Dài Ako Dhông',
    area: 'BMT',
    tier: 'budget',
    nightlyRateVnd: 450000,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ['solo', 'couple', 'friends'],
    amenities: ['Kiến trúc nhà dài Ê Đê', 'Wi-Fi', 'Cà phê rang mộc buổi sáng'],
    sourceNote: 'Mức giá tham chiếu homestay trung tâm BMT',
  },
  {
    name: 'Zan Homestay Vườn Ea Kao',
    area: 'Ea Kao',
    tier: 'budget',
    nightlyRateVnd: 520000,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ['solo', 'couple', 'friends'],
    amenities: ['Không gian vườn cà phê yên tĩnh', 'Bếp chung', 'Hỗ trợ thuê xe máy'],
    sourceNote: 'Mức giá tham chiếu homestay khu vực hồ Ea Kao',
  },
  {
    name: 'Elephants Hotel Buôn Ma Thuột',
    area: 'BMT',
    tier: 'standard',
    nightlyRateVnd: 1150000,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ['solo', 'couple', 'family', 'friends'],
    amenities: ['Trung tâm BMT', 'Buffet sáng', 'Hồ bơi & phòng gia đình'],
    sourceNote: 'Mức giá tham chiếu khách sạn 4 sao trung tâm BMT',
  },
  {
    name: 'Lắk Tented Camp Bungalow',
    area: 'Hồ Lắk',
    tier: 'standard',
    nightlyRateVnd: 1450000,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ['couple', 'family', 'friends'],
    amenities: ['View mặt hồ Lắk', 'Chèo kayak bình minh', 'Ẩm thực bản địa M’nông'],
    sourceNote: 'Mức giá tham chiếu bungalow nghỉ dưỡng ven Hồ Lắk',
  },
  {
    name: 'Mường Thanh Luxury Buôn Ma Thuột',
    area: 'BMT',
    tier: 'luxury',
    nightlyRateVnd: 2100000,
    capacityMin: 1,
    capacityMax: 6,
    suitableFor: ['couple', 'family', 'friends'],
    amenities: ['Khách sạn 5 sao', 'Hồ bơi ngoài trời', 'Đưa đón sân bay BMV'],
    sourceNote: 'Mức giá tham chiếu khách sạn cao cấp tại BMT',
  },
  {
    name: 'Lắk Lake Eco-Resort & Villa',
    area: 'Hồ Lắk',
    tier: 'luxury',
    nightlyRateVnd: 2650000,
    capacityMin: 2,
    capacityMax: 6,
    suitableFor: ['couple', 'family', 'friends'],
    amenities: ['Villa riêng tư ven hồ', 'Spa thảo mộc Tây Nguyên', 'Thuyền độc mộc riêng'],
    sourceNote: 'Mức giá tham chiếu resort cao cấp khu vực Hồ Lắk',
  },
];

const INITIAL_LOGISTICS = [
  {
    mode: 'motorbike',
    label: 'Thuê xe máy (tay ga / xe số) tại BMT',
    tier: 'budget',
    dailyRateVnd: 160000,
    capacityMin: 1,
    capacityMax: 2,
    suitableFor: ['solo', 'couple', 'friends'],
    notes: 'Linh hoạt di chuyển nội ô BMT, Ea Kao và thác Dray Nur; chưa gồm xăng.',
  },
  {
    mode: 'local_bus_shuttle',
    label: 'Xe buýt tuyến & Shuttle ghép điểm',
    tier: 'budget',
    dailyRateVnd: 220000,
    capacityMin: 1,
    capacityMax: 8,
    suitableFor: ['solo', 'friends'],
    notes: 'Phù hợp tuyến trục chính BMT – Hồ Lắk / Buôn Đôn; cần chủ động giờ xuất bến.',
  },
  {
    mode: 'self_drive_car',
    label: 'Ô tô 4–5 chỗ tự lái',
    tier: 'standard',
    dailyRateVnd: 850000,
    capacityMin: 1,
    capacityMax: 4,
    suitableFor: ['couple', 'family', 'friends'],
    notes: 'Thoải mái cho gia đình hoặc nhóm nhỏ chạy QL27 đi Hồ Lắk, Ea Tân, Dray Nur.',
  },
  {
    mode: 'private_car_driver',
    label: 'Xe riêng 7 chỗ kèm tài xế bản địa',
    tier: 'luxury',
    dailyRateVnd: 1650000,
    capacityMin: 2,
    capacityMax: 6,
    suitableFor: ['couple', 'family', 'friends'],
    notes: 'Trọn gói nhiên liệu, tài xế am hiểu cung đường đèo dốc và lịch văn hóa địa phương.',
  },
];

const SEED_PLACE_PRICING: Record<
  string,
  { areaCluster: string; ticketVnd: number; estimatedSpendVnd: number; priceNote: string }
> = {
  'Bảo tàng Thế giới Cà phê': {
    areaCluster: 'BMT',
    ticketVnd: 150000,
    estimatedSpendVnd: 220000,
    priceNote: 'Vé tham quan bảo tàng & trải nghiệm thưởng thức cà phê tại quầy.',
  },
  'Làng Cà phê Trung Nguyên': {
    areaCluster: 'BMT',
    ticketVnd: 0,
    estimatedSpendVnd: 120000,
    priceNote: 'Miễn phí vé vào cổng; chi phí đồ uống cà phê tại nhà cổ.',
  },
  'Buôn cổ Ako Dhông': {
    areaCluster: 'BMT',
    ticketVnd: 0,
    estimatedSpendVnd: 100000,
    priceNote: 'Tham quan không gian buôn làng miễn phí; chi phí cà phê hoặc đặc sản nhẹ.',
  },
  'Bảo tàng Đắk Lắk': {
    areaCluster: 'BMT',
    ticketVnd: 30000,
    estimatedSpendVnd: 50000,
    priceNote: 'Vé tham quan khu trưng bày văn hóa Tây Nguyên & đa dạng sinh học.',
  },
  'Nông trại Cà phê Ea Tân': {
    areaCluster: 'Krông Năng',
    ticketVnd: 120000,
    estimatedSpendVnd: 250000,
    priceNote: 'Chi phí tham quan vườn cà phê & workshop cupping Fine Robusta.',
  },
  'Đá Voi Mẹ Yang Tao': {
    areaCluster: 'Hồ Lắk',
    ticketVnd: 20000,
    estimatedSpendVnd: 40000,
    priceNote: 'Phí gửi xe & tham quan khu vực Đá Voi Mẹ trên tuyến QL27.',
  },
  'Hồ Lắk & Buôn Jun': {
    areaCluster: 'Hồ Lắk',
    ticketVnd: 0,
    estimatedSpendVnd: 220000,
    priceNote: 'Dạo buôn miễn phí; ước tính chi phí chèo thuyền độc mộc trên Hồ Lắk.',
  },
  'Đồi Biệt điện Bảo Đại': {
    areaCluster: 'Hồ Lắk',
    ticketVnd: 30000,
    estimatedSpendVnd: 60000,
    priceNote: 'Vé tham quan di tích đồi Liên Sơn nhìn toàn cảnh Hồ Lắk.',
  },
  'Thác Dray Nur Hùng Vĩ': {
    areaCluster: 'Dray Nur',
    ticketVnd: 40000,
    estimatedSpendVnd: 100000,
    priceNote: 'Vé vào cổng khu du lịch thác Dray Nur & nước uống nghỉ chân.',
  },
  'Vườn Quốc gia Yok Đôn': {
    areaCluster: 'Buôn Đôn',
    ticketVnd: 60000,
    estimatedSpendVnd: 850000,
    priceNote: 'Vé vào vườn quốc gia & tour đi bộ ngắm voi tự nhiên không cưỡi voi.',
  },
  'Làng Dệt Thổ Cẩm Tơng Jú': {
    areaCluster: 'Ea Kao',
    ticketVnd: 0,
    estimatedSpendVnd: 150000,
    priceNote: 'Tham quan nhà dệt truyền thống; ước tính trải nghiệm dệt hoặc mua khăn thủ công.',
  },
  'Phố Ẩm thực Phan Đình Giót': {
    areaCluster: 'BMT',
    ticketVnd: 0,
    estimatedSpendVnd: 150000,
    priceNote: 'Phố đi bộ miễn phí; ước tính bữa ăn đặc sản bún đỏ, bánh ướt & cà phê.',
  },
  'Cầu Treo Sêrêpốk Bản Đôn': {
    areaCluster: 'Buôn Đôn',
    ticketVnd: 50000,
    estimatedSpendVnd: 180000,
    priceNote: 'Vé qua cầu treo & thưởng thức gà nướng cơm lam khu vực Bản Đôn.',
  },
};

function buildInitialPostPayloads(adminId: number, now: string) {
  const rows: Array<Record<string, unknown>> = [];

  bentoOverviewCards.forEach((card, idx) => {
    const article = bentoArticlesData[card.articleKey];
    const en = seedBentoEn[card.articleKey];
    const slug = slugifyVietnamese(card.title);
    const sectionMeta = {
      size: card.size,
      imageLayout: card.imageLayout,
      imageBgClass: card.imageBgClass,
      isCultureHighlight: card.articleKey === 'gong' || card.articleKey === 'matriarchy',
    };

    rows.push({
      slug,
      legacy_key: card.articleKey,
      section: 'bento',
      status: 'published',
      sort_order: idx,
      author_id: adminId,
      reviewed_by: adminId,
      review_note: '',
      cover_image: card.image,
      image_alt: card.imageAlt,
      theme_key: article.themeKey,
      section_meta_json: sectionMeta,
      title: article.title,
      excerpt: card.description,
      category: article.category,
      location: article.location,
      read_time: article.readTime,
      cta_label: card.cta,
      preview_paragraphs_json: article.paragraphs,
      content_html: paragraphsToHtml(article.paragraphs),
      quote: article.quote,
      quote_source: article.quoteSource,
      glossary_json: article.glossary,
      title_en: en.title,
      excerpt_en: en.excerpt,
      category_en: en.category,
      location_en: en.location,
      read_time_en: en.readTime,
      cta_label_en: en.cta,
      preview_paragraphs_en_json: en.previewParagraphs,
      content_html_en: en.contentHtml,
      quote_en: en.quote,
      quote_source_en: en.quoteSource,
      glossary_en_json: en.glossary,
      translation_status: 'translated',
      translation_provider: 'seed-curated',
      translated_at: now,
      published_at: now,
      created_at: now,
      updated_at: now,
    });
  });

  redEarthStories.forEach((story, idx) => {
    const en = seedStoriesEn[story.id];
    const slug = slugifyVietnamese(story.title);
    const defaultGlossary = [
      {
        term: 'Trải nghiệm gợi ý',
        def: `Ghé thăm ${story.location} vào buổi sớm để cảm nhận trọn vẹn nhịp sống bản địa.`,
      },
      {
        term: 'Kết nối hành trình',
        def: 'Có thể tích hợp trực tiếp vào lịch trình 2N1Đ hoặc 3N2Đ tại Đắk Lắk.',
      },
    ];
    const sectionMeta = {
      gradient: story.gradient,
      offsetClass: story.offsetClass,
    };

    rows.push({
      slug,
      legacy_key: story.id,
      section: 'stories',
      status: 'published',
      sort_order: idx,
      author_id: adminId,
      reviewed_by: adminId,
      review_note: '',
      cover_image: story.image,
      image_alt: story.title,
      theme_key: story.themeKey,
      section_meta_json: sectionMeta,
      title: story.title,
      excerpt: story.desc,
      category: story.tag,
      location: story.location,
      read_time: '5 phút đọc',
      cta_label: story.cta,
      preview_paragraphs_json: story.fullParas,
      content_html: paragraphsToHtml(story.fullParas),
      quote: story.quote,
      quote_source: `— Chuyện của đất đỏ Đắk Lắk • ${story.location}`,
      glossary_json: defaultGlossary,
      title_en: en.title,
      excerpt_en: en.excerpt,
      category_en: en.category,
      location_en: en.location,
      read_time_en: en.readTime,
      cta_label_en: en.cta,
      preview_paragraphs_en_json: en.previewParagraphs,
      content_html_en: en.contentHtml,
      quote_en: en.quote,
      quote_source_en: en.quoteSource,
      glossary_en_json: en.glossary,
      translation_status: 'translated',
      translation_provider: 'seed-curated',
      translated_at: now,
      published_at: now,
      created_at: now,
      updated_at: now,
    });
  });

  return rows;
}

async function ensureSeedDataSupabase(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // 1. Ensure default admin & writer accounts
  const { count: userCount, error: userCountErr } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });
  if (userCountErr) throw new Error(`Supabase seed users count failed: ${userCountErr.message}`);

  let adminId = 1;
  if (!userCount || userCount === 0) {
    const { data: insertedUsers, error: insertUsersErr } = await supabase
      .from('users')
      .insert([
        {
          email: DEFAULT_ADMIN_EMAIL.toLowerCase(),
          display_name: 'Ban Biên Tập (Admin)',
          password_hash: hashPassword(DEFAULT_ADMIN_PASSWORD),
          role: 'admin',
          is_active: true,
          created_at: now,
        },
        {
          email: DEFAULT_WRITER_EMAIL.toLowerCase(),
          display_name: 'Tác Giả Cao Nguyên',
          password_hash: hashPassword(DEFAULT_WRITER_PASSWORD),
          role: 'writer',
          is_active: true,
          created_at: now,
        },
      ])
      .select('id, role');
    if (insertUsersErr) {
      throw new Error(`Supabase seed users insert failed: ${insertUsersErr.message}`);
    }
    const adminRow = insertedUsers?.find((u) => u.role === 'admin');
    if (adminRow) adminId = Number(adminRow.id);
    console.log(`[CMS Seed] Created default users in Supabase.`);
  } else {
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingAdmin?.id) adminId = Number(existingAdmin.id);
  }

  // 2. Ensure initial posts
  const { count: postCount, error: postCountErr } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true });
  if (postCountErr) throw new Error(`Supabase seed posts count failed: ${postCountErr.message}`);

  if (!postCount || postCount === 0) {
    const postRows = buildInitialPostPayloads(adminId, now);
    const { error: insertPostsErr } = await supabase
      .from('posts')
      .upsert(postRows, { onConflict: 'slug', ignoreDuplicates: true });
    if (insertPostsErr) {
      throw new Error(`Supabase seed posts insert failed: ${insertPostsErr.message}`);
    }
    console.log('[CMS Seed] Seeded 6 Bento posts and 8 Red Earth stories into Supabase.');
  }

  // 3. Ensure stays
  const { count: staysCount, error: staysCountErr } = await supabase
    .from('stays')
    .select('id', { count: 'exact', head: true });
  if (staysCountErr) throw new Error(`Supabase seed stays count failed: ${staysCountErr.message}`);

  if (!staysCount || staysCount === 0) {
    const stayRows = INITIAL_STAYS.map((stay) => ({
      name: stay.name,
      area: stay.area,
      tier: stay.tier,
      nightly_rate_vnd: stay.nightlyRateVnd,
      capacity_min: stay.capacityMin,
      capacity_max: stay.capacityMax,
      suitable_for_json: stay.suitableFor,
      amenities_json: stay.amenities,
      source_note: stay.sourceNote,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));
    const { error: insertStaysErr } = await supabase
      .from('stays')
      .upsert(stayRows, { onConflict: 'name', ignoreDuplicates: true });
    if (insertStaysErr) {
      throw new Error(`Supabase seed stays insert failed: ${insertStaysErr.message}`);
    }
    console.log(`[AI Seed] Seeded ${stayRows.length} stays into Supabase.`);
  }

  // 4. Ensure logistics
  const { count: logisticsCount, error: logisticsCountErr } = await supabase
    .from('logistics')
    .select('id', { count: 'exact', head: true });
  if (logisticsCountErr) {
    throw new Error(`Supabase seed logistics count failed: ${logisticsCountErr.message}`);
  }

  if (!logisticsCount || logisticsCount === 0) {
    const logisticsRows = INITIAL_LOGISTICS.map((item) => ({
      mode: item.mode,
      label: item.label,
      tier: item.tier,
      daily_rate_vnd: item.dailyRateVnd,
      capacity_min: item.capacityMin,
      capacity_max: item.capacityMax,
      suitable_for_json: item.suitableFor,
      notes: item.notes,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));
    const { error: insertLogisticsErr } = await supabase
      .from('logistics')
      .upsert(logisticsRows, { onConflict: 'mode', ignoreDuplicates: true });
    if (insertLogisticsErr) {
      throw new Error(`Supabase seed logistics insert failed: ${insertLogisticsErr.message}`);
    }
    console.log(`[AI Seed] Seeded ${logisticsRows.length} logistics options into Supabase.`);
  }

  // 5. Ensure place_prices
  const { count: placePricesCount, error: placePricesCountErr } = await supabase
    .from('place_prices')
    .select('id', { count: 'exact', head: true });
  if (placePricesCountErr) {
    throw new Error(`Supabase seed place_prices count failed: ${placePricesCountErr.message}`);
  }

  if (!placePricesCount || placePricesCount === 0) {
    const placeRows = dakLakPlaceDirectory.map((place) => {
      const pricing = SEED_PLACE_PRICING[place.title] || {
        areaCluster: place.location.includes('Hồ Lắk')
          ? 'Hồ Lắk'
          : place.location.includes('Ea Kao')
            ? 'Ea Kao'
            : 'BMT',
        ticketVnd: 30000,
        estimatedSpendVnd: 120000,
        priceNote: 'Mức chi phí ước tính tham khảo tại điểm tham quan.',
      };
      return {
        place_title: place.title,
        area_cluster: pricing.areaCluster,
        ticket_vnd: pricing.ticketVnd,
        estimated_spend_vnd: pricing.estimatedSpendVnd,
        price_source: 'seed',
        price_note: pricing.priceNote,
        source_url: '',
        fetched_at: now,
        updated_at: now,
      };
    });
    const { error: insertPlaceErr } = await supabase
      .from('place_prices')
      .upsert(placeRows, { onConflict: 'place_title', ignoreDuplicates: true });
    if (insertPlaceErr) {
      throw new Error(`Supabase seed place_prices insert failed: ${insertPlaceErr.message}`);
    }
    console.log(`[AI Seed] Seeded ${placeRows.length} place_prices into Supabase.`);
  }
}

function ensureSeedDataSqlite(): void {
  const db = getDb();
  const now = new Date().toISOString();

  // 1. Ensure initial admin and writer accounts exist if users table is empty
  const userCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM users').get() as { cnt: number };
  let adminId = 1;

  if (userCountRow.cnt === 0) {
    const insertUser = db.prepare(
      `INSERT INTO users (email, display_name, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`
    );
    const adminResult = insertUser.run(
      DEFAULT_ADMIN_EMAIL.toLowerCase(),
      'Ban Biên Tập (Admin)',
      hashPassword(DEFAULT_ADMIN_PASSWORD),
      'admin',
      now
    );
    adminId = Number(adminResult.lastInsertRowid);

    insertUser.run(
      DEFAULT_WRITER_EMAIL.toLowerCase(),
      'Tác Giả Cao Nguyên',
      hashPassword(DEFAULT_WRITER_PASSWORD),
      'writer',
      now
    );

    console.log(
      `[CMS Seed] Created default users -> Admin: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD} | Writer: ${DEFAULT_WRITER_EMAIL} / ${DEFAULT_WRITER_PASSWORD}`
    );
  } else {
    const existingAdmin = db
      .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1")
      .get() as { id: number } | undefined;
    if (existingAdmin) adminId = existingAdmin.id;
  }

  // 2. Ensure initial posts exist if posts table is empty
  const postCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM posts').get() as { cnt: number };
  if (postCountRow.cnt === 0) {
    const insertPost = db.prepare(`
      INSERT INTO posts (
        slug, legacy_key, section, status, sort_order, author_id, reviewed_by, review_note,
        cover_image, image_alt, theme_key, section_meta_json,
        title, excerpt, category, location, read_time, cta_label,
        preview_paragraphs_json, content_html, quote, quote_source, glossary_json,
        title_en, excerpt_en, category_en, location_en, read_time_en, cta_label_en,
        preview_paragraphs_en_json, content_html_en, quote_en, quote_source_en, glossary_en_json,
        translation_status, translation_provider, translated_at,
        published_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, 'published', ?, ?, ?, '',
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'translated', 'seed-curated', ?,
        ?, ?, ?
      )
    `);

    const postRows = buildInitialPostPayloads(adminId, now);
    for (const row of postRows) {
      insertPost.run(
        String(row.slug),
        row.legacy_key ? String(row.legacy_key) : null,
        String(row.section),
        Number(row.sort_order),
        Number(row.author_id),
        Number(row.reviewed_by),
        String(row.cover_image),
        String(row.image_alt),
        String(row.theme_key),
        JSON.stringify(row.section_meta_json),
        String(row.title),
        String(row.excerpt),
        String(row.category),
        String(row.location),
        String(row.read_time),
        String(row.cta_label),
        JSON.stringify(row.preview_paragraphs_json),
        String(row.content_html),
        String(row.quote),
        String(row.quote_source),
        JSON.stringify(row.glossary_json),
        String(row.title_en),
        String(row.excerpt_en),
        String(row.category_en),
        String(row.location_en),
        String(row.read_time_en),
        String(row.cta_label_en),
        JSON.stringify(row.preview_paragraphs_en_json),
        String(row.content_html_en),
        String(row.quote_en),
        String(row.quote_source_en),
        JSON.stringify(row.glossary_en_json),
        now,
        now,
        now,
        now
      );
    }

    console.log('[CMS Seed] Seeded 6 Bento posts and 8 Red Earth stories into SQLite.');
  }

  // 3. Seed stays if empty
  const staysCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM stays').get() as { cnt: number };
  if (staysCountRow.cnt === 0) {
    const insertStay = db.prepare(`
      INSERT INTO stays (
        name, area, tier, nightly_rate_vnd, capacity_min, capacity_max,
        suitable_for_json, amenities_json, source_note, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (const stay of INITIAL_STAYS) {
      insertStay.run(
        stay.name,
        stay.area,
        stay.tier,
        stay.nightlyRateVnd,
        stay.capacityMin,
        stay.capacityMax,
        JSON.stringify(stay.suitableFor),
        JSON.stringify(stay.amenities),
        stay.sourceNote,
        now,
        now
      );
    }
    console.log(`[AI Seed] Seeded ${INITIAL_STAYS.length} stays into SQLite.`);
  }

  // 4. Seed logistics if empty
  const logisticsCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM logistics').get() as {
    cnt: number;
  };
  if (logisticsCountRow.cnt === 0) {
    const insertLogistics = db.prepare(`
      INSERT INTO logistics (
        mode, label, tier, daily_rate_vnd, capacity_min, capacity_max,
        suitable_for_json, notes, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    for (const item of INITIAL_LOGISTICS) {
      insertLogistics.run(
        item.mode,
        item.label,
        item.tier,
        item.dailyRateVnd,
        item.capacityMin,
        item.capacityMax,
        JSON.stringify(item.suitableFor),
        item.notes,
        now,
        now
      );
    }
    console.log(`[AI Seed] Seeded ${INITIAL_LOGISTICS.length} logistics options into SQLite.`);
  }

  // 5. Seed place_prices if empty
  const placePricesCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM place_prices').get() as {
    cnt: number;
  };
  if (placePricesCountRow.cnt === 0) {
    const insertPlacePrice = db.prepare(`
      INSERT INTO place_prices (
        place_title, area_cluster, ticket_vnd, estimated_spend_vnd,
        price_source, price_note, source_url, fetched_at, updated_at
      ) VALUES (?, ?, ?, ?, 'seed', ?, '', ?, ?)
    `);

    for (const place of dakLakPlaceDirectory) {
      const pricing = SEED_PLACE_PRICING[place.title] || {
        areaCluster: place.location.includes('Hồ Lắk')
          ? 'Hồ Lắk'
          : place.location.includes('Ea Kao')
            ? 'Ea Kao'
            : 'BMT',
        ticketVnd: 30000,
        estimatedSpendVnd: 120000,
        priceNote: 'Mức chi phí ước tính tham khảo tại điểm tham quan.',
      };

      insertPlacePrice.run(
        place.title,
        pricing.areaCluster,
        pricing.ticketVnd,
        pricing.estimatedSpendVnd,
        pricing.priceNote,
        now,
        now
      );
    }
    console.log(`[AI Seed] Seeded ${dakLakPlaceDirectory.length} place_prices into SQLite.`);
  }
}

export async function ensureSeedData(): Promise<void> {
  if (isUsingSupabase()) {
    await ensureSeedDataSupabase();
    return;
  }
  ensureSeedDataSqlite();
}
