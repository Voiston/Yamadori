<script lang="ts">
	import type { Tree } from '$lib/types/tree';
	import { base } from '$app/paths';
	import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';
	import { formatAccuracy } from '$lib/utils/gps';
	import { buildTreePopupHtml } from '$lib/utils/map/treePopupHtml';
	import {
		createAccuracyCircleFeature,
		createApproachLine,
		createSightLine,
		emptyFeatureCollection
	} from '$lib/utils/map/geojson';
	import {
		createIncludeTileForPolygon,
		polygonBounds,
		type LngLat
	} from '$lib/utils/map/downloadRegion';
	import {
		expandTileUrlTemplate,
		getTileCacheStats,
		prefetchTilesForBounds
	} from '$lib/utils/map/tileCache';
	import {
		EMPTY_OFFLINE_PACK_ESTIMATE,
		layersForSelection,
		resolveOfflinePack,
		type OfflinePackEstimate,
		type OfflinePackLayerKind,
		type OfflinePackSelection
	} from '$lib/utils/map/offlinePack';
	import { forecastPointsForRing, polygonCentroid } from '$lib/utils/offlineForecastGrid';
	import {
		OFFLINE_PARCEL_LIMIT,
		prefetchOfflineParcels
	} from '$lib/utils/offlineParcels';
	import {
		OFFLINE_PROTECTED_LIMIT,
		prefetchOfflineProtectedAreas
	} from '$lib/utils/offlineProtectedAreas';
	import { fetchAgriDataBase } from '$lib/utils/agri';
	import { saveCachedForecast } from '$lib/utils/weatherCache';
	import {
		createMapStyle,
		setBasemapVisibility,
		setCadastreLayerVisibility,
		setProtectedAreasLayerVisibility,
	type MapBasemap
	} from '$lib/utils/map/styles';
	import { resolveCountry } from '$lib/geo/resolveCountry';
	import { applyCountryBasemap } from '$lib/geo/providers/map/applyCountryBasemap';
	import { getMapProvider } from '$lib/geo/providers/map/registry';
	import { getTreeById, treeStore, treesWithGps } from '$lib/stores/trees.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { parkingStore } from '$lib/stores/parking.svelte';
	import { normalizeHeading360 } from '$lib/utils/haversine';
	import {
		shouldUpdateCompassPosition,
		type CompassPosition
	} from '$lib/utils/compassPosition';
	import {
		createSimpleUserMarkerElement,
		createUserHeadingMarkerElement,
		updateUserHeadingMarker
	} from '$lib/utils/map/userMarker';
	import {
		cadastrePinClass,
		focusCenterMarkerCss,
		parkingMarkerCss,
		treeMarkerCss
	} from '$lib/utils/map/mapMarkerStyles';
	import ParkingPanel from '$lib/components/ParkingPanel.svelte';
	import MapDownloadOverlay from '$lib/components/MapDownloadOverlay.svelte';
	import OfflinePackSheet from '$lib/components/OfflinePackSheet.svelte';
	import MapOnboardingSheet from '$lib/components/MapOnboardingSheet.svelte';
	import MapControlsMenu from '$lib/components/MapControlsMenu.svelte';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import CadastreBanner from '$lib/components/CadastreBanner.svelte';
	import VetoLegalChecklist from '$lib/components/VetoLegalChecklist.svelte';
	import { cadastreLookup, resolveCadastre, resetCadastreLookup } from '$lib/stores/cadastreLookup.svelte';
	import { cadastreCacheKey } from '$lib/utils/cadastre';
	import { cadastreScanHapticKind } from '$lib/utils/cadastreScanFeedback';
	import type { CadastreInfo } from '$lib/types/cadastre';
	import { canUseApi, getApiDisabledError, isApiEnabled } from '$lib/utils/apiPolicy';
	import { onlineState } from '$lib/utils/online.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import {
		acquireLocationWatch,
		requestCurrentPosition,
		userPositionState,
		type UserPosition
	} from '$lib/utils/userPosition.svelte';
	import { resolveMapTabGpsProfileFromProximity, resolveMapParkingProximity } from '$lib/utils/mapTabGpsProfile';
	import { showAppToast, showErrorToast, showOkToast } from '$lib/stores/appToast.svelte';
	import {
		mapDownloadFailedCopy,
		mapRecenterGpsCopy,
		mapTilesCadastreErrorCopy,
		mapTilesErrorCopy,
		mapTilesProtectedErrorCopy
	} from '$lib/utils/errorCopy';
	import { resolveErrorCopy, type ErrorCopy } from '$lib/utils/userFacingError';
	import { hapticLight, hapticSelection, hapticSuccess, hapticWarning } from '$lib/utils/haptics';
	import { nativeTap } from '$lib/utils/native-touch';
	import { MOTION_MS, prefersReducedMotion } from '$lib/utils/motion';
	import { MAP_ONBOARDING_STEPS } from '$lib/utils/mapOnboarding';
	import * as maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import { onMount } from 'svelte';
	import type { GeoJSONSource, Map as MaplibreMap, Marker, Popup, RasterTileSource } from 'maplibre-gl';

	maplibregl.setWorkerUrl(maplibreWorkerUrl);

	type ViewMode = 'topdown' | 'oblique';

	const PITCH_TOPDOWN = 0;
	const PITCH_OBLIQUE = 45;
	const MAP_POSITION_THROTTLE_MS = 750;
	const MAP_RESIZE_DEBOUNCE_MS = 100;
	const MAP_DOWNLOAD_ESTIMATE_DEBOUNCE_MS = 200;
	const MAP_DOWNLOAD_PROGRESS_INTERVAL_MS = 200;
	const MAP_DOWNLOAD_PROGRESS_TILE_STEP = 5;
	const FOCUS_FLY_DURATION_MS = 250;
	const USER_RECENTER_ZOOM = 16;
	const NAVIGATION_ZOOM = 17;
	const NAVIGATION_PADDING_BOTTOM = 140;
	const EMBEDDED_INTRO_ZOOM_IN_DURATION_MS = 1000;

	let {
		focusTreeId,
		focusCenter,
		embedded = false,
		externalGpsWatch = false,
		deviceHeading = null,
		headingLock = false
	}: {
		focusTreeId?: string;
		focusCenter?: { latitude: number; longitude: number };
		embedded?: boolean;
		externalGpsWatch?: boolean;
		deviceHeading?: number | null;
		headingLock?: boolean;
	} = $props();

	let mapContainer: HTMLDivElement | undefined = $state();
	let map: MaplibreMap | undefined = $state();
	let basemap = $state<MapBasemap>('topo');
	let showCadastreLayer = $state(false);
	let showProtectedLayer = $state(false);
	let showMapOnboarding = $state(false);
	let mapOnboardingIndex = $state(0);
	let pulseMenuButton = $state(false);
	let pulseFollowButton = $state(false);
	let pulseControlTimer: ReturnType<typeof setTimeout> | null = null;

	const mapOnboardingStepId = $derived(
		MAP_ONBOARDING_STEPS[mapOnboardingIndex] ?? 'menu'
	);
	type MapCadastreSelection = {
		latitude: number;
		longitude: number;
		stored: CadastreInfo | null;
		species: string;
		treeId?: string;
		source: 'focus' | 'tap' | 'tree';
	};
	let mapCadastreSelection = $state<MapCadastreSelection | null>(null);
	let cadastrePinMarker: Marker | undefined;
	let lastCadastreScanHapticKey = '';
	let viewMode = $state<ViewMode>('topdown');

	const defaultCenter: [number, number] = [2.5, 46.5];
	const defaultZoom = 6;

	const markers = new Map<string, Marker>();
	const popups = new Map<string, Popup>();
	const treeMarkerSyncKeys = new Map<string, string>();
	const accuracyCircleFeatures = new Map<
		string,
		ReturnType<typeof createAccuracyCircleFeature>
	>();
	const accuracyCircleSyncKeys = new Map<string, string>();
	let userMarker: Marker | undefined;
	let parkingMarker: Marker | undefined;
	let focusCenterMarker: Marker | undefined;
	let mapReady = $state(false);
	/** Country of the active map style (follows map center, not only GPS). */
	let lastMapStyleCountry: ReturnType<typeof resolveCountry> | undefined;
	/** Style identity including GB nation overlay (england/scotland/wales). */
	let lastMapStyleKey = '';
	let styleSwitchTimer: ReturnType<typeof setTimeout> | null = null;

	function styleKeyFor(lat: number, lng: number): string {
		const country = resolveCountry(lat, lng);
		if (country !== 'GB') return country ?? 'INTL';
		const provider = getMapProvider('GB', { latitude: lat, longitude: lng });
		const tile = provider.protectedAreasOverlay?.tiles[0] ?? '';
		if (tile.includes('nature.scot')) return 'GB:scotland';
		if (tile.includes('datamap.gov.wales') || tile.includes('NRW_SSSI')) return 'GB:wales';
		if (tile.includes('Natura2000') || tile.includes('NIEA')) return 'GB:ni';
		return 'GB:england';
	}

	function applyMapStyleForCenter(activeMap: MaplibreMap, lat: number, lng: number): void {
		const nextCountry = resolveCountry(lat, lng);
		const nextKey = styleKeyFor(lat, lng);
		if (nextKey === lastMapStyleKey && nextCountry === lastMapStyleCountry) return;

		// setTiles / setLayoutProperty need the initial style sources+layers present.
		// Do not advance lastMapStyleKey on failure — a later moveend/load can retry.
		if (!activeMap.isStyleLoaded() || !activeMap.getSource('ign-plan')) return;

		const location = { latitude: lat, longitude: lng };
		const provider = getMapProvider(nextCountry, location);
		if (!provider.cadastreOverlay && showCadastreLayer) {
			showCadastreLayer = false;
		}
		if (!provider.protectedAreasOverlay && showProtectedLayer) {
			showProtectedLayer = false;
		}
		lastMapStyleCountry = nextCountry;
		lastMapStyleKey = nextKey;
		// In-place tile swap — avoid full setStyle (re-downloads basemap + overlays).
		applyCountryBasemap(activeMap, nextCountry, location);
		setBasemapVisibility(activeMap, basemap);
		if (!embedded) {
			setCadastreLayerVisibility(activeMap, showCadastreLayer);
			setProtectedAreasLayerVisibility(activeMap, showProtectedLayer);
		}
	}

	function scheduleMapStyleForCenter(activeMap: MaplibreMap, lat: number, lng: number): void {
		if (styleSwitchTimer) clearTimeout(styleSwitchTimer);
		styleSwitchTimer = setTimeout(() => {
			styleSwitchTimer = null;
			applyMapStyleForCenter(activeMap, lat, lng);
		}, 350);
	}

	const protectedOverlayAvailable = $derived.by(() => {
		const country =
			lastMapStyleCountry ?? resolveCountry(defaultCenter[1], defaultCenter[0]);
		return Boolean(getMapProvider(country).protectedAreasOverlay);
	});

	const cadastreOverlayAvailable = $derived.by(() => {
		const country =
			lastMapStyleCountry ?? resolveCountry(defaultCenter[1], defaultCenter[0]);
		return Boolean(getMapProvider(country).cadastreOverlay);
	});

	const mapAttribution = $derived.by(() => {
		void showCadastreLayer;
		void showProtectedLayer;
		void lastMapStyleKey;
		const country =
			lastMapStyleCountry ?? resolveCountry(defaultCenter[1], defaultCenter[0]);
		const center = map?.getCenter();
		const provider = getMapProvider(
			country,
			center
				? { latitude: center.lat, longitude: center.lng }
				: { latitude: defaultCenter[1], longitude: defaultCenter[0] }
		);
		const parts: string[] = [provider.plan.attribution];
		if (showCadastreLayer && provider.cadastreOverlay) {
			parts.push(provider.cadastreOverlay.attribution);
		}
		if (showProtectedLayer && provider.protectedAreasOverlay) {
			parts.push(provider.protectedAreasOverlay.attribution);
		}
		return [...new Set(parts)].join(' · ');
	});
	let tileErrorCopy = $state<ErrorCopy | null>(null);

	const RETRYABLE_TILE_SOURCES = [
		'ign-plan',
		'ign-ortho',
		'ign-hillshade',
		'ign-cadastre',
		'ign-protected'
	] as const;

	/** MapLibre keeps errored raster tiles until `setTiles` asks for them again. */
	function retryFailedMapTiles(): void {
		tileErrorCopy = null;
		if (!map) return;

		for (const sourceId of RETRYABLE_TILE_SOURCES) {
			const source = map.getSource(sourceId);
			if (!source || source.type !== 'raster') continue;
			const raster = source as RasterTileSource;
			if (!raster.tiles?.length || typeof raster.setTiles !== 'function') continue;
			try {
				// Drop errored tiles before reload. Promoting them to "expired" can
				// render a tile that never received a texture.
				map.style.tileManagers[sourceId]?.clearTiles();
				raster.setTiles([...raster.tiles]);
			} catch {
				// One overlay must not block the basemap from reloading.
			}
		}
		map.triggerRepaint();
	}
	let cacheCount = $state(0);
	let downloadingZone = $state(false);
	let downloadProgress = $state('');
	let downloadSelectionMode = $state(false);
	let downloadPackEstimate = $state<OfflinePackEstimate>(EMPTY_OFFLINE_PACK_ESTIMATE);
	let packSheetOpen = $state(false);
	let downloadPolygon = $state.raw<LngLat[] | null>(null);
	let lastMapPositionSyncAt = 0;
	let mapPositionThrottleTimer: ReturnType<typeof setTimeout> | null = null;
	let cadastreDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let cadastreDismissedKey = $state('');
	let vetoChecklistOpen = $state(false);
	let previousHeadingLock = false;
	let userManualPan = false;
	let didApplyInitialUserCenter = false;
	let suppressFollowPanDepth = 0;
	let followUser = $state(false);
	let introPlaying = false;
	let introPlayed = false;
	let lastFollowCameraPosition: CompassPosition | null = null;
	let mapInitDone = false;
	let pendingFocusPopupMarker: Marker | undefined;
	let mapResizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let downloadEstimateDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let downloadAbortController: AbortController | null = null;
	let lastObservedMapWidth = 0;
	let lastObservedMapHeight = 0;
	let lastAccuracyCirclesSignature = '';
	let lastApproachLineSignature = '';
	let lastParkingApproachSignature = '';
	let lastSightLineSignature = '';
	let lastFocusCenterLngLat = '';
	let lastParkingLngLat = '';
	let lastUserLngLat = '';
	const markerLngLatSignatures = new Map<string, string>();

	function lngLatSignature(lng: number, lat: number): string {
		return `${lng}|${lat}`;
	}

	function setMarkerLngLat(marker: Marker, markerId: string, lngLat: [number, number]): void {
		const signature = lngLatSignature(lngLat[0], lngLat[1]);
		if (markerLngLatSignatures.get(markerId) === signature) {
			return;
		}
		markerLngLatSignatures.set(markerId, signature);
		marker.setLngLat(lngLat);
	}

	function packLayerLabel(kind: OfflinePackLayerKind): string {
		switch (kind) {
			case 'plan':
				return m.map_layer_plan();
			case 'ortho':
				return m.map_layer_satellite();
			case 'hillshade':
				return m.map_layer_relief();
			case 'cadastre':
				return m.map_layer_cadastre();
			case 'protected':
				return m.map_layer_protected();
		}
	}

	function currentPackEstimate(ring: LngLat[]): OfflinePackEstimate {
		if (!map) {
			return EMPTY_OFFLINE_PACK_ESTIMATE;
		}
		const center = polygonCentroid(ring);
		const country = resolveCountry(center.latitude, center.longitude);
		return resolveOfflinePack({
			ring,
			currentZoom: map.getZoom(),
			basemap,
			country,
			location: { latitude: center.latitude, longitude: center.longitude }
		});
	}

	function scheduleMapContainerResize(instance: maplibregl.Map, container: HTMLElement): void {
		const { width, height } = container.getBoundingClientRect();
		if (width > 0 && height > 0 && width === lastObservedMapWidth && height === lastObservedMapHeight) {
			return;
		}

		if (mapResizeDebounceTimer) {
			clearTimeout(mapResizeDebounceTimer);
		}

		mapResizeDebounceTimer = setTimeout(() => {
			mapResizeDebounceTimer = null;
			const next = container.getBoundingClientRect();
			if (next.width <= 0 || next.height <= 0) {
				return;
			}
			if (next.width === lastObservedMapWidth && next.height === lastObservedMapHeight) {
				return;
			}
			lastObservedMapWidth = next.width;
			lastObservedMapHeight = next.height;
			instance.resize();
		}, MAP_RESIZE_DEBOUNCE_MS);
	}

	function openPendingFocusPopup(): void {
		if (!pendingFocusPopupMarker) {
			return;
		}
		pendingFocusPopupMarker.togglePopup();
		pendingFocusPopupMarker = undefined;
	}

	function withProgrammaticCameraMove(move: () => void): void {
		if (!map) {
			return;
		}
		suppressFollowPanDepth++;
		move();
		map.once('moveend', () => {
			suppressFollowPanDepth = Math.max(0, suppressFollowPanDepth - 1);
		});
	}

	function isNavigationMode(): boolean {
		return embedded && headingLock && deviceHeading !== null;
	}

	function usesHeadingConeMarker(): boolean {
		return embedded && !headingLock;
	}

	function getFocusTree(): Tree | undefined {
		if (!focusTreeId) return undefined;
		return getTreeById(focusTreeId);
	}

	function getEmbeddedTargetCoords(): { lng: number; lat: number } | null {
		if (focusCenter) {
			return { lng: focusCenter.longitude, lat: focusCenter.latitude };
		}

		if (focusTreeId) {
			const tree = getFocusTree();
			if (tree && tree.latitude !== null && tree.longitude !== null) {
				return { lng: tree.longitude, lat: tree.latitude };
			}
		}

		return null;
	}

	function playEmbeddedIntroAnimation(
		userPos: UserPosition,
		targetLng: number,
		targetLat: number
	): void {
		if (!map || introPlayed) {
			return;
		}

		introPlayed = true;
		introPlaying = true;
		userManualPan = true;

		const bounds = new maplibregl.LngLatBounds();
		bounds.extend([userPos.longitude, userPos.latitude]);
		bounds.extend([targetLng, targetLat]);
		withProgrammaticCameraMove(() => {
			map!.fitBounds(bounds, {
				padding: 60,
				maxZoom: 16,
				pitch: getPitch(),
				duration: 0
			});
		});

		const onOverviewEnd = () => {
			map?.off('moveend', onOverviewEnd);
			if (!map) {
				introPlaying = false;
				userManualPan = false;
				return;
			}

			applyRecenterCamera(userPos, EMBEDDED_INTRO_ZOOM_IN_DURATION_MS);

			const onZoomInEnd = () => {
				map?.off('moveend', onZoomInEnd);
				introPlaying = false;
				userManualPan = false;
			};
			map.once('moveend', onZoomInEnd);
		};
		map.once('moveend', onOverviewEnd);
	}

	function tryPlayEmbeddedIntro(): boolean {
		if (!embedded || introPlayed || !map) {
			return false;
		}

		const userPos = userPositionState.position;
		const target = getEmbeddedTargetCoords();
		if (!userPos || !target) {
			return false;
		}

		playEmbeddedIntroAnimation(userPos, target.lng, target.lat);
		return true;
	}

	function syncFollowCamera(): void {
		if (!map || !followUser || userManualPan || introPlaying || downloadSelectionMode) {
			return;
		}

		const userPos = userPositionState.position;
		if (!userPos) {
			return;
		}

		if (embedded) {
			if (isNavigationMode()) {
				syncNavigationCamera();
				lastFollowCameraPosition = {
					latitude: userPos.latitude,
					longitude: userPos.longitude
				};
				return;
			}

			if (!shouldUpdateCompassPosition(lastFollowCameraPosition, userPos)) {
				return;
			}

			if (!headingLock) {
				syncNorthUpCamera();
			} else {
				syncCenterFollowCamera();
			}
		} else {
			if (!shouldUpdateCompassPosition(lastFollowCameraPosition, userPos)) {
				return;
			}

			withProgrammaticCameraMove(() => {
				map!.jumpTo({
					center: [userPos.longitude, userPos.latitude],
					bearing: 0,
					zoom: Math.max(map!.getZoom(), USER_RECENTER_ZOOM),
					pitch: getPitch()
				});
			});
		}

		lastFollowCameraPosition = {
			latitude: userPos.latitude,
			longitude: userPos.longitude
		};
	}

	function syncNavigationCamera(): void {
		if (!map || !isNavigationMode()) {
			return;
		}

		if (userManualPan && !followUser) {
			return;
		}

		const userPos = userPositionState.position;
		if (!userPos || deviceHeading === null) {
			return;
		}

		const bearing = normalizeHeading360(deviceHeading);

		withProgrammaticCameraMove(() => {
			map!.jumpTo({
				center: [userPos.longitude, userPos.latitude],
				bearing,
				zoom: Math.max(map!.getZoom(), NAVIGATION_ZOOM),
				pitch: PITCH_TOPDOWN,
				padding: { top: 0, bottom: NAVIGATION_PADDING_BOTTOM, left: 0, right: 0 }
			});
		});
	}

	function releaseNorthUpCamera(): void {
		if (!map || !embedded) {
			return;
		}
		withProgrammaticCameraMove(() => {
			map!.easeTo({
				bearing: 0,
				padding: { top: 0, bottom: 0, left: 0, right: 0 },
				duration: 400
			});
		});
	}

	function syncCenterFollowCamera(): void {
		if (!map || !embedded || userManualPan) {
			return;
		}

		const userPos = userPositionState.position;
		if (!userPos) {
			return;
		}

		withProgrammaticCameraMove(() => {
			map!.jumpTo({
				center: [userPos.longitude, userPos.latitude],
				bearing: 0,
				zoom: Math.max(map!.getZoom(), NAVIGATION_ZOOM),
				pitch: PITCH_TOPDOWN
			});
		});
	}

	function syncNorthUpCamera(): void {
		if (!map || !embedded || headingLock || userManualPan) {
			return;
		}

		syncCenterFollowCamera();
	}

	function syncSightLine(): void {
		if (!map) return;

		const source = map.getSource('sight-line') as GeoJSONSource | undefined;
		if (!source) return;

		const userPos = userPositionState.position;
		const heading = deviceHeading;
		const signature =
			isNavigationMode() && userPos && heading !== null
				? `${userPos.longitude}|${userPos.latitude}|${normalizeHeading360(heading)}`
				: 'empty';

		if (lastSightLineSignature === signature) {
			return;
		}
		lastSightLineSignature = signature;

		if (isNavigationMode() && userPos && heading !== null) {
			source.setData({
				type: 'FeatureCollection',
				features: [
					createSightLine(
						userPos.longitude,
						userPos.latitude,
						normalizeHeading360(heading)
					)
				]
			});
			return;
		}

		source.setData(emptyFeatureCollection());
	}

	function syncEmbeddedApproachStyle(): void {
		if (!map || !embedded) {
			return;
		}

		const outdoor = appearanceSettingsState.outdoorMode;
		const lineColor = outdoor ? '#000000' : '#1a4d1a';
		map.setPaintProperty('approach-line', 'line-color', lineColor);
		map.setPaintProperty('approach-line', 'line-width', isNavigationMode() ? 5 : 3);
		if (isNavigationMode()) {
			map.setPaintProperty('approach-line', 'line-dasharray', [1, 0]);
		} else {
			map.setPaintProperty('approach-line', 'line-dasharray', [2, 2]);
		}
	}

	function syncUserPositionOnMap(): void {
		syncUserMarker();
		syncApproachLine();
		syncParkingApproachLine();
		syncSightLine();
	}

	function scheduleUserPositionSync(): void {
		const now = Date.now();
		const elapsed = now - lastMapPositionSyncAt;

		if (elapsed >= MAP_POSITION_THROTTLE_MS) {
			lastMapPositionSyncAt = now;
			if (mapPositionThrottleTimer) {
				clearTimeout(mapPositionThrottleTimer);
				mapPositionThrottleTimer = null;
			}
			syncUserPositionOnMap();
			return;
		}

		if (mapPositionThrottleTimer) {
			return;
		}

		mapPositionThrottleTimer = setTimeout(() => {
			mapPositionThrottleTimer = null;
			lastMapPositionSyncAt = Date.now();
			syncUserPositionOnMap();
		}, MAP_POSITION_THROTTLE_MS - elapsed);
	}

	function getPitch(): number {
		return viewMode === 'oblique' ? PITCH_OBLIQUE : PITCH_TOPDOWN;
	}

	function setViewMode(next: ViewMode): void {
		viewMode = next;
		withProgrammaticCameraMove(() => {
			map!.easeTo({ pitch: getPitch(), duration: 400 });
		});
	}

	function buildPopupHtml(tree: Tree): string {
		return buildTreePopupHtml(tree, {
			base,
			outdoor: appearanceSettingsState.outdoorMode,
			viewLabel: m.action_view(),
			formatAccuracy
		});
	}

	function createTreeMarkerElement(): HTMLDivElement {
		const el = document.createElement('div');
		el.style.cssText = treeMarkerCss(appearanceSettingsState.outdoorMode);
		return el;
	}

	function createUserMarkerElement(): HTMLDivElement {
		const outdoor = appearanceSettingsState.outdoorMode;
		if (usesHeadingConeMarker()) {
			return createUserHeadingMarkerElement(outdoor);
		}
		return createSimpleUserMarkerElement(outdoor);
	}

	function userMarkerNeedsRecreate(element: HTMLElement | undefined): boolean {
		if (!element) {
			return true;
		}
		const hasCone = element.querySelector('.yamadori-user-marker__cone') !== null;
		return usesHeadingConeMarker() !== hasCone;
	}

	function createFocusCenterMarkerElement(): HTMLDivElement {
		const el = document.createElement('div');
		el.style.cssText = focusCenterMarkerCss(appearanceSettingsState.outdoorMode);
		return el;
	}

	function createCadastrePinElement(): HTMLDivElement {
		const el = document.createElement('div');
		el.className = cadastrePinClass(appearanceSettingsState.outdoorMode);
		el.innerHTML =
			'<span class="cadastre-pin__dot"></span><span class="cadastre-pin__ring"></span><span class="cadastre-pin__ring cadastre-pin__ring--delay"></span>';
		return el;
	}

	function playCadastrePinPing(el: HTMLElement): void {
		void hapticLight();
		el.classList.remove('cadastre-pin--ping');
		if (prefersReducedMotion()) {
			return;
		}
		void el.offsetWidth;
		el.classList.add('cadastre-pin--ping');
	}

	function maybeFireCadastreScanHaptic(
		selection: MapCadastreSelection,
		info: CadastreInfo | null
	): void {
		if (selection.source !== 'tap') {
			return;
		}
		const key = cadastreCacheKey(selection.latitude, selection.longitude);
		if (lastCadastreScanHapticKey === key) {
			return;
		}
		lastCadastreScanHapticKey = key;
		const kind = cadastreScanHapticKind(info);
		if (kind === 'selection') {
			void hapticSelection();
		} else {
			void hapticWarning();
		}
	}

	function selectMapCadastrePoint(
		latitude: number,
		longitude: number,
		stored: CadastreInfo | null = null,
		species = '',
		treeId?: string,
		source: MapCadastreSelection['source'] = 'tap'
	): void {
		if (embedded) return;
		mapCadastreSelection = { latitude, longitude, stored, species, treeId, source };
		cadastreDismissedKey = '';
		vetoChecklistOpen = false;
		if (source === 'tap') {
			lastCadastreScanHapticKey = '';
		}
	}

	function syncCadastrePinMarker(): void {
		if (!map || embedded) return;

		const selection = mapCadastreSelection;
		if (!selection || selection.treeId) {
			cadastrePinMarker?.remove();
			cadastrePinMarker = undefined;
			return;
		}

		const lngLat: [number, number] = [selection.longitude, selection.latitude];
		const shouldPing = selection.source === 'tap';
		if (!cadastrePinMarker) {
			const element = createCadastrePinElement();
			cadastrePinMarker = new maplibregl.Marker({ element }).setLngLat(lngLat).addTo(map);
			if (shouldPing) {
				playCadastrePinPing(element);
			}
		} else {
			cadastrePinMarker.setLngLat(lngLat);
			if (shouldPing) {
				playCadastrePinPing(cadastrePinMarker.getElement());
			}
		}
	}

	function createParkingMarkerElement(): HTMLDivElement {
		const el = document.createElement('div');
		el.style.cssText = parkingMarkerCss(appearanceSettingsState.outdoorMode);
		return el;
	}

	function refreshMapAppearance(): void {
		const outdoor = appearanceSettingsState.outdoorMode;
		for (const [id, marker] of markers) {
			const tree = getTreeById(id);
			if (!tree) continue;
			marker.getElement().style.cssText = treeMarkerCss(outdoor);
			popups.get(id)?.setHTML(buildPopupHtml(tree));
		}

		if (userMarker) {
			userMarker.remove();
			userMarker = undefined;
			lastUserLngLat = '';
		}

		if (parkingMarker) {
			parkingMarker.getElement().style.cssText = parkingMarkerCss(outdoor);
		}

		if (focusCenterMarker) {
			focusCenterMarker.getElement().style.cssText = focusCenterMarkerCss(outdoor);
		}

		if (cadastrePinMarker) {
			cadastrePinMarker.getElement().classList.toggle('cadastre-pin--outdoor', outdoor);
		}
	}

	function treeMarkerSyncKey(tree: Tree): string {
		return [
			tree.longitude,
			tree.latitude,
			tree.accuracyMeters,
			tree.species,
			tree.locationLabel ?? ''
		].join('|');
	}

	function accuracyCircleSyncKey(tree: Tree): string {
		return `${tree.longitude}|${tree.latitude}|${tree.accuracyMeters}`;
	}

	function getAccuracyCirclesGeoJson(trees: Tree[]) {
		const currentIds = new Set<string>();
		const features = [];

		for (const tree of trees) {
			if (!tree.accuracyMeters || tree.latitude === null || tree.longitude === null) {
				continue;
			}

			currentIds.add(tree.id);
			const syncKey = accuracyCircleSyncKey(tree);
			if (accuracyCircleSyncKeys.get(tree.id) !== syncKey) {
				accuracyCircleSyncKeys.set(tree.id, syncKey);
				const isPoor = tree.accuracyMeters > POOR_ACCURACY_THRESHOLD_M;
				accuracyCircleFeatures.set(
					tree.id,
					createAccuracyCircleFeature(
						tree.longitude,
						tree.latitude,
						tree.accuracyMeters,
						isPoor ? '#d97706' : '#4a7c4a'
					)
				);
			}

			const feature = accuracyCircleFeatures.get(tree.id);
			if (feature) {
				features.push(feature);
			}
		}

		for (const id of accuracyCircleSyncKeys.keys()) {
			if (!currentIds.has(id)) {
				accuracyCircleSyncKeys.delete(id);
				accuracyCircleFeatures.delete(id);
			}
		}

		return { type: 'FeatureCollection' as const, features };
	}

	function syncTreeMarkers(): void {
		if (!map) return;

		const gpsTrees = treesWithGps();
		const currentIds = new Set(gpsTrees.map((tree) => tree.id));

		for (const [id, marker] of markers) {
			if (!currentIds.has(id)) {
				marker.remove();
				markers.delete(id);
				treeMarkerSyncKeys.delete(id);
				markerLngLatSignatures.delete(id);
				popups.get(id)?.remove();
				popups.delete(id);
			}
		}

		for (const tree of gpsTrees) {
			if (tree.latitude === null || tree.longitude === null) continue;

			const lngLat: [number, number] = [tree.longitude, tree.latitude];
			let marker = markers.get(tree.id);

			if (!marker) {
				const popup = new maplibregl.Popup({ offset: 12 }).setHTML(buildPopupHtml(tree));
				popups.set(tree.id, popup);
				const markerElement = createTreeMarkerElement();
				if (!embedded) {
					markerElement.addEventListener('click', () => {
						selectMapCadastrePoint(
							tree.latitude!,
							tree.longitude!,
							tree.cadastreInfo,
							tree.species ?? '',
							tree.id,
							'tree'
						);
					});
				}
				marker = new maplibregl.Marker({ element: markerElement })
					.setLngLat(lngLat)
					.setPopup(popup)
					.addTo(map);
				markers.set(tree.id, marker);
				treeMarkerSyncKeys.set(tree.id, treeMarkerSyncKey(tree));
				markerLngLatSignatures.set(tree.id, lngLatSignature(lngLat[0], lngLat[1]));
			} else {
				const syncKey = treeMarkerSyncKey(tree);
				setMarkerLngLat(marker, tree.id, lngLat);
				if (treeMarkerSyncKeys.get(tree.id) !== syncKey) {
					treeMarkerSyncKeys.set(tree.id, syncKey);
					popups.get(tree.id)?.setHTML(buildPopupHtml(tree));
				}
			}
		}

		const accuracySignature = gpsTrees
			.filter((tree) => tree.latitude !== null && tree.longitude !== null)
			.map((tree) => `${tree.id}:${accuracyCircleSyncKey(tree)}`)
			.sort()
			.join(';');
		if (lastAccuracyCirclesSignature !== accuracySignature) {
			lastAccuracyCirclesSignature = accuracySignature;
			const source = map.getSource('accuracy-circles') as GeoJSONSource | undefined;
			source?.setData(getAccuracyCirclesGeoJson(gpsTrees));
		}
	}

	function syncApproachLine(): void {
		if (!map) return;

		const source = map.getSource('approach') as GeoJSONSource | undefined;
		if (!source) return;

		const focusTree = getFocusTree();
		const userPos = userPositionState.position;

		let targetLng: number | null = null;
		let targetLat: number | null = null;

		if (focusTree && focusTree.latitude !== null && focusTree.longitude !== null) {
			targetLng = focusTree.longitude;
			targetLat = focusTree.latitude;
		} else if (focusCenter) {
			targetLng = focusCenter.longitude;
			targetLat = focusCenter.latitude;
		}

		const signature =
			userPos && targetLng !== null && targetLat !== null
				? `${userPos.longitude}|${userPos.latitude}|${targetLng}|${targetLat}`
				: 'empty';

		if (lastApproachLineSignature === signature) {
			return;
		}
		lastApproachLineSignature = signature;

		if (userPos && targetLng !== null && targetLat !== null) {
			source.setData({
				type: 'FeatureCollection',
				features: [
					createApproachLine(userPos.longitude, userPos.latitude, targetLng, targetLat)
				]
			});
		} else {
			source.setData(emptyFeatureCollection());
		}
	}

	function syncFocusCenterMarker(): void {
		if (!map || focusTreeId) return;

		if (!focusCenter) {
			focusCenterMarker?.remove();
			focusCenterMarker = undefined;
			lastFocusCenterLngLat = '';
			return;
		}

		const lngLat: [number, number] = [focusCenter.longitude, focusCenter.latitude];
		const signature = lngLatSignature(lngLat[0], lngLat[1]);
		if (!focusCenterMarker) {
			focusCenterMarker = new maplibregl.Marker({
				element: createFocusCenterMarkerElement()
			})
				.setLngLat(lngLat)
				.addTo(map);
			lastFocusCenterLngLat = signature;
		} else if (lastFocusCenterLngLat !== signature) {
			lastFocusCenterLngLat = signature;
			focusCenterMarker.setLngLat(lngLat);
		}
	}

	function syncParkingApproachLine(): void {
		if (!map) return;

		const source = map.getSource('parking-approach') as GeoJSONSource | undefined;
		if (!source) return;

		const parking = parkingStore.position;
		const userPos = userPositionState.position;
		const signature =
			parking && userPos
				? `${userPos.longitude}|${userPos.latitude}|${parking.longitude}|${parking.latitude}`
				: 'empty';

		if (lastParkingApproachSignature === signature) {
			return;
		}
		lastParkingApproachSignature = signature;

		if (parking && userPos) {
			source.setData({
				type: 'FeatureCollection',
				features: [
					createApproachLine(
						userPos.longitude,
						userPos.latitude,
						parking.longitude,
						parking.latitude
					)
				]
			});
		} else {
			source.setData(emptyFeatureCollection());
		}
	}

	function syncParkingMarker(): void {
		if (!map) return;

		const parking = parkingStore.position;
		if (!parking) {
			parkingMarker?.remove();
			parkingMarker = undefined;
			lastParkingLngLat = '';
			return;
		}

		const lngLat: [number, number] = [parking.longitude, parking.latitude];
		if (!parkingMarker) {
			parkingMarker = new maplibregl.Marker({ element: createParkingMarkerElement() })
				.setLngLat(lngLat)
				.addTo(map);
			lastParkingLngLat = lngLatSignature(lngLat[0], lngLat[1]);
		} else {
			const signature = lngLatSignature(lngLat[0], lngLat[1]);
			if (lastParkingLngLat !== signature) {
				lastParkingLngLat = signature;
				parkingMarker.setLngLat(lngLat);
			}
		}
	}

	function syncUserMarker(): void {
		if (!map) return;

		const userPos = userPositionState.position;
		if (!userPos) {
			userMarker?.remove();
			userMarker = undefined;
			lastUserLngLat = '';
			return;
		}

		const lngLat: [number, number] = [userPos.longitude, userPos.latitude];
		if (!userMarker || userMarkerNeedsRecreate(userMarker.getElement())) {
			userMarker?.remove();
			userMarker = new maplibregl.Marker({
				element: createUserMarkerElement(),
				anchor: usesHeadingConeMarker() ? 'center' : 'center'
			})
				.setLngLat(lngLat)
				.addTo(map);
			lastUserLngLat = lngLatSignature(lngLat[0], lngLat[1]);
		} else {
			const signature = lngLatSignature(lngLat[0], lngLat[1]);
			if (lastUserLngLat !== signature) {
				lastUserLngLat = signature;
				userMarker.setLngLat(lngLat);
			}
		}

		if (usesHeadingConeMarker()) {
			updateUserHeadingMarker(userMarker.getElement(), deviceHeading, true);
		}
	}

	function maybeApplyInitialUserCenter(position: UserPosition): void {
		if (didApplyInitialUserCenter || !map || embedded || focusTreeId) return;
		didApplyInitialUserCenter = true;
		if (userManualPan || downloadSelectionMode || introPlaying) return;
		applyRecenterCamera(position);
	}

	function fitMapToTrees(): void {
		if (!map) return;

		const userPos = userPositionState.position;
		if (tryPlayEmbeddedIntro()) {
			return;
		}

		if (isNavigationMode() && userPos) {
			syncNavigationCamera();
			return;
		}

		const gpsTrees = treesWithGps();
		const focusTree = getFocusTree();
		const focusMarker = focusTreeId ? markers.get(focusTreeId) : undefined;

		if (
			focusTree &&
			focusMarker &&
			focusTree.latitude !== null &&
			focusTree.longitude !== null
		) {
			const focusLatitude = focusTree.latitude;
			const focusLongitude = focusTree.longitude;
			if (!embedded) {
				pendingFocusPopupMarker = undefined;
				withProgrammaticCameraMove(() => {
					map!.flyTo({
						center: [focusLongitude, focusLatitude],
						zoom: 16,
						pitch: getPitch(),
						duration: FOCUS_FLY_DURATION_MS
					});
				});
				pendingFocusPopupMarker = focusMarker;
			}
		} else if (!embedded && !focusTreeId) {
			if (userPos) {
				maybeApplyInitialUserCenter(userPos);
			} else {
				withProgrammaticCameraMove(() => {
					map!.flyTo({
						center: defaultCenter,
						zoom: defaultZoom,
						pitch: getPitch(),
						duration: 800
					});
				});
			}
		} else if (gpsTrees.length > 1) {
			const bounds = new maplibregl.LngLatBounds();
			for (const tree of gpsTrees) {
				if (tree.latitude !== null && tree.longitude !== null) {
					bounds.extend([tree.longitude, tree.latitude]);
				}
			}
			withProgrammaticCameraMove(() => {
				map!.fitBounds(bounds, { padding: 40, maxZoom: 14 });
			});
		} else if (gpsTrees.length === 1) {
			const tree = gpsTrees[0];
			withProgrammaticCameraMove(() => {
				map!.flyTo({
					center: [tree.longitude!, tree.latitude!],
					zoom: 14,
					pitch: getPitch(),
					duration: 800
				});
			});
		} else {
			withProgrammaticCameraMove(() => {
				map!.flyTo({ center: defaultCenter, zoom: defaultZoom, pitch: getPitch(), duration: 800 });
			});
		}
	}

	function setBasemap(next: MapBasemap): void {
		basemap = next;
		if (!map) return;
		setBasemapVisibility(map, next);
	}

	function setCadastreLayer(next: boolean): void {
		showCadastreLayer = next;
		if (!map) return;
		setCadastreLayerVisibility(map, next);
	}

	function setProtectedLayer(next: boolean): void {
		showProtectedLayer = next;
		if (!map) return;
		setProtectedAreasLayerVisibility(map, next);
	}

	const MAP_ONBOARDING_KEY = 'yamadori-map-onboarding-seen';
	const MAP_LAYERS_COACH_KEY = 'yamadori-map-layers-coach-seen';

	function markMapOnboardingSeen(): void {
		try {
			localStorage.setItem(MAP_ONBOARDING_KEY, '1');
		} catch {
			/* ignore quota / private mode */
		}
	}

	function dismissMapOnboarding(): void {
		showMapOnboarding = false;
		mapOnboardingIndex = 0;
		pulseMenuButton = false;
		pulseFollowButton = false;
		markMapOnboardingSeen();
	}

	function pulseOnboardingControl(): void {
		if (prefersReducedMotion()) return;
		const followStep = MAP_ONBOARDING_STEPS[mapOnboardingIndex] === 'follow';
		pulseMenuButton = !followStep;
		pulseFollowButton = followStep;
		if (pulseControlTimer) clearTimeout(pulseControlTimer);
		pulseControlTimer = setTimeout(() => {
			pulseMenuButton = false;
			pulseFollowButton = false;
			pulseControlTimer = null;
		}, MOTION_MS.pulse);
	}

	function advanceMapOnboarding(): void {
		if (mapOnboardingIndex >= MAP_ONBOARDING_STEPS.length - 1) {
			dismissMapOnboarding();
			return;
		}
		mapOnboardingIndex += 1;
		pulseOnboardingControl();
	}

	function hasSeenMapOnboarding(): boolean {
		try {
			if (localStorage.getItem(MAP_ONBOARDING_KEY) === '1') return true;
			if (localStorage.getItem(MAP_LAYERS_COACH_KEY) === '1') {
				markMapOnboardingSeen();
				return true;
			}
		} catch {
			return true;
		}
		return false;
	}

	function startMapOnboarding(): void {
		mapOnboardingIndex = 0;
		showMapOnboarding = true;
		pulseOnboardingControl();
	}

	$effect(() => {
		if (embedded || !mapReady) return;
		if (showMapOnboarding) return;
		if (hasSeenMapOnboarding()) return;
		startMapOnboarding();
	});

	function applyRecenterCamera(position: UserPosition, duration = 600): void {
		if (!map) return;

		const bearing =
			isNavigationMode() && deviceHeading !== null
				? normalizeHeading360(deviceHeading)
				: 0;

		withProgrammaticCameraMove(() => {
			map!.easeTo({
				center: [position.longitude, position.latitude],
				zoom: Math.max(map!.getZoom(), isNavigationMode() ? NAVIGATION_ZOOM : USER_RECENTER_ZOOM),
				bearing,
				pitch: getPitch(),
				padding: isNavigationMode()
					? { top: 0, bottom: NAVIGATION_PADDING_BOTTOM, left: 0, right: 0 }
					: { top: 0, bottom: 0, left: 0, right: 0 },
				duration,
				essential: true
			});
		});
	}

	async function handleRecenterButton(): Promise<void> {
		if (!map) return;

		if (followUser) {
			followUser = false;
			lastFollowCameraPosition = null;
			return;
		}

		followUser = true;
		userManualPan = false;
		lastFollowCameraPosition = null;

		const cached = userPositionState.position;
		if (cached) {
			void hapticSuccess();
			applyRecenterCamera(cached);
			return;
		}

		const fresh = await requestCurrentPosition();
		if (fresh) {
			void hapticSuccess();
			applyRecenterCamera(fresh);
		} else {
			followUser = false;
			showErrorToast(mapRecenterGpsCopy());
		}
	}

	function setMapGesturesEnabled(instance: maplibregl.Map, enabled: boolean): void {
		const handlers = [
			instance.dragPan,
			instance.scrollZoom,
			instance.boxZoom,
			instance.dragRotate,
			instance.keyboard,
			instance.doubleClickZoom,
			instance.touchZoomRotate,
			instance.touchPitch
		];
		for (const handler of handlers) {
			if (enabled) {
				handler.enable();
			} else {
				handler.disable();
			}
		}
	}

	function refreshDownloadEstimate(): void {
		if (!map || !downloadSelectionMode || !downloadPolygon) {
			downloadPackEstimate = EMPTY_OFFLINE_PACK_ESTIMATE;
			return;
		}
		downloadPackEstimate = currentPackEstimate(downloadPolygon);
	}

	function handleDownloadRegionChange(ring: LngLat[] | null): void {
		downloadPolygon = ring;
		if (!ring) {
			packSheetOpen = false;
		}
		refreshDownloadEstimate();
	}

	function openPackSheet(): void {
		if (!map || !downloadPolygon || downloadingZone) {
			return;
		}
		refreshDownloadEstimate();
		packSheetOpen = true;
	}

	function scheduleDownloadEstimateRefresh(): void {
		if (downloadEstimateDebounceTimer) {
			clearTimeout(downloadEstimateDebounceTimer);
		}
		downloadEstimateDebounceTimer = setTimeout(() => {
			downloadEstimateDebounceTimer = null;
			refreshDownloadEstimate();
		}, MAP_DOWNLOAD_ESTIMATE_DEBOUNCE_MS);
	}

	function startDownloadSelection(): void {
		if (!map || !canUseApi('ignMap') || downloadingZone) {
			return;
		}
		followUser = false;
		lastFollowCameraPosition = null;
		downloadPolygon = null;
		downloadPackEstimate = EMPTY_OFFLINE_PACK_ESTIMATE;
		packSheetOpen = false;
		downloadSelectionMode = true;
	}

	function cancelDownloadSelection(): void {
		downloadSelectionMode = false;
		downloadPolygon = null;
		downloadPackEstimate = EMPTY_OFFLINE_PACK_ESTIMATE;
		packSheetOpen = false;
		downloadProgress = '';
		downloadAbortController?.abort();
		downloadAbortController = null;
	}

	async function refreshCacheStats(): Promise<void> {
		const stats = await getTileCacheStats();
		cacheCount = stats.count;
	}

	function scheduleDeferredCacheStats(): void {
		const run = () => {
			void refreshCacheStats();
		};
		if (typeof requestIdleCallback !== 'undefined') {
			requestIdleCallback(run, { timeout: 10_000 });
			return;
		}
		setTimeout(run, 0);
	}

	async function handleDownloadZone(selection: OfflinePackSelection): Promise<void> {
		if (!map || downloadingZone || !downloadPolygon) {
			return;
		}
		const wantsTiles = selection.maps || selection.cadastre || selection.protectedAreas;
		if (wantsTiles && !canUseApi('ignMap')) {
			return;
		}
		if (!wantsTiles && !selection.weather) {
			return;
		}

		const ring = downloadPolygon;
		packSheetOpen = false;
		downloadingZone = true;
		downloadProgress = m.map_preparing();
		tileErrorCopy = null;
		downloadAbortController?.abort();
		const abortController = new AbortController();
		downloadAbortController = abortController;
		let lastProgressUpdateAt = 0;
		let lastProgressDone = 0;

		try {
			const bounds = polygonBounds(ring);
			const includeTile = createIncludeTileForPolygon(ring);
			const estimate = currentPackEstimate(ring);
			const downloadLayers = layersForSelection(estimate, selection);
			let fetched = 0;
			let tileFailed = 0;
			let weatherSaved = 0;
			let weatherFailed = 0;
			let parcelsAttempted = false;
			let parcelsSaved = 0;
			let parcelsCapped = false;
			let parcelsIncomplete = false;
			let protectedAttempted = false;
			let protectedSaved = 0;
			let protectedCapped = false;
			let protectedIncomplete = false;

			for (const layer of downloadLayers) {
				if (abortController.signal.aborted) {
					break;
				}

				const label = packLayerLabel(layer.kind);
				const result = await prefetchTilesForBounds(
					bounds,
					layer.zoomLevels,
					(z, x, y) => expandTileUrlTemplate(layer.tileTemplate, z, x, y),
					{
						signal: abortController.signal,
						includeTile,
						onProgress: (done, total) => {
							const now = Date.now();
							if (
								done < total &&
								done - lastProgressDone < MAP_DOWNLOAD_PROGRESS_TILE_STEP &&
								now - lastProgressUpdateAt < MAP_DOWNLOAD_PROGRESS_INTERVAL_MS
							) {
								return;
							}
							lastProgressUpdateAt = now;
							lastProgressDone = done;
							downloadProgress = m.map_tile_progress({ layer: label, done, total });
						}
					}
				);

				fetched += result.fetched;
				tileFailed += result.failed;
			}

			if (
				selection.cadastre &&
				!abortController.signal.aborted &&
				isApiEnabled('ignCadastre')
			) {
				const centroid = polygonCentroid(ring);
				if (resolveCountry(centroid.latitude, centroid.longitude) === 'FR') {
					parcelsAttempted = true;
					downloadProgress = m.map_offline_parcels_progress({ count: 0 });
					try {
						const parcelResult = await prefetchOfflineParcels(ring, {
							signal: abortController.signal,
							onProgress: (count) => {
								downloadProgress = m.map_offline_parcels_progress({ count });
							}
						});
						parcelsSaved = parcelResult.saved;
						parcelsCapped = parcelResult.capped;
						parcelsIncomplete = parcelResult.incomplete;
					} catch (error) {
						if (error instanceof DOMException && error.name === 'AbortError') throw error;
						parcelsIncomplete = true;
					}
				}
			}

			if (
				selection.protectedAreas &&
				!abortController.signal.aborted &&
				isApiEnabled('ignProtectedAreas')
			) {
				const centroid = polygonCentroid(ring);
				if (resolveCountry(centroid.latitude, centroid.longitude) === 'FR') {
					protectedAttempted = true;
					downloadProgress = m.map_offline_protected_progress({ count: 0 });
					try {
						const protectedResult = await prefetchOfflineProtectedAreas(ring, {
							signal: abortController.signal,
							onProgress: (count) => {
								downloadProgress = m.map_offline_protected_progress({ count });
							}
						});
						protectedSaved = protectedResult.saved;
						protectedCapped = protectedResult.capped;
						protectedIncomplete = protectedResult.incomplete;
					} catch (error) {
						if (error instanceof DOMException && error.name === 'AbortError') throw error;
						protectedIncomplete = true;
					}
				}
			}

			if (selection.weather && !abortController.signal.aborted && canUseApi('openMeteoForecast')) {
				const points = forecastPointsForRing(ring);
				for (let index = 0; index < points.length; index += 1) {
					if (abortController.signal.aborted) {
						break;
					}
					const point = points[index];
					downloadProgress = m.map_offline_weather_progress({
						done: index + 1,
						total: points.length
					});
					try {
						const forecast = await new Promise<Awaited<ReturnType<typeof fetchAgriDataBase>>>(
							(resolve, reject) => {
								const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
								if (abortController.signal.aborted) {
									onAbort();
									return;
								}
								abortController.signal.addEventListener('abort', onAbort, { once: true });
								void fetchAgriDataBase(point.latitude, point.longitude).then(
									(value) => {
										abortController.signal.removeEventListener('abort', onAbort);
										resolve(value);
									},
									(error: unknown) => {
										abortController.signal.removeEventListener('abort', onAbort);
										reject(error);
									}
								);
							}
						);
						await saveCachedForecast(
							point.latitude,
							point.longitude,
							forecast.baseData,
							forecast.forecastBody
						);
						weatherSaved += 1;
					} catch {
						if (abortController.signal.aborted) {
							break;
						}
						weatherFailed += 1;
					}
				}
			}

			if (abortController.signal.aborted) {
				downloadProgress = '';
				downloadSelectionMode = false;
				downloadPolygon = null;
				return;
			}

			const parts: string[] = [];
			if (downloadLayers.length > 0) {
				parts.push(
					tileFailed > 0
						? m.map_tiles_with_failures({ count: fetched, failed: tileFailed })
						: m.map_tiles_downloaded({ count: fetched })
				);
			} else if (weatherSaved === 0) {
				showErrorToast(mapDownloadFailedCopy());
				downloadSelectionMode = false;
				downloadPolygon = null;
				return;
			}
			if (weatherSaved > 0) {
				parts.push(m.map_offline_pack_weather_saved({ count: weatherSaved }));
			}
			if (parcelsAttempted) {
				parts.push(m.map_offline_parcels_saved({ count: parcelsSaved }));
				if (parcelsCapped) {
					parts.push(m.map_offline_parcels_capped({ count: OFFLINE_PARCEL_LIMIT }));
				}
				if (parcelsIncomplete) {
					parts.push(m.map_offline_parcels_failed());
				}
			}
			if (protectedAttempted) {
				parts.push(m.map_offline_protected_saved({ count: protectedSaved }));
				if (protectedCapped) {
					parts.push(m.map_offline_protected_capped({ count: OFFLINE_PROTECTED_LIMIT }));
				}
				if (protectedIncomplete) {
					parts.push(m.map_offline_protected_failed());
				}
			}
			const summary = parts.join(' · ');
			await refreshCacheStats();
			if (selection.cadastre) {
				showCadastreLayer = true;
			}
			if (selection.protectedAreas) {
				showProtectedLayer = true;
			}
			downloadSelectionMode = false;
			downloadPolygon = null;
			if (summary && (tileFailed > 0 || weatherFailed > 0 || parcelsIncomplete || protectedIncomplete)) {
				showAppToast('info', summary, { durationMs: 4000 });
			} else if (summary) {
				showOkToast(summary);
			}
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				downloadProgress = '';
				downloadSelectionMode = false;
				downloadPolygon = null;
				return;
			}
			showErrorToast(resolveErrorCopy(error, mapDownloadFailedCopy()));
		} finally {
			downloadingZone = false;
			if (downloadAbortController === abortController) {
				downloadAbortController = null;
			}
		}
	}

	const mapParkingProximity = $derived.by(() =>
		resolveMapParkingProximity(
			parkingStore.position,
			userPositionState.position?.latitude ?? null,
			userPositionState.position?.longitude ?? null
		)
	);

	const mapTabGpsProfile = $derived.by(() =>
		resolveMapTabGpsProfileFromProximity({
			embedded,
			headingLock,
			parking: parkingStore.position,
			proximity: mapParkingProximity
		})
	);

	$effect(() => {
		if (externalGpsWatch) {
			return;
		}

		const profile = mapTabGpsProfile;

		void requestCurrentPosition(profile);
		const release = acquireLocationWatch('topo-map', profile);
		return () => release();
	});

	onMount(() => {
		if (!mapContainer) return;
		const container = mapContainer;

		const userPos = userPositionState.position;
		const openOnUser = !embedded && !focusTreeId && userPos;
		const styleLat = userPos?.latitude ?? defaultCenter[1];
		const styleLng = userPos?.longitude ?? defaultCenter[0];
		const styleCountry = resolveCountry(styleLat, styleLng);
		lastMapStyleCountry = styleCountry;
		lastMapStyleKey = styleKeyFor(styleLat, styleLng);
		const instance = new maplibregl.Map({
			container,
			style: createMapStyle(styleCountry, { latitude: styleLat, longitude: styleLng }),
			center: openOnUser ? [userPos.longitude, userPos.latitude] : defaultCenter,
			zoom: openOnUser ? USER_RECENTER_ZOOM : defaultZoom,
			pitch: PITCH_TOPDOWN,
			attributionControl: false,
			maxPitch: 60
		});

		instance.addControl(
			new maplibregl.NavigationControl({ showCompass: !embedded }),
			'top-right'
		);
		instance.on('error', (event) => {
			const sourceId = (event as { sourceId?: string }).sourceId ?? '';
			const message = event.error?.message ?? '';
			const isTileish =
				sourceId.startsWith('ign-') || message.toLowerCase().includes('tile');
			if (!isTileish) return;

			if (sourceId === 'ign-protected') {
				tileErrorCopy = mapTilesProtectedErrorCopy();
				return;
			}
			if (sourceId === 'ign-cadastre') {
				tileErrorCopy = mapTilesCadastreErrorCopy();
				return;
			}
			// Basemap / hillshade failures — keep a generic map-tiles message (not "IGN").
			if (
				sourceId === 'ign-plan' ||
				sourceId === 'ign-ortho' ||
				sourceId === 'ign-hillshade' ||
				sourceId.startsWith('ign-')
			) {
				tileErrorCopy = mapTilesErrorCopy();
			}
		});
		instance.on('data', (event) => {
			const dataEvent = event as { sourceId?: string; isSourceLoaded?: boolean };
			if (
				dataEvent.isSourceLoaded &&
				(dataEvent.sourceId === 'ign-plan' ||
					dataEvent.sourceId === 'ign-ortho' ||
					dataEvent.sourceId === 'ign-protected' ||
					dataEvent.sourceId === 'ign-cadastre')
			) {
				// Clear banner only when the failing source recovers; overlays shouldn't
				// wipe a basemap error and vice versa — clear whenever any ign source loads.
				tileErrorCopy = null;
			}
		});
		instance.on('load', () => {
			map = instance;
			instance.resize();
			const { width, height } = container.getBoundingClientRect();
			lastObservedMapWidth = width;
			lastObservedMapHeight = height;
			// Align basemap tiles to camera center once sources exist (setTiles-safe).
			const center = instance.getCenter();
			applyMapStyleForCenter(instance, center.lat, center.lng);
			requestAnimationFrame(() => {
				mapReady = true;
			});
		});
		instance.on('moveend', () => {
			scheduleDownloadEstimateRefresh();
			if (!embedded && pendingFocusPopupMarker) {
				openPendingFocusPopup();
			}
			const center = instance.getCenter();
			scheduleMapStyleForCenter(instance, center.lat, center.lng);
		});
		instance.on('zoomend', () => scheduleDownloadEstimateRefresh());

		const handleUserPan = (
			event: maplibregl.MapLibreEvent<MouseEvent | TouchEvent | WheelEvent | undefined>
		) => {
			if (introPlaying || suppressFollowPanDepth > 0) {
				return;
			}
			if (!event.originalEvent) {
				return;
			}
			userManualPan = true;
			followUser = false;
			lastFollowCameraPosition = null;
		};
		instance.on('dragstart', handleUserPan);
		instance.on('zoomstart', handleUserPan);
		instance.on('rotatestart', handleUserPan);
		instance.on('pitchstart', handleUserPan);

		const handleMapClick = (event: maplibregl.MapMouseEvent) => {
			if (embedded || downloadSelectionMode) return;
			selectMapCadastrePoint(event.lngLat.lat, event.lngLat.lng);
		};
		if (!embedded) {
			instance.on('click', handleMapClick);
		}

		const resizeObserver = new ResizeObserver(() => {
			scheduleMapContainerResize(instance, container);
		});
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
			if (mapResizeDebounceTimer) {
				clearTimeout(mapResizeDebounceTimer);
				mapResizeDebounceTimer = null;
			}
			if (mapPositionThrottleTimer) {
				clearTimeout(mapPositionThrottleTimer);
				mapPositionThrottleTimer = null;
			}
			if (cadastreDebounceTimer) {
				clearTimeout(cadastreDebounceTimer);
				cadastreDebounceTimer = null;
			}
			if (styleSwitchTimer) {
				clearTimeout(styleSwitchTimer);
				styleSwitchTimer = null;
			}
			if (pulseControlTimer) {
				clearTimeout(pulseControlTimer);
				pulseControlTimer = null;
			}
			pendingFocusPopupMarker = undefined;
			mapReady = false;
			mapInitDone = false;
			for (const marker of markers.values()) marker.remove();
			markers.clear();
			popups.clear();
			treeMarkerSyncKeys.clear();
			accuracyCircleSyncKeys.clear();
			accuracyCircleFeatures.clear();
			userMarker?.remove();
			userMarker = undefined;
			parkingMarker?.remove();
			parkingMarker = undefined;
			focusCenterMarker?.remove();
			focusCenterMarker = undefined;
			cadastrePinMarker?.remove();
			cadastrePinMarker = undefined;
			if (!embedded) {
				instance.off('click', handleMapClick);
			}
			instance.off('dragstart', handleUserPan);
			instance.off('zoomstart', handleUserPan);
			instance.off('rotatestart', handleUserPan);
			instance.off('pitchstart', handleUserPan);
			map = undefined;
			instance.remove();
		};
	});

	$effect(() => {
		if (!mapReady || !map) return;
		void treeStore.trees;
		syncTreeMarkers();
	});

	$effect(() => {
		if (!mapReady || !map || mapInitDone) return;
		mapInitDone = true;
		syncUserMarker();
		syncParkingMarker();
		syncFocusCenterMarker();
		syncApproachLine();
		syncParkingApproachLine();
		syncSightLine();
		fitMapToTrees();
		syncEmbeddedApproachStyle();
		if (!embedded && map) {
			setCadastreLayerVisibility(map, showCadastreLayer);
			setProtectedAreasLayerVisibility(map, showProtectedLayer);
		}
		scheduleDeferredCacheStats();
	});

	$effect(() => {
		if (!mapReady || !map || !embedded || headingLock) return;
		void deviceHeading;
		if (!userMarker) {
			syncUserMarker();
			return;
		}
		updateUserHeadingMarker(userMarker.getElement(), deviceHeading, true);
	});

	$effect(() => {
		if (!mapReady || !map) return;
		void headingLock;
		const position = userPositionState.position;
		void focusTreeId;
		void focusCenter;
		scheduleUserPositionSync();
		if (followUser) {
			syncFollowCamera();
		}
		if (position) {
			maybeApplyInitialUserCenter(position);
		}
	});

	$effect(() => {
		if (!mapReady || !map || !downloadSelectionMode) {
			return;
		}
		const instance = map;
		setMapGesturesEnabled(instance, false);
		return () => {
			try {
				setMapGesturesEnabled(instance, true);
			} catch {
				// Map already removed
			}
		};
	});

	$effect(() => {
		if (!mapReady || !map || !embedded || introPlayed || introPlaying) return;
		void userPositionState.position;
		void focusTreeId;
		void focusCenter;
		tryPlayEmbeddedIntro();
	});

	$effect(() => {
		if (!mapReady || !map || !embedded) return;
		const locked = headingLock;
		void deviceHeading;
		void appearanceSettingsState.outdoorMode;
		syncEmbeddedApproachStyle();
		syncSightLine();
		const wasLocked = previousHeadingLock;
		if (!wasLocked && locked && deviceHeading !== null) {
			userManualPan = false;
			syncNavigationCamera();
		} else if (wasLocked && !locked) {
			userManualPan = false;
			releaseNorthUpCamera();
			syncNorthUpCamera();
		}
		previousHeadingLock = locked;
		syncUserMarker();
	});

	$effect(() => {
		if (!mapReady || !map) return;
		void focusCenter;
		syncFocusCenterMarker();
		syncApproachLine();
	});

	$effect(() => {
		if (!mapReady || !map) return;
		void parkingStore.position;
		syncParkingMarker();
		syncParkingApproachLine();
	});

	$effect(() => {
		if (!mapReady || !map) return;
		void basemap;
		scheduleDownloadEstimateRefresh();
	});

	$effect(() => {
		if (!mapReady || !map) return;
		void appearanceSettingsState.outdoorMode;
		void appearanceSettingsState.locale;
		refreshMapAppearance();
		syncUserMarker();
	});

	let canRecenter = $derived(mapReady);

	const cadastreTarget = $derived.by(() => {
		if (embedded) {
			if (!focusTreeId) {
				return null;
			}

			const tree = getFocusTree();
			if (
				tree?.latitude == null ||
				tree.longitude == null ||
				!tree.cadastreInfo
			) {
				return null;
			}

			return {
				latitude: tree.latitude,
				longitude: tree.longitude,
				stored: tree.cadastreInfo
			};
		}

		if (!mapCadastreSelection) {
			return null;
		}

		return {
			latitude: mapCadastreSelection.latitude,
			longitude: mapCadastreSelection.longitude,
			stored: mapCadastreSelection.stored
		};
	});

	const cadastreDisplay = $derived(cadastreLookup.data ?? cadastreTarget?.stored ?? null);

	const cadastreTargetKey = $derived(
		cadastreTarget ? cadastreCacheKey(cadastreTarget.latitude, cadastreTarget.longitude) : ''
	);

	const cadastreBannerLoading = $derived(
		cadastreLookup.loading && cadastreDisplay === null
	);

	const cadastreSpecies = $derived.by(() => {
		if (mapCadastreSelection?.species) {
			return mapCadastreSelection.species;
		}
		if (focusTreeId) {
			return getFocusTree()?.species ?? '';
		}
		return '';
	});

	const cadastreLookupFailed = $derived(cadastreLookup.error === 'lookup_failed');
	const cadastreLookupEmpty = $derived(
		!embedded &&
			mapCadastreSelection !== null &&
			!cadastreBannerLoading &&
			cadastreDisplay === null &&
			cadastreLookup.error !== 'lookup_failed' &&
			cadastreLookup.latitude === mapCadastreSelection.latitude &&
			cadastreLookup.longitude === mapCadastreSelection.longitude
	);

	const showCadastreBanner = $derived(
		!showMapOnboarding &&
			(embedded
				? cadastreDisplay !== null
				: mapCadastreSelection !== null &&
					(cadastreBannerLoading ||
						cadastreDisplay !== null ||
						cadastreLookupFailed ||
						cadastreLookupEmpty)) &&
			cadastreTargetKey !== '' &&
			cadastreTargetKey !== cadastreDismissedKey
	);

	function dismissCadastreBanner(): void {
		cadastreDismissedKey = cadastreTargetKey;
	}

	function retryCadastreLookup(): void {
		const selection = mapCadastreSelection;
		if (!selection) return;
		void resolveCadastre(
			selection.latitude,
			selection.longitude,
			canUseApi('ignCadastre'),
			null
		);
	}

	$effect(() => {
		if (!mapReady || !map || embedded || !focusTreeId) return;

		const tree = getFocusTree();
		if (tree?.latitude == null || tree.longitude == null) return;

		void tree.latitude;
		void tree.longitude;
		void tree.cadastreInfo;
		void tree.species;

		const stored = tree.cadastreInfo;
		if (
			mapCadastreSelection?.treeId === focusTreeId &&
			mapCadastreSelection.source === 'focus' &&
			mapCadastreSelection.stored === stored
		) {
			return;
		}

		selectMapCadastrePoint(
			tree.latitude,
			tree.longitude,
			stored,
			tree.species ?? '',
			focusTreeId,
			'focus'
		);
	});

	$effect(() => {
		if (embedded || focusTreeId) return;
		if (mapCadastreSelection?.source === 'focus') {
			mapCadastreSelection = null;
		}
	});

	$effect(() => {
		if (!mapReady || !map) return;

		if (cadastreDebounceTimer) {
			clearTimeout(cadastreDebounceTimer);
			cadastreDebounceTimer = null;
		}

		if (embedded) {
			const target = cadastreTarget;

			if (!target) {
				resetCadastreLookup();
				return;
			}

			cadastreLookup.latitude = target.latitude;
			cadastreLookup.longitude = target.longitude;
			cadastreLookup.data = target.stored;
			cadastreLookup.loading = false;
			cadastreLookup.error = '';
			return;
		}

		const selection = mapCadastreSelection;
		if (!selection) {
			resetCadastreLookup();
			return;
		}

		const online = canUseApi('ignCadastre');
		cadastreLookup.latitude = selection.latitude;
		cadastreLookup.longitude = selection.longitude;
		cadastreLookup.data = selection.stored ?? null;

		if (selection.stored) {
			cadastreLookup.loading = false;
			maybeFireCadastreScanHaptic(selection, selection.stored);
			return;
		}

		if (!online) {
			cadastreLookup.loading = true;
			void resolveCadastre(selection.latitude, selection.longitude, false, null).then((data) => {
				if (
					mapCadastreSelection?.latitude !== selection.latitude ||
					mapCadastreSelection.longitude !== selection.longitude
				) {
					return;
				}
				maybeFireCadastreScanHaptic(selection, data);
			});
			return;
		}

		cadastreLookup.loading = true;
		cadastreDebounceTimer = setTimeout(() => {
			void resolveCadastre(selection.latitude, selection.longitude, online, null).then((data) => {
				if (
					mapCadastreSelection?.latitude !== selection.latitude ||
					mapCadastreSelection.longitude !== selection.longitude
				) {
					return;
				}
				maybeFireCadastreScanHaptic(selection, data);
			});
		}, 500);

		return () => {
			if (cadastreDebounceTimer) {
				clearTimeout(cadastreDebounceTimer);
				cadastreDebounceTimer = null;
			}
		};
	});

	$effect(() => {
		if (!mapReady || !map || embedded) return;
		void mapCadastreSelection;
		syncCadastrePinMarker();
	});

	$effect(() => {
		if (!mapReady || !map || embedded) return;
		void showCadastreLayer;
		setCadastreLayerVisibility(map, showCadastreLayer);
	});

	$effect(() => {
		if (!mapReady || !map || embedded) return;
		void showProtectedLayer;
		setProtectedAreasLayerVisibility(map, showProtectedLayer);
	});
</script>

<div class="relative h-full min-h-0 w-full flex-1">
	<div
		bind:this={mapContainer}
		class="topo-map absolute inset-0 h-full w-full"
		class:topo-map--embedded={embedded}
	></div>

	{#if !embedded && !downloadSelectionMode}
	<div class="map-controls-top absolute left-2 z-30 flex flex-col items-start gap-2 pointer-events-none">
		<MapControlsMenu
			{basemap}
			{showCadastreLayer}
			{showProtectedLayer}
			{viewMode}
			cadastreDisabled={!cadastreOverlayAvailable || (onlineState.online && !isApiEnabled('ignMap'))}
			protectedDisabled={!protectedOverlayAvailable || (onlineState.online && !isApiEnabled('ignMap'))}
			cadastreTitle={!cadastreOverlayAvailable
				? m.map_layer_cadastre_unavailable()
				: onlineState.online && !isApiEnabled('ignMap')
					? getApiDisabledError('ignMap')
					: !onlineState.online
						? m.map_layer_offline_cached()
						: m.map_layer_cadastre_title()}
			protectedTitle={!protectedOverlayAvailable
				? undefined
				: onlineState.online && !isApiEnabled('ignMap')
					? getApiDisabledError('ignMap')
					: !onlineState.online
						? m.map_layer_offline_cached()
						: m.map_layer_protected_title()}
			offlineAvailable={canUseApi('ignMap') && !downloadSelectionMode}
			{cacheCount}
			{downloadingZone}
			{mapReady}
			pulseMenu={pulseMenuButton}
			onbasemap={setBasemap}
			oncadastre={() => setCadastreLayer(!showCadastreLayer)}
			onprotected={() => setProtectedLayer(!showProtectedLayer)}
			onviewmode={setViewMode}
			onoffline={startDownloadSelection}
		/>
		<button
			type="button"
			use:nativeTap={{ onactivate: () => void handleRecenterButton(), label: 'map-recenter' }}
			class="map-follow-toggle pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border shadow-sm backdrop-blur-sm transition active:scale-[0.98] disabled:opacity-50 {followUser
				? 'map-follow-toggle--active'
				: 'border-gray-200 bg-white/95 text-forest-900'} {pulseFollowButton
				? 'map-layer-chip-pulse'
				: ''}"
			disabled={!canRecenter}
			aria-pressed={followUser}
			aria-label={followUser
				? m.map_follow_active()
				: userPositionState.position
					? m.map_follow_position()
					: m.map_follow_locate()}
			title={followUser
				? m.map_unfollow_position()
				: userPositionState.position
					? m.map_follow_position()
					: m.map_follow_locate()}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-4 w-4 shrink-0"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="3" />
				<path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke-linecap="round" />
				<path d="M12 5l-1.5 4.5H12h1.5L12 5z" fill="currentColor" stroke="none" />
			</svg>
		</button>
		{#if showMapOnboarding && !downloadSelectionMode}
			<div class="pointer-events-auto w-[min(100vw-1.5rem,16rem)]">
				<MapOnboardingSheet
					stepId={mapOnboardingStepId}
					stepIndex={mapOnboardingIndex + 1}
					stepTotal={MAP_ONBOARDING_STEPS.length}
					onnext={advanceMapOnboarding}
					ondone={dismissMapOnboarding}
					onskip={dismissMapOnboarding}
				/>
			</div>
		{/if}
	</div>
	{/if}

	{#if !embedded && downloadSelectionMode}
	<MapDownloadOverlay
		active={true}
		downloading={downloadingZone}
		progress={downloadProgress}
		sheetOpen={packSheetOpen}
		unproject={(point) => map!.unproject(point)}
		onCancel={cancelDownloadSelection}
		onPrepare={openPackSheet}
		onRegionChange={handleDownloadRegionChange}
	/>
	{/if}

	{#if !embedded && packSheetOpen}
	<OfflinePackSheet
		estimate={downloadPackEstimate}
		weatherEnabled={canUseApi('openMeteoForecast')}
		oncancel={() => {
			packSheetOpen = false;
		}}
		onconfirm={(selection) => {
			void handleDownloadZone(selection);
		}}
	/>
	{/if}

	{#if !onlineState.online && cacheCount === 0 && !downloadSelectionMode && !embedded}
		<div
			class="pointer-events-none absolute inset-x-4 map-banner-top app-card px-3 py-2 text-center text-sm text-sky-900"
			role="status"
		>
			{m.map_offline_no_tiles()}
		</div>
	{/if}

	{#if tileErrorCopy}
		<div class="pointer-events-auto absolute inset-x-4 map-banner-top">
			<ErrorBanner
				copy={tileErrorCopy}
				tone="warning"
				onretry={retryFailedMapTiles}
			/>
		</div>
	{/if}

	{#snippet cadastreOverlay()}
		<CadastreBanner
			info={cadastreDisplay}
			loading={cadastreBannerLoading}
			floating
			dismissible
			failed={cadastreLookupFailed}
			checklistOpen={vetoChecklistOpen}
			onchecklisttoggle={() => (vetoChecklistOpen = !vetoChecklistOpen)}
			ondismiss={dismissCadastreBanner}
			onretry={retryCadastreLookup}
		/>
		{#if vetoChecklistOpen && cadastreDisplay && cadastreTarget}
			<div class="map-cadastre-checklist mt-2">
				<VetoLegalChecklist
					cadastreInfo={cadastreDisplay}
					species={cadastreSpecies}
					latitude={cadastreTarget.latitude}
					longitude={cadastreTarget.longitude}
					scrollable
					onclose={() => (vetoChecklistOpen = false)}
				/>
			</div>
		{/if}
	{/snippet}

	{#if showCadastreBanner && embedded}
		<div class="map-cadastre-banner map-cadastre-banner--embedded pointer-events-auto">
			{@render cadastreOverlay()}
		</div>
	{/if}

	<div class="pointer-events-none absolute inset-x-4 bottom-4 z-40 flex flex-col gap-2">
		{#if showCadastreBanner && !embedded && !downloadSelectionMode}
			<div class="pointer-events-auto w-full max-w-md self-center">
				{@render cadastreOverlay()}
			</div>
		{/if}
		{#if !embedded && !downloadSelectionMode}
		<p
			class="pointer-events-auto self-end max-w-[min(100%,18rem)] rounded bg-white/90 px-2 py-1 text-right text-[10px] leading-snug text-gray-600 shadow-sm"
		>
			{mapAttribution}
		</p>
		<div class="pointer-events-auto w-full self-end">
			<ParkingPanel />
		</div>
		{/if}
	</div>
</div>

<style>
	.topo-map :global(.maplibregl-ctrl-bottom-right),
	.topo-map :global(.maplibregl-ctrl-bottom-left) {
		display: none;
	}

	/* Clear compass overlay buttons (lock heading + dial toggle) at top-right. */
	.topo-map--embedded :global(.maplibregl-ctrl-top-right) {
		top: 4.75rem;
	}

	.topo-map--embedded :global(.maplibregl-ctrl-group button) {
		width: 2.25rem;
		height: 2.25rem;
	}
</style>
