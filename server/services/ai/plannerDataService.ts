import { AI_PRICE_TTL_HOURS } from '../../config.ts';
import { getDb, isUsingSupabase } from '../../db/database.ts';
import { getSupabaseAdmin } from '../../db/supabaseClient.ts';
import { dakLakPlaceDirectory } from '../../../src/data/places.ts';
import {
  type AccommodationRecord,
  type BudgetType,
  type CompanionType,
  type LogisticsRecord,
  type PlaceMeta,
  type PricedPlaceItem,
  type ThemeType,
} from '../../../src/types/index.ts';

export interface PlacePlannerMetadata {
  areaCluster: string;
  themeTags: ThemeType[];
  defaultTicketVnd: number;
  defaultEstimatedSpendVnd: number;
}

export interface EnrichedPlaceRecord extends PricedPlaceItem {
  meta: PlaceMeta;
}

export interface UpsertPlacePriceInput {
  placeTitle: string;
  areaCluster: string;
  ticketVnd: number;
  estimatedSpendVnd: number;
  priceSource: 'seed' | 'sqlite_cache' | 'tavily' | 'estimated';
  priceNote?: string;
  sourceUrl?: string;
  fetchedAt?: string;
}

export const AREA_CLUSTER_COORDS: Record<
  string,
  { lat: number; lng: number; x: number; y: number }
> = {
  BMT: { lat: 12.6788, lng: 108.0422, x: 378, y: 196 },
  'Hồ Lắk': { lat: 12.42167, lng: 108.18194, x: 545, y: 315 },
  'Dray Nur': { lat: 12.5028, lng: 107.925, x: 268, y: 285 },
  'Buôn Đôn': { lat: 12.8394, lng: 107.7438, x: 155, y: 125 },
  'Krông Năng': { lat: 12.94694, lng: 108.36111, x: 472, y: 92 },
  'Ea Kao': { lat: 12.608, lng: 108.055, x: 342, y: 235 },
  'Chư Yang Sin': { lat: 12.455, lng: 108.375, x: 598, y: 342 },
};

export const PLACE_PLANNER_METADATA: Record<string, PlacePlannerMetadata> = {
  'Bảo tàng Thế giới Cà phê': {
    areaCluster: 'BMT',
    themeTags: ['coffee', 'culture'],
    defaultTicketVnd: 150000,
    defaultEstimatedSpendVnd: 220000,
  },
  'Làng Cà phê Trung Nguyên': {
    areaCluster: 'BMT',
    themeTags: ['coffee', 'cuisine'],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 120000,
  },
  'Buôn cổ Ako Dhông': {
    areaCluster: 'BMT',
    themeTags: ['culture', 'coffee', 'cuisine'],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 100000,
  },
  'Bảo tàng Đắk Lắk': {
    areaCluster: 'BMT',
    themeTags: ['culture'],
    defaultTicketVnd: 30000,
    defaultEstimatedSpendVnd: 50000,
  },
  'Nông trại Cà phê Ea Tân': {
    areaCluster: 'Krông Năng',
    themeTags: ['coffee', 'nature'],
    defaultTicketVnd: 120000,
    defaultEstimatedSpendVnd: 250000,
  },
  'Đá Voi Mẹ Yang Tao': {
    areaCluster: 'Hồ Lắk',
    themeTags: ['nature', 'culture'],
    defaultTicketVnd: 20000,
    defaultEstimatedSpendVnd: 40000,
  },
  'Hồ Lắk & Buôn Jun': {
    areaCluster: 'Hồ Lắk',
    themeTags: ['nature', 'culture', 'coffee'],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 220000,
  },
  'Đồi Biệt điện Bảo Đại': {
    areaCluster: 'Hồ Lắk',
    themeTags: ['culture', 'coffee'],
    defaultTicketVnd: 30000,
    defaultEstimatedSpendVnd: 60000,
  },
  'Thác Dray Nur Hùng Vĩ': {
    areaCluster: 'Dray Nur',
    themeTags: ['nature'],
    defaultTicketVnd: 40000,
    defaultEstimatedSpendVnd: 100000,
  },
  'Vườn Quốc gia Yok Đôn': {
    areaCluster: 'Buôn Đôn',
    themeTags: ['nature'],
    defaultTicketVnd: 60000,
    defaultEstimatedSpendVnd: 850000,
  },
  'Làng Dệt Thổ Cẩm Tơng Jú': {
    areaCluster: 'Ea Kao',
    themeTags: ['culture'],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 150000,
  },
  'Phố Ẩm thực Phan Đình Giót': {
    areaCluster: 'BMT',
    themeTags: ['cuisine', 'coffee'],
    defaultTicketVnd: 0,
    defaultEstimatedSpendVnd: 150000,
  },
  'Cầu Treo Sêrêpốk Bản Đôn': {
    areaCluster: 'Buôn Đôn',
    themeTags: ['culture', 'nature', 'cuisine'],
    defaultTicketVnd: 50000,
    defaultEstimatedSpendVnd: 180000,
  },
};

interface StayDbRow {
  id: number;
  name: string;
  area: string;
  tier: BudgetType;
  nightly_rate_vnd: number;
  capacity_min: number;
  capacity_max: number;
  suitable_for_json: string | CompanionType[];
  amenities_json: string | string[];
  source_note: string;
  is_active: number | boolean;
  updated_at: string;
}

interface LogisticsDbRow {
  id: number;
  mode: string;
  label: string;
  tier: BudgetType;
  daily_rate_vnd: number;
  capacity_min: number;
  capacity_max: number;
  suitable_for_json: string | CompanionType[];
  notes: string;
  is_active: number | boolean;
  updated_at: string;
}

interface PlacePriceDbRow {
  id: number;
  place_title: string;
  area_cluster: string;
  ticket_vnd: number;
  estimated_spend_vnd: number;
  price_source: 'seed' | 'sqlite_cache' | 'tavily' | 'estimated';
  price_note: string;
  source_url: string;
  fetched_at: string;
  updated_at: string;
}

function safeJsonArray<T>(raw: unknown, fallback: T[]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function inferPlaceMetadata(place: PlaceMeta): PlacePlannerMetadata {
  const known = PLACE_PLANNER_METADATA[place.title];
  if (known) return known;

  const hay = `${place.title} ${place.location} ${place.category}`.toLowerCase();
  let areaCluster = 'BMT';
  if (hay.includes('hồ lắk') || hay.includes('yang tao') || hay.includes('liên sơn')) {
    areaCluster = 'Hồ Lắk';
  } else if (hay.includes('dray nur') || hay.includes('krông ana')) {
    areaCluster = 'Dray Nur';
  } else if (hay.includes('yok đôn') || hay.includes('bản đôn') || hay.includes('buôn đôn')) {
    areaCluster = 'Buôn Đôn';
  } else if (hay.includes('krông năng') || hay.includes('ea tân')) {
    areaCluster = 'Krông Năng';
  } else if (hay.includes('ea kao') || hay.includes('tơng jú')) {
    areaCluster = 'Ea Kao';
  }

  const themeTags: ThemeType[] = [];
  if (hay.includes('cà phê') || hay.includes('coffee')) themeTags.push('coffee');
  if (
    hay.includes('văn hóa') ||
    hay.includes('bảo tàng') ||
    hay.includes('buôn') ||
    hay.includes('thổ cẩm')
  ) {
    themeTags.push('culture');
  }
  if (
    hay.includes('thác') ||
    hay.includes('vườn quốc gia') ||
    hay.includes('hồ') ||
    hay.includes('đá voi')
  ) {
    themeTags.push('nature');
  }
  if (hay.includes('ẩm thực') || hay.includes('phố')) themeTags.push('cuisine');
  if (themeTags.length === 0) themeTags.push('culture');

  return {
    areaCluster,
    themeTags,
    defaultTicketVnd: 30000,
    defaultEstimatedSpendVnd: 120000,
  };
}

/**
 * Lists active accommodation options from Supabase (or SQLite fallback) filtered by optional tier, capacity, and companion fit.
 */
export async function listActiveStays(filters?: {
  tier?: BudgetType;
  travelersCount?: number;
  companionType?: CompanionType;
  area?: string;
}): Promise<AccommodationRecord[]> {
  let rows: StayDbRow[];
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('stays')
      .select('*')
      .eq('is_active', true)
      .order('nightly_rate_vnd', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw new Error(`Supabase listActiveStays failed: ${error.message}`);
    rows = (data || []) as StayDbRow[];
  } else {
    const db = getDb();
    rows = db
      .prepare('SELECT * FROM stays WHERE is_active = 1 ORDER BY nightly_rate_vnd ASC, id ASC')
      .all() as unknown as StayDbRow[];
  }

  let records: AccommodationRecord[] = rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    area: row.area,
    tier: row.tier,
    nightlyRateVnd: row.nightly_rate_vnd,
    capacityMin: row.capacity_min,
    capacityMax: row.capacity_max,
    suitableFor: safeJsonArray<CompanionType>(row.suitable_for_json, []),
    amenities: safeJsonArray<string>(row.amenities_json, []),
    isActive: row.is_active === true || row.is_active === 1,
    sourceNote: row.source_note || undefined,
    updatedAt: row.updated_at,
  }));

  if (filters?.tier) {
    records = records.filter((r) => r.tier === filters.tier);
  }
  if (filters?.area) {
    const areaLower = filters.area.toLowerCase();
    records = records.filter((r) => r.area.toLowerCase().includes(areaLower));
  }
  let exceedsSingleUnitCapacity = false;
  if (typeof filters?.travelersCount === 'number' && filters.travelersCount > 0) {
    const count = filters.travelersCount;
    const capacityMatched = records.filter(
      (r) => count >= r.capacityMin && count <= r.capacityMax
    );
    if (capacityMatched.length > 0) {
      records = capacityMatched;
    } else {
      exceedsSingleUnitCapacity = true;
    }
  }
  if (filters?.companionType || exceedsSingleUnitCapacity) {
    const comp = filters?.companionType;
    records.sort((a, b) => {
      if (comp) {
        const aFit = a.suitableFor.includes(comp) ? 1 : 0;
        const bFit = b.suitableFor.includes(comp) ? 1 : 0;
        if (bFit !== aFit) return bFit - aFit;
      }
      if (exceedsSingleUnitCapacity && b.capacityMax !== a.capacityMax) {
        return b.capacityMax - a.capacityMax;
      }
      return a.nightlyRateVnd - b.nightlyRateVnd;
    });
  }

  return records;
}

/**
 * Lists active transport/logistics options from Supabase (or SQLite fallback) filtered by optional tier, capacity, and companion fit.
 */
export async function listActiveLogistics(filters?: {
  tier?: BudgetType;
  travelersCount?: number;
  companionType?: CompanionType;
}): Promise<LogisticsRecord[]> {
  let rows: LogisticsDbRow[];
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('logistics')
      .select('*')
      .eq('is_active', true)
      .order('daily_rate_vnd', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw new Error(`Supabase listActiveLogistics failed: ${error.message}`);
    rows = (data || []) as LogisticsDbRow[];
  } else {
    const db = getDb();
    rows = db
      .prepare('SELECT * FROM logistics WHERE is_active = 1 ORDER BY daily_rate_vnd ASC, id ASC')
      .all() as unknown as LogisticsDbRow[];
  }

  let records: LogisticsRecord[] = rows.map((row) => ({
    id: Number(row.id),
    mode: row.mode,
    label: row.label,
    tier: row.tier,
    dailyRateVnd: row.daily_rate_vnd,
    capacityMin: row.capacity_min,
    capacityMax: row.capacity_max,
    suitableFor: safeJsonArray<CompanionType>(row.suitable_for_json, []),
    notes: row.notes || '',
    isActive: row.is_active === true || row.is_active === 1,
    updatedAt: row.updated_at,
  }));

  if (filters?.tier) {
    records = records.filter((r) => r.tier === filters.tier);
  }
  let exceedsSingleVehicleCapacity = false;
  if (typeof filters?.travelersCount === 'number' && filters.travelersCount > 0) {
    const count = filters.travelersCount;
    const capacityMatched = records.filter(
      (r) => count >= r.capacityMin && count <= r.capacityMax
    );
    if (capacityMatched.length > 0) {
      records = capacityMatched;
    } else {
      exceedsSingleVehicleCapacity = true;
      if (count > 2) {
        const largerVehicles = records.filter((r) => r.capacityMax > 2);
        if (largerVehicles.length > 0) {
          records = largerVehicles;
        }
      }
    }
  }
  if (filters?.companionType || exceedsSingleVehicleCapacity) {
    const comp = filters?.companionType;
    records.sort((a, b) => {
      if (exceedsSingleVehicleCapacity && b.capacityMax !== a.capacityMax) {
        return b.capacityMax - a.capacityMax;
      }
      if (comp) {
        const aFit = a.suitableFor.includes(comp) ? 1 : 0;
        const bFit = b.suitableFor.includes(comp) ? 1 : 0;
        if (bFit !== aFit) return bFit - aFit;
      }
      return a.dailyRateVnd - b.dailyRateVnd;
    });
  }

  return records;
}

/**
 * Upserts a cached place ticket & spend estimate into Supabase (or SQLite fallback) `place_prices`.
 */
export async function upsertPlacePrice(input: UpsertPlacePriceInput): Promise<void> {
  const now = new Date().toISOString();
  const fetchedAt = input.fetchedAt || now;
  const ticketVnd = Math.max(0, Math.round(input.ticketVnd));
  const estimatedSpendVnd = Math.max(ticketVnd, Math.round(input.estimatedSpendVnd));

  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('place_prices').upsert(
      {
        place_title: input.placeTitle.trim(),
        area_cluster: input.areaCluster.trim(),
        ticket_vnd: ticketVnd,
        estimated_spend_vnd: estimatedSpendVnd,
        price_source: input.priceSource,
        price_note: (input.priceNote || '').trim(),
        source_url: (input.sourceUrl || '').trim(),
        fetched_at: fetchedAt,
        updated_at: now,
      },
      { onConflict: 'place_title' }
    );
    if (error) throw new Error(`Supabase upsertPlacePrice failed: ${error.message}`);
    return;
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO place_prices (
      place_title, area_cluster, ticket_vnd, estimated_spend_vnd,
      price_source, price_note, source_url, fetched_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(place_title) DO UPDATE SET
      area_cluster = excluded.area_cluster,
      ticket_vnd = excluded.ticket_vnd,
      estimated_spend_vnd = excluded.estimated_spend_vnd,
      price_source = excluded.price_source,
      price_note = excluded.price_note,
      source_url = excluded.source_url,
      fetched_at = excluded.fetched_at,
      updated_at = excluded.updated_at`
  ).run(
    input.placeTitle.trim(),
    input.areaCluster.trim(),
    ticketVnd,
    estimatedSpendVnd,
    input.priceSource,
    (input.priceNote || '').trim(),
    (input.sourceUrl || '').trim(),
    fetchedAt,
    now
  );
}

export function isPriceTimestampStale(
  fetchedAt: string | null | undefined,
  ttlHours = AI_PRICE_TTL_HOURS,
  nowMs = Date.now()
): boolean {
  if (!fetchedAt) return true;
  const parsed = Date.parse(fetchedAt);
  if (!Number.isFinite(parsed)) return true;
  const ageMs = nowMs - parsed;
  return ageMs > ttlHours * 60 * 60 * 1000;
}

/**
 * Combines `dakLakPlaceDirectory` with `areaCluster`, `themeTags`, and Supabase (or SQLite) `place_prices`.
 */
export async function listEnrichedPlaces(
  ttlHours = AI_PRICE_TTL_HOURS,
  nowMs = Date.now()
): Promise<EnrichedPlaceRecord[]> {
  let rows: PlacePriceDbRow[];
  if (isUsingSupabase()) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('place_prices').select('*');
    if (error) throw new Error(`Supabase listEnrichedPlaces failed: ${error.message}`);
    rows = (data || []) as PlacePriceDbRow[];
  } else {
    const db = getDb();
    rows = db.prepare('SELECT * FROM place_prices').all() as unknown as PlacePriceDbRow[];
  }

  const byTitle = new Map<string, PlacePriceDbRow>();
  for (const row of rows) {
    byTitle.set(row.place_title.trim().toLowerCase(), row);
  }

  return dakLakPlaceDirectory.map((place) => {
    const plannerMeta = inferPlaceMetadata(place);
    const cached = byTitle.get(place.title.trim().toLowerCase());
    const fetchedAt = cached?.fetched_at || '';
    const isStale = !cached || isPriceTimestampStale(fetchedAt, ttlHours, nowMs);

    return {
      title: place.title,
      location: place.location,
      areaCluster: cached?.area_cluster || plannerMeta.areaCluster,
      themeTags: plannerMeta.themeTags,
      ticketVnd: cached ? cached.ticket_vnd : plannerMeta.defaultTicketVnd,
      estimatedSpendVnd: cached
        ? cached.estimated_spend_vnd
        : plannerMeta.defaultEstimatedSpendVnd,
      priceSource: cached ? cached.price_source : 'estimated',
      priceNote: cached?.price_note || undefined,
      sourceUrl: cached?.source_url || undefined,
      fetchedAt: fetchedAt || new Date(nowMs).toISOString(),
      isStale,
      meta: place,
    };
  });
}
