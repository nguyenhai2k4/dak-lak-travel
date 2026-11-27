import test from 'node:test';
import assert from 'node:assert/strict';
import { dakLakPlaceDirectory } from '../src/data/places.ts';
import { seasonsData } from '../src/data/seasons.ts';
import {
  buildBackpackItemFromPlace,
  buildBackpackItemFromPost,
  buildBackpackItemFromSeason,
  buildManualWorkingDaysFromBackpack,
  summarizeBackpackGeography,
} from '../src/utils/backpackHelpers.ts';
import { runPhase2Capacity } from '../server/services/ai/workflow/phase2Capacity.ts';
import { runPhase3Budget } from '../server/services/ai/workflow/phase3Budget.ts';
import { runPhase4Purpose } from '../server/services/ai/workflow/phase4Purpose.ts';
import type { IntakeState } from '../src/types/index.ts';

test('buildBackpackItemFromPost maps editorial posts to canonical directory IDs for deduplication', () => {
  const placeItem = buildBackpackItemFromPlace(dakLakPlaceDirectory[0]); // Bảo tàng Thế giới Cà phê
  const postItem = buildBackpackItemFromPost({
    slug: 'thu-phu-ca-phe-the-gioi',
    legacyKey: 'coffee',
    title: 'Thủ phủ Cà phê Thế giới',
    location: 'Buôn Ma Thuột • Cư M’gar',
    category: 'Thủ phủ Cà phê',
    image: placeItem.image,
    excerpt: 'Hành trình Robusta Đắk Lắk',
    themeKey: 'coffee',
  });

  assert.equal(postItem.id, placeItem.id);
  assert.equal(postItem.sourcePostSlug, 'thu-phu-ca-phe-the-gioi');
  assert.equal(typeof postItem.lat, 'number');
  assert.equal(typeof postItem.lng, 'number');
});

test('buildBackpackItemFromSeason preserves seasonHint and geo metadata', () => {
  const autumn = seasonsData[2]; // Mùa Thu -> Thác Dray Nur Hùng Vĩ
  const item = buildBackpackItemFromSeason(autumn);

  assert.equal(item.sourceType, 'season');
  assert.match(item.seasonHint || '', /Mùa Thu/);
  assert.equal(item.title, 'Thác Dray Nur Hùng Vĩ');
  assert.equal(item.areaCluster, 'Krông Ana');
});

test('summarizeBackpackGeography computes areas, km span, and pacing deterministically', () => {
  const bmt = buildBackpackItemFromPlace(dakLakPlaceDirectory[0]);
  const lak = buildBackpackItemFromPlace(
    dakLakPlaceDirectory.find((p) => p.title.includes('Hồ Lắk'))!
  );
  const yokDon = buildBackpackItemFromPlace(
    dakLakPlaceDirectory.find((p) => p.title.includes('Yok Đôn'))!
  );

  const summary = summarizeBackpackGeography([bmt, lak, yokDon]);
  assert.equal(summary.areas.length, 3);
  assert.ok(summary.estimatedRouteKm > 80);
  assert.equal(summary.suggestedDuration, '3N2D');
});

test('buildManualWorkingDaysFromBackpack preserves every packed stop without AI', () => {
  const picks = [
    dakLakPlaceDirectory[0], // BMT
    dakLakPlaceDirectory[2], // Ako Dhông (BMT)
    dakLakPlaceDirectory[6], // Hồ Lắk
    dakLakPlaceDirectory[8], // Thác Dray Nur
    dakLakPlaceDirectory[9], // Yok Đôn
  ].map((p) => buildBackpackItemFromPlace(p));

  const days = buildManualWorkingDaysFromBackpack(picks, '3N2D', 'vi');
  assert.equal(days.length, 3);

  const flattenedTitles = days.flatMap((d) => d.slots.map((s) => s.title));
  assert.equal(flattenedTitles.length, picks.length);
  for (const p of picks) {
    assert.ok(flattenedTitles.includes(p.title), `Expected ${p.title} in manual days`);
  }
});

test('Phase 4 purpose selection honors pinned Trip Backpack destinations', async () => {
  const intake: IntakeState = {
    intent: 'plan_trip',
    travelersCount: 2,
    companionType: 'couple',
    travelDates: 'tháng 3',
    duration: '3N2D',
    totalBudgetVnd: 5_000_000,
    budgetTier: 'standard',
    mainPurpose: 'coffee',
    secondaryInterests: [],
    missingFields: [],
    needsClarification: false,
  };

  const capacityPlan = await runPhase2Capacity(intake, { lang: 'vi' });
  const budgetResult = await runPhase3Budget(intake, capacityPlan, {
    forceSkipTavily: true,
    skipSqliteUpsert: true,
    lang: 'vi',
  });

  const pinned = ['Thác Dray Nur Hùng Vĩ', 'Hồ Lắk & Buôn Jun'];
  const selection = await runPhase4Purpose(intake, capacityPlan, budgetResult, {
    lang: 'vi',
    pinnedPlaces: pinned,
    queryPostsFn: () => [],
  });

  const selectedTitles = selection.selectedPlaces.map((p) => p.title);
  for (const title of pinned) {
    assert.ok(
      selectedTitles.includes(title),
      `Expected pinned Backpack place "${title}" in selectedPlaces: ${selectedTitles.join(', ')}`
    );
  }
});
