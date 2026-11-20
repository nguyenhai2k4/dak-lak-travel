import { Language } from '../types';

export interface I18nStrings {
  brandSub: string;
  navDestinations: string;
  navCulture: string;
  navStories: string;
  navSeasons: string;
  navPlanCta: string;
  heroSub1: string;
  heroSub2: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  bentoTitle: string;
  bentoSub: string;
  plannerTitle: string;
  plannerSub: string;
  plannerCta: string;
  plannerPlaceholder: string;
  storiesTitle: string;
  storiesSub: string;
  seasonsTitle: string;
}

export const i18nDict: Record<Language, I18nStrings> = {
  vi: {
    brandSub: 'Trái Tim Tây Nguyên',
    navDestinations: 'Điểm đến',
    navCulture: 'Văn hóa bản địa',
    navStories: 'Chuyện đất đỏ',
    navSeasons: 'Cẩm nang 4 mùa',
    navPlanCta: 'Thiết kế lịch trình',
    heroSub1: 'Nơi hạt cà phê đánh thức đại ngàn',
    heroSub2: 'Nơi văn hóa mẫu hệ giữ nhịp thời gian',
    heroCtaPrimary: 'Bắt đầu hành trình đại ngàn',
    heroCtaSecondary: 'May đo lịch trình riêng',
    bentoTitle: 'Bức tranh toàn cảnh Đắk Lắk',
    bentoSub: 'Các mảnh ghép tạo nên sức hút riêng biệt của vùng đất đỏ bazan',
    plannerTitle: 'Mỗi tâm hồn một lối rẽ — Đâu là Đắk Lắk của riêng bạn?',
    plannerSub:
      'Dù bạn tìm kiếm sự tĩnh tại giữa nông trại cà phê sớm mai hay những bước chân khám phá rừng sâu hoang dã, hãy để chúng tôi dệt nên hành trình mang đậm dấu ấn cá nhân.',
    plannerCta: 'Thiết kế lịch trình',
    plannerPlaceholder:
      'Hỏi bất cứ điều gì hoặc mô tả chuyến đi Đắk Lắk bạn mong muốn... (VD: Lên lịch trình 3N2Đ cho cặp đôi thích cà phê đặc sản, ngắm bình minh Hồ Lắk với ngân sách tiêu chuẩn)',
    storiesTitle: 'Chuyện của đất đỏ Đắk Lắk',
    storiesSub: 'Những lát cắt đời sống, ký ức buôn làng và hơi thở con người nơi cao nguyên nắng gió',
    seasonsTitle: 'Cẩm nang 4 mùa Đắk Lắk',
  },
  en: {
    brandSub: 'Heart of Central Highlands',
    navDestinations: 'Destinations',
    navCulture: 'Indigenous Culture',
    navStories: 'Red Earth Stories',
    navSeasons: '4-Season Guide',
    navPlanCta: 'Plan Itinerary',
    heroSub1: 'Where coffee beans awaken the great forest',
    heroSub2: 'Where matriarchal heritage keeps the rhythm of time',
    heroCtaPrimary: 'Begin Your Highland Journey',
    heroCtaSecondary: 'Tailor Your Itinerary',
    bentoTitle: 'The Panorama of Đắk Lắk',
    bentoSub: 'Distinctive cultural and natural facets of the basalt red-soil plateau',
    plannerTitle: 'Every soul has its own path — Which Đắk Lắk is yours?',
    plannerSub:
      'Whether you seek quiet mornings on a Robusta farm or wild trails through dipterocarp forests, let us weave an itinerary tailored to your rhythm.',
    plannerCta: 'Generate Itinerary',
    plannerPlaceholder:
      'Ask anything or describe your ideal Đắk Lắk trip... (e.g., Plan a 3D2N itinerary for a couple loving specialty coffee and Lake Lắk sunrise)',
    storiesTitle: 'Stories of Đắk Lắk Red Earth',
    storiesSub: 'Slices of highland life, village memories, and human warmth across the sunlit plateau',
    seasonsTitle: 'Đắk Lắk 4-Season Guide',
  },
};
