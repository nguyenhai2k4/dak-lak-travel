import type { FeatureCollection, LineString } from 'geojson';
import * as maplibregl from 'maplibre-gl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, {
  Layer,
  MapRef,
  Marker,
  NavigationControl,
  ScaleControl,
  Source,
} from 'react-map-gl/maplibre';
import { useAppContext } from '../../context/AppContext';
import { findPlaceMeta } from '../../data/places';
import { canvasDayColors } from '../../data/plannerCatalog';
import { FlattenedStop } from '../../types';
import {
  buildGoogleMapsDirectionsToUrl,
  buildGoogleMapsPlaceUrl,
  buildGoogleMapsRouteUrl,
  resolveGeoForStop,
} from '../../utils/googleMaps';
import { flattenStops } from '../../utils/plannerHelpers';

type OpenFreeMapStyleKey = 'liberty' | 'bright' | 'positron';

const OPENFREEMAP_STYLES: Record<
  OpenFreeMapStyleKey,
  { label: string; url: string }
> = {
  liberty: {
    label: 'Bản đồ 3D',
    url: 'https://tiles.openfreemap.org/styles/liberty',
  },
  bright: {
    label: 'Đường phố',
    url: 'https://tiles.openfreemap.org/styles/bright',
  },
  positron: {
    label: 'Tối giản',
    url: 'https://tiles.openfreemap.org/styles/positron',
  },
};

const DAK_LAK_INITIAL_VIEW = {
  longitude: 108.05,
  latitude: 12.668,
  zoom: 10.5,
  pitch: 0,
  bearing: 0,
};

export const InteractiveTripMap: React.FC = () => {
  const {
    theme,
    workingDays,
    mapDayFilter,
    selectedStopIndex,
    showMapPlaceCard,
    mobilePane,
    setMapDayFilter,
    selectMapStop,
    closeMapPlaceCard,
    copyTailoredItinerary,
    jumpFromMapStopToSchedule,
    openRelatedPlannerStory,
  } = useAppContext();

  // Default: Preview First (better UX); Optional: instant open Google Maps on pin click
  const [openMapsOnPinTap, setOpenMapsOnPinTap] = useState(false);
  const [mapStyleKey, setMapStyleKey] = useState<OpenFreeMapStyleKey>('liberty');
  const [is3DPitch, setIs3DPitch] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const mapRef = useRef<MapRef | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const prevFilterRef = useRef<'all' | number>(mapDayFilter);
  const prevSelectedRef = useRef<number>(selectedStopIndex);
  const hasFittedInitialRef = useRef(false);

  const allStops = useMemo(() => flattenStops(workingDays, 'all'), [workingDays]);
  const visibleStops = useMemo(
    () => flattenStops(workingDays, mapDayFilter),
    [workingDays, mapDayFilter]
  );

  const visibleWithGeo = useMemo(
    () =>
      visibleStops.map((stop) => {
        const geo = resolveGeoForStop(stop);
        return {
          stop,
          lat: geo.lat,
          lng: geo.lng,
          googleMapsUrl: buildGoogleMapsPlaceUrl({ ...stop, ...geo }),
        };
      }),
    [visibleStops]
  );

  // GeoJSON FeatureCollection for day-colored WebGL route lines
  const routeGeoJson = useMemo<FeatureCollection<LineString>>(() => {
    const features: FeatureCollection<LineString>['features'] = [];
    for (let i = 1; i < visibleWithGeo.length; i++) {
      const prev = visibleWithGeo[i - 1];
      const curr = visibleWithGeo[i];
      const color = canvasDayColors[(curr.stop.dayNum - 1) % canvasDayColors.length];
      features.push({
        type: 'Feature',
        properties: {
          id: `${prev.stop.id}-${curr.stop.id}`,
          color,
          dayNum: curr.stop.dayNum,
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [prev.lng, prev.lat],
            [curr.lng, curr.lat],
          ],
        },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [visibleWithGeo]);

  const googleMapsDayRouteUrl = useMemo(
    () => buildGoogleMapsRouteUrl(visibleStops),
    [visibleStops]
  );

  const activeStop =
    allStops.find((s) => s.globalIdx === selectedStopIndex) || visibleStops[0] || allStops[0];
  const activeMeta = activeStop
    ? findPlaceMeta(activeStop.title, activeStop.location, theme)
    : null;
  const activeGoogleMapsUrl = activeStop ? buildGoogleMapsPlaceUrl(activeStop) : '#';
  const activeDirectionsUrl = activeStop ? buildGoogleMapsDirectionsToUrl(activeStop) : '#';

  const fitVisibleStops = useCallback(
    (animate: boolean) => {
      const map = mapRef.current;
      if (!map) return;

      if (visibleWithGeo.length === 0) {
        map.flyTo({
          center: [DAK_LAK_INITIAL_VIEW.longitude, DAK_LAK_INITIAL_VIEW.latitude],
          zoom: 10.5,
          duration: animate ? 650 : 0,
        });
        return;
      }

      if (visibleWithGeo.length === 1) {
        map.flyTo({
          center: [visibleWithGeo[0].lng, visibleWithGeo[0].lat],
          zoom: 13.5,
          duration: animate ? 650 : 0,
        });
        return;
      }

      const bounds = new maplibregl.LngLatBounds(
        [visibleWithGeo[0].lng, visibleWithGeo[0].lat],
        [visibleWithGeo[0].lng, visibleWithGeo[0].lat]
      );
      visibleWithGeo.forEach((item) => bounds.extend([item.lng, item.lat]));

      map.fitBounds(bounds, {
        padding: {
          top: 96,
          right: 64,
          bottom: showMapPlaceCard ? 255 : 64,
          left: 52,
        },
        maxZoom: 14,
        duration: animate ? 700 : 0,
      });
    },
    [showMapPlaceCard, visibleWithGeo]
  );

  // Resize WebGL canvas cleanly when container size or mobile pane changes
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const handleResize = () => {
      mapRef.current?.resize();
    };
    const timer = window.setTimeout(handleResize, 60);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(handleResize);
      ro.observe(vp);
    }
    return () => {
      window.clearTimeout(timer);
      ro?.disconnect();
    };
  }, [mobilePane]);

  // Fit bounds when map loads or when day filter changes
  useEffect(() => {
    if (!isMapLoaded) return;
    const filterChanged = prevFilterRef.current !== mapDayFilter;
    if (!hasFittedInitialRef.current || filterChanged) {
      hasFittedInitialRef.current = true;
      prevFilterRef.current = mapDayFilter;
      fitVisibleStops(filterChanged);
    }
  }, [fitVisibleStops, isMapLoaded, mapDayFilter]);

  // Smoothly pan/fly to newly selected stop when triggered from schedule or pins
  useEffect(() => {
    if (!isMapLoaded || prevSelectedRef.current === selectedStopIndex) return;
    prevSelectedRef.current = selectedStopIndex;
    const target = visibleWithGeo.find((item) => item.stop.globalIdx === selectedStopIndex);
    if (target && mapRef.current) {
      mapRef.current.easeTo({
        center: [target.lng, target.lat],
        offset: showMapPlaceCard ? [0, -70] : [0, 0],
        duration: 500,
      });
    }
  }, [isMapLoaded, selectedStopIndex, showMapPlaceCard, visibleWithGeo]);

  const togglePitch = () => {
    const nextPitch = !is3DPitch;
    setIs3DPitch(nextPitch);
    mapRef.current?.easeTo({
      pitch: nextPitch ? 48 : 0,
      duration: 500,
    });
  };

  const handlePinClick = useCallback(
    (stop: FlattenedStop, googleMapsUrl: string) => {
      selectMapStop(stop.globalIdx, true);
      if (openMapsOnPinTap) {
        window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
      }
    },
    [openMapsOnPinTap, selectMapStop]
  );

  return (
    <div
      id="canvas-right-pane"
      className={`${
        mobilePane === 'map' ? 'block' : 'hidden lg:block'
      } w-full lg:w-[48%] xl:w-[50%] flex-1 lg:flex-none h-full relative bg-[#EAEFE9] overflow-hidden select-none`}
    >
      {/* Top Floating Map Controls */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-1.5 max-w-full">
          <div
            id="map-day-filters"
            className="flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-full border border-stone-200/90 shadow-md"
          >
            <button
              type="button"
              onClick={() => setMapDayFilter('all')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                mapDayFilter === 'all'
                  ? 'bg-[#132A1E] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <span>Tất cả ({allStops.length})</span>
            </button>

            {workingDays.map((d, i) => {
              const val = i + 1;
              const isActive = mapDayFilter === val;
              const color = canvasDayColors[i % canvasDayColors.length];
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setMapDayFilter(val)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    isActive
                      ? 'bg-[#132A1E] text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span>{d.day}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Pin click behavior switch */}
            <div className="inline-flex items-center gap-1 bg-white/92 backdrop-blur-md px-2 py-1 rounded-full border border-stone-200/90 shadow-sm text-[10px]">
              <span className="text-stone-500 font-semibold pl-1">Chạm ghim:</span>
              <button
                type="button"
                onClick={() => setOpenMapsOnPinTap(false)}
                className={`px-2 py-0.5 rounded-full font-bold transition-colors ${
                  !openMapsOnPinTap
                    ? 'bg-[#132A1E] text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Xem trước
              </button>
              <button
                type="button"
                onClick={() => setOpenMapsOnPinTap(true)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold transition-colors ${
                  openMapsOnPinTap
                    ? 'bg-[#8C3B2B] text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" aria-hidden="true" />
                <span>Mở ngay Maps</span>
              </button>
            </div>

            {/* Vector map style switcher (OpenFreeMap styles) */}
            <div className="inline-flex items-center gap-0.5 bg-white/92 backdrop-blur-md p-0.5 rounded-full border border-stone-200/90 shadow-sm text-[10px]">
              {(Object.keys(OPENFREEMAP_STYLES) as OpenFreeMapStyleKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMapStyleKey(key)}
                  className={`px-2 py-0.5 rounded-full font-bold transition-colors ${
                    mapStyleKey === key
                      ? 'bg-[#D48C46] text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {OPENFREEMAP_STYLES[key].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {googleMapsDayRouteUrl && (
            <a
              href={googleMapsDayRouteUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở toàn bộ lộ trình đang lọc trên Google Maps"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#132A1E] hover:bg-[#1e402e] text-white border border-[#132A1E] shadow-md text-xs font-bold transition-all"
            >
              <i className="fa-solid fa-route text-[11px] text-[#D48C46]" aria-hidden="true" />
              <span>Tuyến Google Maps</span>
            </a>
          )}
          <button
            type="button"
            onClick={copyTailoredItinerary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-[#132A1E] border border-stone-200/90 shadow-md text-xs font-bold transition-all"
          >
            <i className="fa-solid fa-arrow-up-from-bracket text-[11px] text-[#8C3B2B]" aria-hidden="true" />
            <span>Xuất</span>
          </button>
        </div>
      </div>

      {/* Real WebGL Vector Map Viewport (MapLibre GL JS + OpenFreeMap) */}
      <div
        ref={viewportRef}
        id="map-viewport"
        className="daklak-maplibre-container relative w-full h-full z-0"
      >
        <Map
          ref={mapRef}
          initialViewState={DAK_LAK_INITIAL_VIEW}
          mapStyle={OPENFREEMAP_STYLES[mapStyleKey].url}
          mapLib={maplibregl}
          onLoad={() => setIsMapLoaded(true)}
          attributionControl={{ compact: true }}
          dragRotate={true}
          touchZoomRotate={true}
          scrollZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl
            position="bottom-right"
            showCompass={true}
            showZoom={true}
            visualizePitch={true}
          />
          <ScaleControl position="bottom-right" unit="metric" maxWidth={90} />

          {/* WebGL GeoJSON Route Layers */}
          <Source id="dak-lak-route-source" type="geojson" data={routeGeoJson}>
            <Layer
              id="dak-lak-route-casing"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#ffffff',
                'line-width': 6.5,
                'line-opacity': 0.94,
              }}
            />
            <Layer
              id="dak-lak-route-line"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 3.5,
                'line-opacity': 0.96,
              }}
            />
          </Source>

          {/* Interactive Numbered Destination Checkpoints */}
          {visibleWithGeo.map(({ stop, lat, lng, googleMapsUrl }) => {
            const isSelected = stop.globalIdx === selectedStopIndex;
            const pinColor = canvasDayColors[(stop.dayNum - 1) % canvasDayColors.length];
            const pinNum = stop.globalIdx + 1;
            const shortTitle =
              stop.title.length > 24 ? `${stop.title.slice(0, 22)}…` : stop.title;

            return (
              <Marker
                key={stop.id}
                longitude={lng}
                latitude={lat}
                anchor="bottom"
                style={{ zIndex: isSelected ? 20 : 5 }}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  handlePinClick(stop, googleMapsUrl);
                }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={stop.title}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePinClick(stop, googleMapsUrl);
                    }
                  }}
                  className={`daklak-pin-wrapper ${isSelected ? 'is-selected' : ''}`}
                >
                  {isSelected && (
                    <span
                      className="daklak-pin-halo"
                      style={{ background: `${pinColor}38` }}
                    />
                  )}
                  <span
                    className="daklak-pin-badge"
                    style={{
                      width: isSelected ? 34 : 28,
                      height: isSelected ? 34 : 28,
                      fontSize: isSelected ? 12 : 10,
                      background: pinColor,
                      boxShadow: isSelected
                        ? '0 10px 22px rgba(19,42,30,0.34), 0 0 0 2px rgba(19,42,30,0.2)'
                        : '0 4px 10px rgba(0,0,0,0.24)',
                    }}
                  >
                    {pinNum}
                  </span>
                  <span
                    className="daklak-pin-stem"
                    style={{ borderTop: `7px solid ${pinColor}` }}
                  />
                  <span
                    className="daklak-pin-label"
                    style={{
                      background: isSelected ? '#132A1E' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#132A1E',
                      border: `1px solid ${isSelected ? '#132A1E' : '#E7E5E4'}`,
                    }}
                  >
                    {shortTitle}
                  </span>
                </div>
              </Marker>
            );
          })}
        </Map>
      </div>

      {/* Extra Map Tools: Recenter Bounds & 3D Tilt */}
      <div className="absolute bottom-[232px] right-[14px] z-20 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={togglePitch}
          title={is3DPitch ? 'Chuyển về góc nhìn phẳng 2D' : 'Bật góc nhìn nghiêng 3D'}
          aria-label="Chuyển đổi góc nhìn 2D và 3D"
          className={`w-[34px] h-[34px] rounded-xl border shadow-md flex items-center justify-center text-[10px] font-bold transition-colors ${
            is3DPitch
              ? 'bg-[#132A1E] text-white border-[#132A1E]'
              : 'bg-white/95 hover:bg-white text-[#132A1E] border-stone-200'
          }`}
        >
          3D
        </button>
        <button
          type="button"
          onClick={() => fitVisibleStops(true)}
          title="Căn vừa tất cả điểm đang hiển thị"
          aria-label="Đặt lại góc nhìn bản đồ"
          className="w-[34px] h-[34px] rounded-xl bg-white/95 hover:bg-white text-[#8C3B2B] border border-stone-200 shadow-md flex items-center justify-center text-xs transition-colors"
        >
          <i className="fa-solid fa-crosshairs" aria-hidden="true" />
        </button>
      </div>

      {/* Floating Place Preview Card (Preview First UX) */}
      {showMapPlaceCard && activeStop && activeMeta && (
        <div
          id="map-selected-stop-card"
          className="absolute bottom-4 left-4 right-16 sm:right-auto sm:w-[410px] z-25 bg-white rounded-2xl shadow-2xl border border-stone-200/95 p-4 transition-all duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white font-mono text-[10px] font-bold shrink-0"
                  style={{
                    backgroundColor:
                      canvasDayColors[(activeStop.dayNum - 1) % canvasDayColors.length],
                  }}
                >
                  {String(activeStop.globalIdx + 1).padStart(2, '0')}
                </span>
                <h4 className="font-bold text-base text-[#132A1E] leading-snug truncate">
                  {activeStop.title}
                </h4>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                {activeStop.desc}
              </p>
            </div>

            <div className="flex items-start gap-1.5 shrink-0">
              <img
                src={activeStop.image || activeMeta.image}
                alt={activeStop.title}
                className="w-16 h-16 rounded-xl object-cover bg-stone-100 border border-stone-200"
              />
              <button
                type="button"
                onClick={closeMapPlaceCard}
                title="Ẩn thẻ chi tiết"
                aria-label="Ẩn thẻ chi tiết địa điểm"
                className="w-6 h-6 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="px-2 py-0.5 rounded-full bg-[#F7F3EB] border border-[#E5DEC9] text-[#8C3B2B] text-[10px] font-bold">
              Đã thêm vào "{activeStop.dayLabel}" • {activeStop.period}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-medium">
              {activeStop.category || activeMeta.category}
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-star text-amber-500 text-[11px] w-3.5 text-center" aria-hidden="true" />
              <span className="font-semibold text-[#132A1E]">
                {activeStop.rating || activeMeta.rating}
              </span>
              <span className="text-stone-400">
                ({activeStop.reviews || activeMeta.reviews} đánh giá) • Thời gian gợi ý:{' '}
                {activeStop.duration || activeMeta.duration}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-location-dot text-stone-400 text-[11px] w-3.5 text-center" aria-hidden="true" />
              <span className="truncate">{activeStop.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-regular fa-clock text-stone-400 text-[11px] w-3.5 text-center" aria-hidden="true" />
              <span className="font-medium text-emerald-700">
                {activeStop.time} • Khung giờ đẹp
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={jumpFromMapStopToSchedule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#132A1E] hover:bg-[#1e402e] text-white text-[11px] font-bold transition-colors"
            >
              <span>Xem trong lịch trình</span>
              <span>→</span>
            </button>
            <div className="flex flex-wrap items-center gap-1.5">
              <a
                href={activeGoogleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#8C3B2B] hover:bg-[#732f22] text-white text-[11px] font-semibold transition-colors shadow-xs"
              >
                <i className="fa-solid fa-map-location-dot text-[10px]" aria-hidden="true" />
                <span>Mở Google Maps</span>
              </a>
              <a
                href={activeDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold transition-colors"
              >
                <i className="fa-solid fa-diamond-turn-right text-[10px] text-[#1B5E3A]" aria-hidden="true" />
                <span>Chỉ đường</span>
              </a>
              <button
                type="button"
                onClick={openRelatedPlannerStory}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold transition-colors"
              >
                <span>Chuyện sâu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
