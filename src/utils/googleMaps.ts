import { FlattenedStop } from '../types';

export interface LatLngCoord {
  lat: number;
  lng: number;
}

const KNOWN_GEO_LOOKUP: Array<{
  keywords: string[];
  coord: LatLngCoord;
  googleMapsQuery: string;
}> = [
  {
    keywords: ['thế giới cà phê', 'world coffee museum'],
    coord: { lat: 12.69086, lng: 108.04471 },
    googleMapsQuery: 'Bảo tàng Thế giới Cà phê, Nguyễn Đình Chiểu, Buôn Ma Thuột, Đắk Lắk',
  },
  {
    keywords: ['làng cà phê trung nguyên', 'trung nguyên'],
    coord: { lat: 12.701056, lng: 108.061103 },
    googleMapsQuery: 'Làng Cà phê Trung Nguyên, 163 Lý Thái Tổ, Buôn Ma Thuột, Đắk Lắk',
  },
  {
    keywords: ['ako dhông', 'akô đhông'],
    coord: { lat: 12.6964, lng: 108.0478 },
    googleMapsQuery: 'Buôn Akô Đhông, Trần Nhật Duật, Buôn Ma Thuột, Đắk Lắk',
  },
  {
    keywords: ['bảo tàng đắk lắk'],
    coord: { lat: 12.6715, lng: 108.0535 },
    googleMapsQuery: 'Bảo tàng Đắk Lắk, 12 Lê Duẩn, Buôn Ma Thuột, Đắk Lắk',
  },
  {
    keywords: ['ea tân', 'krông năng', 'cư m’gar', "cư m'gar"],
    coord: { lat: 12.94694, lng: 108.36111 },
    googleMapsQuery: 'Xã Ea Tân, Krông Năng, Đắk Lắk',
  },
  {
    keywords: ['đá voi mẹ', 'đá voi'],
    coord: { lat: 12.48139, lng: 108.23306 },
    googleMapsQuery: 'Đá Voi Mẹ, Yang Tao, Lắk, Đắk Lắk',
  },
  {
    keywords: ['gốm cổ', 'làng gốm', 'yang tao'],
    coord: { lat: 12.468, lng: 108.215 },
    googleMapsQuery: 'Làng gốm cổ Yang Tao, Huyện Lắk, Đắk Lắk',
  },
  {
    keywords: ['biệt điện bảo đại'],
    coord: { lat: 12.426, lng: 108.176 },
    googleMapsQuery: 'Biệt điện Bảo Đại Hồ Lắk, Liên Sơn, Huyện Lắk, Đắk Lắk',
  },
  {
    keywords: ['buôn jun', 'buôn lê', 'hồ lắk', 'độc mộc'],
    coord: { lat: 12.42167, lng: 108.18194 },
    googleMapsQuery: 'Hồ Lắk & Buôn Jun, Thị trấn Liên Sơn, Huyện Lắk, Đắk Lắk',
  },
  {
    keywords: ['dray nur', 'chảo gang bên suối'],
    coord: { lat: 12.5028, lng: 107.925 },
    googleMapsQuery: 'Thác Dray Nur, Dray Sáp, Krông Ana, Đắk Lắk',
  },
  {
    keywords: ['gia long'],
    coord: { lat: 12.5139, lng: 107.8889 },
    googleMapsQuery: 'Thác Gia Long, Sông Sêrêpốk, Đắk Lắk',
  },
  {
    keywords: ['buôn kuốp'],
    coord: { lat: 12.5417, lng: 107.9125 },
    googleMapsQuery: 'Buôn Kuốp, Dray Sáp, Krông Ana, Đắk Lắk',
  },
  {
    keywords: ['yok đôn'],
    coord: { lat: 12.8038, lng: 107.6707 },
    googleMapsQuery: 'Vườn Quốc gia Yok Đôn, Krông Na, Buôn Đôn, Đắk Lắk',
  },
  {
    keywords: ['cầu treo', 'bản đôn', 'khunjunob', 'sêrêpốk'],
    coord: { lat: 12.875, lng: 107.817 },
    googleMapsQuery: 'Trung tâm du lịch Cầu treo Buôn Đôn, Krông Na, Đắk Lắk',
  },
  {
    keywords: ['tơng jú', 'ea kao'],
    coord: { lat: 12.608, lng: 108.055 },
    googleMapsQuery: 'Buôn Tơng Jú, Xã Ea Kao, Buôn Ma Thuột, Đắk Lắk',
  },
  {
    keywords: ['phan đình giót', 'bún chìa', 'bún đỏ', 'rang mộc'],
    coord: { lat: 12.6816, lng: 108.0398 },
    googleMapsQuery: 'Đường Phan Đình Giót, Buôn Ma Thuột, Đắk Lắk',
  },
  {
    keywords: ['trần nhật duật', 'bánh ướt thịt nướng'],
    coord: { lat: 12.6895, lng: 108.0462 },
    googleMapsQuery: 'Đường Trần Nhật Duật, Buôn Ma Thuột, Đắk Lắk',
  },
  {
    keywords: ['ngã sáu', 'kem bơ'],
    coord: { lat: 12.6797, lng: 108.0445 },
    googleMapsQuery: 'Ngã Sáu Buôn Ma Thuột, Đắk Lắk',
  },
  {
    keywords: ['sân bay', 'bmv'],
    coord: { lat: 12.66806, lng: 108.12 },
    googleMapsQuery: 'Sân bay Buôn Ma Thuột, Hòa Thắng, Đắk Lắk',
  },
  {
    keywords: ['chư yang sin', 'thác bìm bịp'],
    coord: { lat: 12.455, lng: 108.375 },
    googleMapsQuery: 'Vườn Quốc gia Chư Yang Sin, Krông Bông, Đắk Lắk',
  },
  {
    keywords: ['kpin ea', 'bến nước cổ'],
    coord: { lat: 12.686, lng: 108.062 },
    googleMapsQuery: 'Bến nước cổ Buôn Ma Thuột, Đắk Lắk',
  },
  {
    keywords: ['buôn ma thuột', 'cà phê vợt đêm', 'cá lăng'],
    coord: { lat: 12.6788, lng: 108.0422 },
    googleMapsQuery: 'Trung tâm Thành phố Buôn Ma Thuột, Đắk Lắk',
  },
];

/**
 * Fallback linear conversion from the legacy 760x400 illustrative canvas
 * coordinates onto Đắk Lắk's geographic bounding box when explicit lat/lng
 * are unavailable.
 */
function projectLegacyCanvasToLatLng(x: number, y: number): LatLngCoord {
  const clampedX = Math.max(0, Math.min(760, x || 380));
  const clampedY = Math.max(0, Math.min(400, y || 200));
  const lat = 13.02 - (clampedY / 400) * 0.68;
  const lng = 107.55 + (clampedX / 760) * 0.92;
  return {
    lat: Math.round(lat * 100000) / 100000,
    lng: Math.round(lng * 100000) / 100000,
  };
}

export function resolveGeoForStop(input: {
  title: string;
  location?: string;
  x?: number;
  y?: number;
  lat?: number;
  lng?: number;
  googleMapsQuery?: string;
}): { lat: number; lng: number; googleMapsQuery: string } {
  const haystack = `${input.title || ''} ${input.location || ''}`.toLowerCase();
  const matched = KNOWN_GEO_LOOKUP.find((entry) =>
    entry.keywords.some((kw) => haystack.includes(kw))
  );

  const lat =
    typeof input.lat === 'number'
      ? input.lat
      : matched
        ? matched.coord.lat
        : projectLegacyCanvasToLatLng(input.x ?? 380, input.y ?? 200).lat;

  const lng =
    typeof input.lng === 'number'
      ? input.lng
      : matched
        ? matched.coord.lng
        : projectLegacyCanvasToLatLng(input.x ?? 380, input.y ?? 200).lng;

  const googleMapsQuery =
    input.googleMapsQuery ||
    matched?.googleMapsQuery ||
    [input.title, input.location, 'Đắk Lắk'].filter(Boolean).join(', ');

  return { lat, lng, googleMapsQuery };
}

/**
 * Universal Google Maps Search URL (`api=1`): opens native Google Maps app
 * on iOS/Android via Universal/App Links or Google Maps Web on desktop.
 */
export function buildGoogleMapsPlaceUrl(input: {
  title: string;
  location?: string;
  x?: number;
  y?: number;
  lat?: number;
  lng?: number;
  googleMapsQuery?: string;
}): string {
  const { googleMapsQuery } = resolveGeoForStop(input);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapsQuery)}`;
}

/**
 * Universal Google Maps Directions URL (`api=1`) from the user's current
 * location (default in Google Maps when origin is omitted) to a destination.
 */
export function buildGoogleMapsDirectionsToUrl(input: {
  title: string;
  location?: string;
  x?: number;
  y?: number;
  lat?: number;
  lng?: number;
  googleMapsQuery?: string;
}): string {
  const { googleMapsQuery } = resolveGeoForStop(input);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    googleMapsQuery
  )}&travelmode=driving`;
}

/**
 * Multi-stop Google Maps route URL (`dir/?api=1`) for a list of checkpoints.
 * Google Maps supports up to 9 intermediate waypoints via URL scheme.
 */
export function buildGoogleMapsRouteUrl(
  stops: Array<
    Pick<FlattenedStop, 'title' | 'location' | 'x' | 'y' | 'lat' | 'lng' | 'googleMapsQuery'>
  >
): string | null {
  if (!stops || stops.length === 0) return null;
  if (stops.length === 1) return buildGoogleMapsPlaceUrl(stops[0]);

  const trimmed = stops.slice(0, 11);
  const queries = trimmed.map((s) => resolveGeoForStop(s).googleMapsQuery);
  const origin = queries[0];
  const destination = queries[queries.length - 1];
  const waypoints = queries.slice(1, -1).slice(0, 9);

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function haversineDistanceKm(a: LatLngCoord, b: LatLngCoord): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
