import { dakLakPlaceDirectory, findPlaceMeta, themeCoverImages } from '../data/places.ts';
import type {
  BackpackItem,
  CmsPostPublic,
  DurationType,
  ItineraryDay,
  ItinerarySlot,
  Language,
  ModalArticlePayload,
  PlaceMeta,
  SeasonData,
  ThemeType,
} from '../types/index.ts';
import { haversineDistanceKm, resolveGeoForStop } from './googleMaps.ts';
import { getDayCount } from './plannerHelpers.ts';

export const BACKPACK_STORAGE_KEY = 'daklak_trip_backpack_v1';

export function slugifyBackpackKey(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function inferAreaCluster(title: string, location?: string): string {
  const hay = `${title || ''} ${location || ''}`.toLowerCase();
  if (
    hay.includes('hồ lắk') ||
    hay.includes('ho lak') ||
    hay.includes('buôn jun') ||
    hay.includes('liên sơn') ||
    hay.includes('yang tao') ||
    hay.includes('biệt điện') ||
    hay.includes('đá voi') ||
    hay.includes('huyện lắk')
  ) {
    return 'Hồ Lắk';
  }
  if (
    hay.includes('yok đôn') ||
    hay.includes('yok don') ||
    hay.includes('buôn đôn') ||
    hay.includes('bản đôn') ||
    hay.includes('krông na') ||
    hay.includes('cầu treo')
  ) {
    return 'Buôn Đôn';
  }
  if (
    hay.includes('dray nur') ||
    hay.includes('dray sáp') ||
    hay.includes('krông ana') ||
    hay.includes('gia long') ||
    hay.includes('buôn kuốp')
  ) {
    return 'Krông Ana';
  }
  if (
    hay.includes('ea tân') ||
    hay.includes('krông năng') ||
    hay.includes('cư m’gar') ||
    hay.includes("cư m'gar") ||
    hay.includes('cu mgar')
  ) {
    return 'Cư M’gar & Ea Tân';
  }
  if (hay.includes('ea kao') || hay.includes('tơng jú')) {
    return 'Ea Kao';
  }
  return 'TP. Buôn Ma Thuột';
}

function inferThemeFromPlace(place: PlaceMeta): ThemeType {
  const hay = `${place.title} ${place.category}`.toLowerCase();
  if (hay.includes('cà phê') || hay.includes('nông trại')) return 'coffee';
  if (hay.includes('ẩm thực') || hay.includes('phan đình giót')) return 'cuisine';
  if (
    hay.includes('thác') ||
    hay.includes('hồ') ||
    hay.includes('vườn quốc gia') ||
    hay.includes('đá voi') ||
    hay.includes('sinh thái')
  ) {
    return 'nature';
  }
  return 'culture';
}

export function buildBackpackItemFromPlace(
  place: PlaceMeta,
  overrides?: Partial<Pick<BackpackItem, 'sourceType' | 'sourcePostSlug' | 'seasonHint' | 'themeKey'>>
): BackpackItem {
  const geo = resolveGeoForStop(place);
  const id = `place:${slugifyBackpackKey(place.title)}`;
  return {
    id,
    title: place.title,
    location: place.location,
    themeKey: overrides?.themeKey || inferThemeFromPlace(place),
    category: place.category,
    image: place.image,
    desc: place.desc,
    duration: place.duration,
    rating: place.rating,
    reviews: place.reviews,
    lat: geo.lat,
    lng: geo.lng,
    x: place.x,
    y: place.y,
    googleMapsQuery: geo.googleMapsQuery,
    areaCluster: inferAreaCluster(place.title, place.location),
    sourceType: overrides?.sourceType || 'place',
    sourcePostSlug: overrides?.sourcePostSlug,
    seasonHint: overrides?.seasonHint,
    addedAt: Date.now(),
  };
}

/**
 * Known legacy/editorial slug or keyword mappings to canonical PlaceMeta records
 * so saving a blog card and saving the same landmark from search share one canonical ID.
 */
const EDITORIAL_PLACE_HINTS: Array<{ match: string[]; placeTitle: string }> = [
  { match: ['coffee', 'thủ phủ cà phê', 'world coffee', 'robusta'], placeTitle: 'Bảo tàng Thế giới Cà phê' },
  { match: ['gong', 'cồng chiêng', 'chiêng knah'], placeTitle: 'Bảo tàng Đắk Lắk' },
  { match: ['matriarchy', 'mẫu hệ', 'ako dhông', 'nhà dài'], placeTitle: 'Buôn cổ Ako Dhông' },
  { match: ['waterfalls', 'dray nur', 'thác nước'], placeTitle: 'Thác Dray Nur Hùng Vĩ' },
  { match: ['bandon', 'bản đôn', 'yok đôn', 'sêrêpốk', 'voi rừng'], placeTitle: 'Vườn Quốc gia Yok Đôn' },
  { match: ['cuisine', 'ẩm thực', 'bún đỏ', 'bánh ướt'], placeTitle: 'Phố Ẩm thực Phan Đình Giót' },
  { match: ['hoa cà phê', 'tháng ba', 'cư m’gar', 'ea tân'], placeTitle: 'Nông trại Cà phê Ea Tân' },
  { match: ['thổ cẩm', 'tơng jú', 'ea kao'], placeTitle: 'Làng Dệt Thổ Cẩm Tơng Jú' },
  { match: ['hồ lắk', 'độc mộc', 'buôn jun'], placeTitle: 'Hồ Lắk & Buôn Jun' },
  { match: ['đá voi', 'yang tao'], placeTitle: 'Đá Voi Mẹ Yang Tao' },
  { match: ['biệt điện', 'bảo đại'], placeTitle: 'Đồi Biệt điện Bảo Đại' },
  { match: ['cầu treo'], placeTitle: 'Cầu Treo Sêrêpốk Bản Đôn' },
];

function matchDirectoryPlaceForPost(input: {
  slug?: string;
  legacyKey?: string | null;
  title: string;
  location?: string;
}): PlaceMeta | null {
  const hay = `${input.legacyKey || ''} ${input.slug || ''} ${input.title || ''} ${input.location || ''}`.toLowerCase();

  // First check direct directory title match
  const direct = dakLakPlaceDirectory.find((p) => hay.includes(p.title.toLowerCase()));
  if (direct) return direct;

  // Next check curated editorial-to-place hint table
  for (const hint of EDITORIAL_PLACE_HINTS) {
    if (hint.match.some((kw) => hay.includes(kw))) {
      const matched = dakLakPlaceDirectory.find((p) => p.title === hint.placeTitle);
      if (matched) return matched;
    }
  }

  return null;
}

export function buildBackpackItemFromPost(
  post:
    | Pick<CmsPostPublic, 'slug' | 'legacyKey' | 'title' | 'location' | 'category' | 'image' | 'excerpt' | 'themeKey'>
    | Pick<ModalArticlePayload, 'slug' | 'title' | 'location' | 'category' | 'image' | 'excerpt' | 'themeKey'>
): BackpackItem {
  const legacyKey = 'legacyKey' in post ? post.legacyKey : null;
  const matchedPlace = matchDirectoryPlaceForPost({
    slug: post.slug,
    legacyKey,
    title: post.title,
    location: post.location,
  });

  if (matchedPlace) {
    return buildBackpackItemFromPlace(matchedPlace, {
      sourceType: 'post',
      sourcePostSlug: post.slug,
      themeKey: post.themeKey || inferThemeFromPlace(matchedPlace),
    });
  }

  const fallbackMeta = findPlaceMeta(post.title, post.location, post.themeKey);
  const geo = resolveGeoForStop({
    title: post.title,
    location: post.location,
  });
  const slugKey = slugifyBackpackKey(post.slug || post.title);

  return {
    id: `post:${slugKey}`,
    title: post.title,
    location: post.location || 'Đắk Lắk',
    themeKey: post.themeKey || 'coffee',
    category: post.category || fallbackMeta.category,
    image: post.image || fallbackMeta.image || themeCoverImages[post.themeKey || 'coffee'],
    desc: post.excerpt || post.title,
    duration: fallbackMeta.duration || '1.5 giờ',
    rating: fallbackMeta.rating || '4.7',
    reviews: fallbackMeta.reviews || '520',
    lat: geo.lat,
    lng: geo.lng,
    x: 380,
    y: 192,
    googleMapsQuery: geo.googleMapsQuery,
    areaCluster: inferAreaCluster(post.title, post.location),
    sourceType: 'post',
    sourcePostSlug: post.slug,
    addedAt: Date.now(),
  };
}

const SEASON_SIGNATURE_PLACE: Record<string, string> = {
  'Mùa Xuân': 'Nông trại Cà phê Ea Tân',
  'Mùa Hạ': 'Hồ Lắk & Buôn Jun',
  'Mùa Thu': 'Thác Dray Nur Hùng Vĩ',
  'Mùa Đông': 'Bảo tàng Thế giới Cà phê',
};

export function buildBackpackItemFromSeason(season: SeasonData): BackpackItem {
  const targetTitle = SEASON_SIGNATURE_PLACE[season.headline] || 'Bảo tàng Thế giới Cà phê';
  const matched =
    dakLakPlaceDirectory.find((p) => p.title === targetTitle) || dakLakPlaceDirectory[0];
  return buildBackpackItemFromPlace(matched, {
    sourceType: 'season',
    themeKey: season.plannerTheme,
    seasonHint: `${season.headline} (${season.milestone})`,
  });
}

export interface BackpackGeographySummary {
  areas: string[];
  estimatedRouteKm: number;
  suggestedDuration: DurationType;
  dominantTheme: ThemeType;
}

export function summarizeBackpackGeography(items: BackpackItem[]): BackpackGeographySummary {
  if (items.length === 0) {
    return {
      areas: [],
      estimatedRouteKm: 0,
      suggestedDuration: '2N1D',
      dominantTheme: 'coffee',
    };
  }

  const areas = Array.from(new Set(items.map((item) => item.areaCluster || inferAreaCluster(item.title, item.location))));

  // Compute approximate span along nearest-neighbor chain
  let estimatedRouteKm = 0;
  if (items.length >= 2) {
    const remaining = items.slice(1);
    let current = items[0];
    while (remaining.length > 0) {
      const curGeo = resolveGeoForStop(current);
      let bestIdx = 0;
      let bestDist = Infinity;
      remaining.forEach((cand, idx) => {
        const d = haversineDistanceKm(curGeo, resolveGeoForStop(cand));
        if (d < bestDist) {
          bestDist = d;
          bestIdx = idx;
        }
      });
      estimatedRouteKm += Math.max(1.5, bestDist * 1.28);
      current = remaining.splice(bestIdx, 1)[0];
    }
  } else {
    estimatedRouteKm = 12;
  }

  const outerAreas = areas.filter((a) => a !== 'TP. Buôn Ma Thuột' && a !== 'Ea Kao');
  let suggestedDuration: DurationType = '2N1D';
  if (items.length >= 7 || outerAreas.length >= 3 || estimatedRouteKm > 150) {
    suggestedDuration = '4N3D+';
  } else if (items.length >= 4 || outerAreas.length >= 2 || estimatedRouteKm > 70) {
    suggestedDuration = '3N2D';
  }

  const themeCounts: Record<ThemeType, number> = {
    coffee: 0,
    culture: 0,
    nature: 0,
    cuisine: 0,
  };
  for (const item of items) {
    themeCounts[item.themeKey] = (themeCounts[item.themeKey] || 0) + 1;
  }
  const dominantTheme = (Object.entries(themeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'coffee') as ThemeType;

  return {
    areas,
    estimatedRouteKm: Math.round(estimatedRouteKm),
    suggestedDuration,
    dominantTheme,
  };
}

const SLOT_TIME_DEFAULTS = [
  { time: '08:00 – 10:00', period: 'Buổi sáng' },
  { time: '10:30 – 12:30', period: 'Giữa sáng' },
  { time: '14:30 – 16:30', period: 'Buổi chiều' },
  { time: '18:00 – 20:00', period: 'Buổi tối' },
];

const SLOT_TIME_DEFAULTS_EN = [
  { time: '08:00 – 10:00', period: 'Morning' },
  { time: '10:30 – 12:30', period: 'Late Morning' },
  { time: '14:30 – 16:30', period: 'Afternoon' },
  { time: '18:00 – 20:00', period: 'Evening' },
];

/**
 * Deterministic, zero-AI schedule builder that turns the user's packed backpack
 * destinations into a geographically clustered, nearest-neighbor ordered ItineraryDay[]
 * ready for the Split-Screen Map & Schedule Canvas.
 */
export function buildManualWorkingDaysFromBackpack(
  items: BackpackItem[],
  duration: DurationType,
  lang: Language = 'vi'
): ItineraryDay[] {
  if (items.length === 0) return [];

  const isEn = lang === 'en';
  const requestedDays = getDayCount(duration);
  const actualDayCount = Math.max(1, Math.min(requestedDays, items.length));

  // Cluster items by geographic area, starting with BMT Center first
  const byArea = new Map<string, BackpackItem[]>();
  for (const item of items) {
    const area = item.areaCluster || inferAreaCluster(item.title, item.location);
    const list = byArea.get(area) || [];
    list.push(item);
    byArea.set(area, list);
  }

  const orderedAreas = Array.from(byArea.keys()).sort((a, b) => {
    if (a === 'TP. Buôn Ma Thuột') return -1;
    if (b === 'TP. Buôn Ma Thuột') return 1;
    return (byArea.get(b)?.length || 0) - (byArea.get(a)?.length || 0);
  });

  // Flatten in area-grouped order so nearby stops stay together on the same day
  const areaSortedItems: BackpackItem[] = [];
  for (const area of orderedAreas) {
    const group = [...(byArea.get(area) || [])];
    if (group.length > 2) {
      const chain: BackpackItem[] = [group[0]];
      const rest = group.slice(1);
      while (rest.length > 0) {
        const lastGeo = resolveGeoForStop(chain[chain.length - 1]);
        let bestIdx = 0;
        let bestDist = Infinity;
        rest.forEach((cand, idx) => {
          const d = haversineDistanceKm(lastGeo, resolveGeoForStop(cand));
          if (d < bestDist) {
            bestDist = d;
            bestIdx = idx;
          }
        });
        chain.push(rest.splice(bestIdx, 1)[0]);
      }
      areaSortedItems.push(...chain);
    } else {
      areaSortedItems.push(...group);
    }
  }

  // Partition into `actualDayCount` balanced buckets
  const buckets: BackpackItem[][] = Array.from({ length: actualDayCount }, () => []);
  const baseSize = Math.floor(areaSortedItems.length / actualDayCount);
  const extra = areaSortedItems.length % actualDayCount;
  let cursor = 0;
  for (let d = 0; d < actualDayCount; d++) {
    const count = baseSize + (d < extra ? 1 : 0);
    buckets[d] = areaSortedItems.slice(cursor, cursor + count);
    cursor += count;
  }

  const stamp = Date.now();
  const timeDefaults = isEn ? SLOT_TIME_DEFAULTS_EN : SLOT_TIME_DEFAULTS;

  return buckets
    .filter((b) => b.length > 0)
    .map((bucket, dIdx) => {
      const dayAreas = Array.from(new Set(bucket.map((item) => item.areaCluster)));
      const areaLabel = dayAreas.join(' • ');
      const dayLabel = isEn ? `Day ${dIdx + 1}` : `Ngày ${dIdx + 1}`;
      const dayTitle = isEn
        ? `Your Picks: ${dayAreas[0] || 'Đắk Lắk'}`
        : `Hành trình tự chọn: ${dayAreas[0] || 'Đắk Lắk'}`;

      const slots: ItinerarySlot[] = bucket.map((item, sIdx) => {
        const slotTime = timeDefaults[sIdx % timeDefaults.length];
        const geo = resolveGeoForStop(item);
        const dirMatch = dakLakPlaceDirectory.find((p) => p.title === item.title);
        return {
          id: `stop-bp-${dIdx}-${sIdx}-${stamp}`,
          time: dirMatch?.time || slotTime.time,
          period: dirMatch?.period || slotTime.period,
          title: item.title,
          location: item.location,
          x: item.x ?? dirMatch?.x ?? 380,
          y: item.y ?? dirMatch?.y ?? 192,
          lat: geo.lat,
          lng: geo.lng,
          googleMapsQuery: geo.googleMapsQuery,
          desc:
            item.desc ||
            dirMatch?.desc ||
            (isEn
              ? `Saved from your Trip Backpack (${item.location}).`
              : `Điểm đến bạn đã lưu trong Balo Hành Trình (${item.location}).`),
          image: item.image || dirMatch?.image || themeCoverImages[item.themeKey],
          category: item.category || dirMatch?.category || 'Điểm trải nghiệm',
          rating: item.rating || dirMatch?.rating || '4.8',
          reviews: item.reviews || dirMatch?.reviews || '520',
          duration: item.duration || dirMatch?.duration || '1.5 giờ',
          areaCluster: item.areaCluster,
        };
      });

      return {
        day: dayLabel,
        title: dayTitle,
        area: areaLabel || 'Đắk Lắk',
        slots,
      };
    });
}

export function loadBackpackFromStorage(): BackpackItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BACKPACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BackpackItem =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.location === 'string'
    );
  } catch {
    return [];
  }
}

export function saveBackpackToStorage(items: BackpackItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BACKPACK_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
}
