<script lang="ts">
	import { getTreeDisplayLabel, type Tree } from '$lib/types/tree';
	import { base } from '$app/paths';
	import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';
	import { formatAccuracy } from '$lib/utils/gps';
	import {
		createAccuracyCircleFeature,
		createApproachLine,
		createSightLine,
		emptyFeatureCollection
	} from '$lib/utils/map/geojson';
	import { getIgnLayerConfig, IGN_ATTRIBUTION, CADASTRE_LAYER } from '$lib/utils/map/ign';
	import {
		boundsFromMapCenter,
		buildIgnWmtsUrl,
		countTilesForBounds,
		getDownloadZoomLevels,
		getTileCacheStats,
		prefetchTilesForBounds
	} from '$lib/utils/map/tileCache';
	import type { IgnLayerId } from '$lib/utils/map/ign';
	import {
		createIgnMapStyle,
		setBasemapVisibility,
		setCadastreLayerVisibility,
	type MapBasemap
	} from '$lib/utils/map/styles';
	import { getTreeById, treeStore, treesWithGps } from '$lib/stores/trees.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { parkingStore } from '$lib/stores/parking.svelte';
	import { normalizeHeading360 } from '$lib/utils/haversine';
	import {
		createSimpleUserMarkerElement,
		createUserHeadingMarkerElement,
		updateUserHeadingMarker
	} from '$lib/utils/map/userMarker';
	import ParkingPanel from '$lib/components/ParkingPanel.svelte';
	import MapDownloadOverlay from '$lib/components/MapDownloadOverlay.svelte';
	import CadastreBanner from '$lib/components/CadastreBanner.svelte';
	import VetoLegalChecklist from '$lib/components/VetoLegalChecklist.svelte';
	import { cadastreLookup, resolveCadastre, resetCadastreLookup } from '$lib/stores/cadastreLookup.svelte';
	import { cadastreCacheKey } from '$lib/utils/cadastre';
	import type { CadastreInfo } from '$lib/types/cadastre';
	import { onlineState } from '$lib/utils/online.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import {
		acquireLocationWatch,
		requestCurrentPosition,
		userPositionState,
		type UserPosition
	} from '$lib/utils/userPosition.svelte';
	import { hapticSuccess } from '$lib/utils/haptics';
	import { nativeTap } from '$lib/utils/native-touch';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	import type { GeoJSONSource, Map as MaplibreMap, Marker, Popup } from 'maplibre-gl';

	type ViewMode = 'topdown' | 'oblique';

	const PITCH_TOPDOWN = 0;
	const PITCH_OBLIQUE = 45;
	const MAP_POSITION_THROTTLE_MS = 750;
	const MAP_RESIZE_DEBOUNCE_MS = 100;
	const FOCUS_FLY_DURATION_MS = 250;
	const USER_RECENTER_ZOOM = 16;
	const NAVIGATION_ZOOM = 17;
	const NAVIGATION_PADDING_BOTTOM = 140;

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
	let tileError = $state('');
	let cacheCount = $state(0);
	let downloadingZone = $state(false);
	let downloadProgress = $state('');
	let downloadSelectionMode = $state(false);
	let downloadTileCount = $state(0);
	let downloadZoomLevels = $state<number[]>([]);
	let lastMapPositionSyncAt = 0;
	let mapPositionThrottleTimer: ReturnType<typeof setTimeout> | null = null;
	let cadastreDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let cadastreDismissedKey = $state('');
	let vetoChecklistOpen = $state(false);
	let previousHeadingLock = false;
	let userManualPan = false;
	let mapInitDone = false;
	let pendingFocusPopupMarker: Marker | undefined;
	let mapResizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	let lastObservedMapWidth = 0;
	let lastObservedMapHeight = 0;

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

	function isNavigationMode(): boolean {
		return embedded && headingLock && deviceHeading !== null;
	}

	function usesHeadingConeMarker(): boolean {
		return embedded && !headingLock;
	}

	function syncNavigationCamera(): void {
		if (!map || !isNavigationMode() || userManualPan) {
			return;
		}

		const userPos = userPositionState.position;
		if (!userPos || deviceHeading === null) {
			return;
		}

		const bearing = normalizeHeading360(deviceHeading);

		map.jumpTo({
			center: [userPos.longitude, userPos.latitude],
			bearing,
			zoom: Math.max(map.getZoom(), NAVIGATION_ZOOM),
			pitch: PITCH_TOPDOWN,
			padding: { top: 0, bottom: NAVIGATION_PADDING_BOTTOM, left: 0, right: 0 }
		});
	}

	function releaseNorthUpCamera(): void {
		if (!map || !embedded) {
			return;
		}
		map.easeTo({
			bearing: 0,
			padding: { top: 0, bottom: 0, left: 0, right: 0 },
			duration: 400
		});
	}

	function syncNorthUpCamera(): void {
		if (!map || !embedded || headingLock || userManualPan) {
			return;
		}

		const userPos = userPositionState.position;
		if (!userPos) {
			return;
		}

		map.jumpTo({
			center: [userPos.longitude, userPos.latitude],
			bearing: 0,
			zoom: Math.max(map.getZoom(), NAVIGATION_ZOOM),
			pitch: PITCH_TOPDOWN
		});
	}

	function syncSightLine(): void {
		if (!map) return;

		const source = map.getSource('sight-line') as GeoJSONSource | undefined;
		if (!source) return;

		const userPos = userPositionState.position;
		if (isNavigationMode() && userPos && deviceHeading !== null) {
			source.setData({
				type: 'FeatureCollection',
				features: [
					createSightLine(
						userPos.longitude,
						userPos.latitude,
						normalizeHeading360(deviceHeading)
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
		map?.easeTo({ pitch: getPitch(), duration: 400 });
	}

	function escapeHtml(text: string): string {
		return text
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;');
	}

	function buildPopupHtml(tree: Tree): string {
		const link = `${base}/tree/${tree.id}`;
		const outdoor = appearanceSettingsState.outdoorMode;
		const secondaryColor = outdoor ? '#000000' : '#374151';
		const mutedColor = outdoor ? '#000000' : '#6b7280';
		const linkColor = outdoor ? '#000000' : '#2d4a2d';
		const locationLine = tree.locationLabel
			? `<br><span style="color:${secondaryColor};font-size:13px;font-weight:${outdoor ? 700 : 400};">${escapeHtml(tree.locationLabel)}</span>`
			: '';
		const accuracyLine =
			tree.accuracyMeters !== null
				? `<br><span style="color:${mutedColor};font-size:12px;font-weight:${outdoor ? 700 : 400};">${escapeHtml(formatAccuracy(tree.accuracyMeters))}</span>`
				: '';
		return `<strong style="color:#000000;">${escapeHtml(getTreeDisplayLabel(tree))}</strong>${locationLine}${accuracyLine}<br><a href="${link}" style="color:${linkColor};font-weight:700;">${escapeHtml(m.action_view())}</a>`;
	}

	function createTreeMarkerElement(): HTMLDivElement {
		const el = document.createElement('div');
		const outdoor = appearanceSettingsState.outdoorMode;
		el.style.cssText = outdoor
			? 'background:#000000;width:16px;height:16px;border-radius:50%;border:3px solid #ffffff;box-shadow:none;'
			: 'background:#2d4a2d;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
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
		const outdoor = appearanceSettingsState.outdoorMode;
		el.style.cssText = outdoor
			? 'background:#000000;width:16px;height:16px;border-radius:50%;border:3px solid #ffffff;box-shadow:none;'
			: 'background:#2d4a2d;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
		return el;
	}

	function createCadastrePinElement(): HTMLDivElement {
		const el = document.createElement('div');
		el.style.cssText =
			'width:14px;height:14px;border-radius:50%;border:2px solid #7c3aed;background:#ede9fe;box-shadow:0 1px 4px rgba(0,0,0,0.25);';
		return el;
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
		if (!cadastrePinMarker) {
			cadastrePinMarker = new maplibregl.Marker({ element: createCadastrePinElement() })
				.setLngLat(lngLat)
				.addTo(map);
		} else {
			cadastrePinMarker.setLngLat(lngLat);
		}
	}

	function createParkingMarkerElement(): HTMLDivElement {
		const el = document.createElement('div');
		const outdoor = appearanceSettingsState.outdoorMode;
		el.style.cssText = outdoor
			? 'background:#000000;width:18px;height:18px;border-radius:50%;border:3px solid #ffffff;box-shadow:none;'
			: 'background:#ea580c;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35);';
		return el;
	}

	function refreshMapAppearance(): void {
		for (const [id, marker] of markers) {
			const tree = getTreeById(id);
			if (!tree) continue;
			marker.getElement().style.cssText = createTreeMarkerElement().style.cssText;
			popups.get(id)?.setHTML(buildPopupHtml(tree));
		}

		if (userMarker) {
			userMarker.remove();
			userMarker = undefined;
		}

		if (parkingMarker) {
			parkingMarker.getElement().style.cssText = createParkingMarkerElement().style.cssText;
		}

		if (focusCenterMarker) {
			focusCenterMarker.getElement().style.cssText =
				createFocusCenterMarkerElement().style.cssText;
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
			} else {
				const syncKey = treeMarkerSyncKey(tree);
				marker.setLngLat(lngLat);
				if (treeMarkerSyncKeys.get(tree.id) !== syncKey) {
					treeMarkerSyncKeys.set(tree.id, syncKey);
					popups.get(tree.id)?.setHTML(buildPopupHtml(tree));
				}
			}
		}

		const source = map.getSource('accuracy-circles') as GeoJSONSource | undefined;
		source?.setData(getAccuracyCirclesGeoJson(gpsTrees));
	}

	function syncApproachLine(): void {
		if (!map) return;

		const source = map.getSource('approach') as GeoJSONSource | undefined;
		if (!source) return;

		const focusTree = focusTreeId ? getTreeById(focusTreeId) : undefined;
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
			return;
		}

		const lngLat: [number, number] = [focusCenter.longitude, focusCenter.latitude];
		if (!focusCenterMarker) {
			focusCenterMarker = new maplibregl.Marker({
				element: createFocusCenterMarkerElement()
			})
				.setLngLat(lngLat)
				.addTo(map);
		} else {
			focusCenterMarker.setLngLat(lngLat);
		}
	}

	function syncParkingApproachLine(): void {
		if (!map) return;

		const source = map.getSource('parking-approach') as GeoJSONSource | undefined;
		if (!source) return;

		const parking = parkingStore.position;
		const userPos = userPositionState.position;

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
			return;
		}

		const lngLat: [number, number] = [parking.longitude, parking.latitude];
		if (!parkingMarker) {
			parkingMarker = new maplibregl.Marker({ element: createParkingMarkerElement() })
				.setLngLat(lngLat)
				.addTo(map);
		} else {
			parkingMarker.setLngLat(lngLat);
		}
	}

	function syncUserMarker(): void {
		if (!map) return;

		const userPos = userPositionState.position;
		if (!userPos) {
			userMarker?.remove();
			userMarker = undefined;
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
		} else {
			userMarker.setLngLat(lngLat);
		}

		if (usesHeadingConeMarker()) {
			updateUserHeadingMarker(userMarker.getElement(), deviceHeading, true);
		}
	}

	function fitMapToTrees(): void {
		if (!map) return;

		const userPos = userPositionState.position;
		if (isNavigationMode() && userPos) {
			syncNavigationCamera();
			return;
		}

		const gpsTrees = treesWithGps();
		const focusTree = focusTreeId ? getTreeById(focusTreeId) : undefined;
		const focusMarker = focusTreeId ? markers.get(focusTreeId) : undefined;

		if (embedded && focusCenter && userPos) {
			const bounds = new maplibregl.LngLatBounds();
			bounds.extend([userPos.longitude, userPos.latitude]);
			bounds.extend([focusCenter.longitude, focusCenter.latitude]);
			map.fitBounds(bounds, { padding: 60, maxZoom: 16, pitch: getPitch(), duration: 0 });
			return;
		}

		if (
			focusTree &&
			focusMarker &&
			focusTree.latitude !== null &&
			focusTree.longitude !== null
		) {
			if (embedded && userPos) {
				const bounds = new maplibregl.LngLatBounds();
				bounds.extend([userPos.longitude, userPos.latitude]);
				bounds.extend([focusTree.longitude, focusTree.latitude]);
				map.fitBounds(bounds, { padding: 60, maxZoom: 16, pitch: getPitch(), duration: 800 });
			} else {
				pendingFocusPopupMarker = undefined;
				map.flyTo({
					center: [focusTree.longitude, focusTree.latitude],
					zoom: 16,
					pitch: getPitch(),
					duration: FOCUS_FLY_DURATION_MS
				});
				pendingFocusPopupMarker = focusMarker;
			}
		} else if (gpsTrees.length > 1) {
			const bounds = new maplibregl.LngLatBounds();
			for (const tree of gpsTrees) {
				if (tree.latitude !== null && tree.longitude !== null) {
					bounds.extend([tree.longitude, tree.latitude]);
				}
			}
			map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
		} else if (gpsTrees.length === 1) {
			const tree = gpsTrees[0];
			map.flyTo({
				center: [tree.longitude!, tree.latitude!],
				zoom: 14,
				pitch: getPitch(),
				duration: 800
			});
		} else {
			map.flyTo({ center: defaultCenter, zoom: defaultZoom, pitch: getPitch(), duration: 800 });
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

	function applyRecenterCamera(position: UserPosition): void {
		if (!map) return;

		const bearing =
			isNavigationMode() && deviceHeading !== null
				? normalizeHeading360(deviceHeading)
				: 0;

		map.easeTo({
			center: [position.longitude, position.latitude],
			zoom: Math.max(map.getZoom(), isNavigationMode() ? NAVIGATION_ZOOM : USER_RECENTER_ZOOM),
			bearing,
			pitch: getPitch(),
			padding: isNavigationMode()
				? { top: 0, bottom: NAVIGATION_PADDING_BOTTOM, left: 0, right: 0 }
				: { top: 0, bottom: 0, left: 0, right: 0 },
			duration: 600,
			essential: true
		});
	}

	async function recenterOnUser(): Promise<void> {
		if (!map) return;

		const cached = userPositionState.position;
		if (cached) {
			void hapticSuccess();
			applyRecenterCamera(cached);
		}

		if (externalGpsWatch) {
			if (!cached) {
				const fresh = await requestCurrentPosition();
				if (fresh) {
					void hapticSuccess();
					applyRecenterCamera(fresh);
				}
			}
			return;
		}

		const fresh = await requestCurrentPosition();
		if (
			fresh &&
			(!cached ||
				fresh.latitude !== cached.latitude ||
				fresh.longitude !== cached.longitude)
		) {
			applyRecenterCamera(fresh);
			if (!cached) {
				void hapticSuccess();
			}
		}
	}

	function refreshDownloadEstimate(): void {
		if (!map || !downloadSelectionMode) {
			return;
		}

		const bounds = boundsFromMapCenter(map);
		const zoomSet = new Set<number>();
		let totalTiles = 0;

		for (const layerId of ['plan', 'ortho'] as IgnLayerId[]) {
			const layer = getIgnLayerConfig(layerId);
			const zoomLevels = getDownloadZoomLevels(map.getZoom(), layer.maxZoom);
			for (const zoom of zoomLevels) {
				zoomSet.add(zoom);
			}
			totalTiles += countTilesForBounds(bounds, zoomLevels);
		}

		downloadZoomLevels = [...zoomSet].sort((a, b) => a - b);
		downloadTileCount = totalTiles;
	}

	function startDownloadSelection(): void {
		if (!map || !onlineState.online || downloadingZone) {
			return;
		}
		downloadSelectionMode = true;
		refreshDownloadEstimate();
	}

	function cancelDownloadSelection(): void {
		downloadSelectionMode = false;
		downloadProgress = '';
	}

	async function refreshCacheStats(): Promise<void> {
		const stats = await getTileCacheStats();
		cacheCount = stats.count;
	}

	async function handleDownloadZone(): Promise<void> {
		if (!map || !onlineState.online || downloadingZone) {
			return;
		}

		downloadingZone = true;
		downloadProgress = m.map_preparing();
		tileError = '';

		try {
			const bounds = boundsFromMapCenter(map);
			let fetched = 0;
			let failed = 0;

			for (const layerId of ['plan', 'ortho'] as IgnLayerId[]) {
				const layer = getIgnLayerConfig(layerId);
				const zoomLevels = getDownloadZoomLevels(map.getZoom(), layer.maxZoom);
				const label = layerId === 'plan' ? m.map_layer_plan() : m.map_layer_satellite();

				const result = await prefetchTilesForBounds(
					bounds,
					zoomLevels,
					(z, x, y) => buildIgnWmtsUrl(layer.layer, layer.format, z, x, y),
					(done, total) => {
						downloadProgress = m.map_tile_progress({ layer: label, done, total });
					}
				);

				fetched += result.fetched;
				failed += result.failed;
			}

			downloadProgress =
				failed > 0
					? m.map_tiles_with_failures({ count: fetched, failed })
					: m.map_tiles_downloaded({ count: fetched });
			await refreshCacheStats();
			downloadSelectionMode = false;
		} catch (error) {
			tileError =
				error instanceof Error ? error.message : m.map_download_failed();
		} finally {
			downloadingZone = false;
		}
	}

	$effect(() => {
		if (externalGpsWatch) {
			return;
		}

		const profile = embedded && headingLock ? 'navigation' : 'watch';
		void requestCurrentPosition(profile);
		const release = acquireLocationWatch('topo-map', profile);
		return () => release();
	});

	onMount(() => {
		if (!mapContainer) return;

		const instance = new maplibregl.Map({
			container: mapContainer,
			style: createIgnMapStyle(),
			center: defaultCenter,
			zoom: defaultZoom,
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
			const isIgnSource = sourceId.startsWith('ign-');
			const message = event.error?.message ?? '';
			if (!isIgnSource && !message.toLowerCase().includes('tile')) {
				return;
			}
			tileError = m.map_tiles_error();
		});
		instance.on('data', (event) => {
			const dataEvent = event as { sourceId?: string; isSourceLoaded?: boolean };
			if (dataEvent.sourceId?.startsWith('ign-') && dataEvent.isSourceLoaded) {
				tileError = '';
			}
		});
		instance.on('load', () => {
			map = instance;
			instance.resize();
			const { width, height } = mapContainer.getBoundingClientRect();
			lastObservedMapWidth = width;
			lastObservedMapHeight = height;
			requestAnimationFrame(() => {
				mapReady = true;
			});
		});
		instance.on('moveend', () => {
			refreshDownloadEstimate();
			if (!embedded && pendingFocusPopupMarker) {
				openPendingFocusPopup();
			}
		});
		instance.on('zoomend', () => refreshDownloadEstimate());

		const handleUserPan = () => {
			if (embedded) {
				userManualPan = true;
			}
		};
		if (embedded) {
			instance.on('dragstart', handleUserPan);
			instance.on('zoomstart', handleUserPan);
			instance.on('rotatestart', handleUserPan);
			instance.on('pitchstart', handleUserPan);
		}

		const handleMapClick = (event: maplibregl.MapMouseEvent) => {
			if (embedded || downloadSelectionMode) return;
			selectMapCadastrePoint(event.lngLat.lat, event.lngLat.lng);
		};
		if (!embedded) {
			instance.on('click', handleMapClick);
		}

		const resizeObserver = new ResizeObserver(() => {
			if (mapContainer) {
				scheduleMapContainerResize(instance, mapContainer);
			}
		});
		resizeObserver.observe(mapContainer);

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
			if (embedded) {
				instance.off('dragstart', handleUserPan);
				instance.off('zoomstart', handleUserPan);
				instance.off('rotatestart', handleUserPan);
				instance.off('pitchstart', handleUserPan);
			}
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
		}
		void refreshCacheStats();
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
		void deviceHeading;
		void userPositionState.position;
		void focusTreeId;
		void focusCenter;
		scheduleUserPositionSync();
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
		refreshDownloadEstimate();
	});

	$effect(() => {
		if (!mapReady || !map) return;
		void appearanceSettingsState.outdoorMode;
		void appearanceSettingsState.locale;
		refreshMapAppearance();
		syncUserMarker();
	});

	let gpsCount = $derived(treesWithGps().length);
	let canRecenter = $derived(mapReady && userPositionState.position !== null);

	const cadastreTarget = $derived.by(() => {
		if (embedded) {
			if (focusTreeId) {
				const tree = getTreeById(focusTreeId);
				if (tree?.latitude != null && tree.longitude != null) {
					return {
						latitude: tree.latitude,
						longitude: tree.longitude,
						stored: tree.cadastreInfo
					};
				}
			}

			const userPos = userPositionState.position;
			if (userPos) {
				return {
					latitude: userPos.latitude,
					longitude: userPos.longitude,
					stored: null
				};
			}

			return null;
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
		onlineState.online && cadastreLookup.loading && cadastreDisplay === null
	);

	const cadastreSpecies = $derived.by(() => {
		if (mapCadastreSelection?.species) {
			return mapCadastreSelection.species;
		}
		if (focusTreeId) {
			return getTreeById(focusTreeId)?.species ?? '';
		}
		return '';
	});

	const showCadastreBanner = $derived(
		(cadastreBannerLoading || cadastreDisplay !== null) &&
			cadastreTargetKey !== '' &&
			cadastreTargetKey !== cadastreDismissedKey &&
			(embedded || mapCadastreSelection !== null)
	);

	function dismissCadastreBanner(): void {
		cadastreDismissedKey = cadastreTargetKey;
	}

	$effect(() => {
		if (!mapReady || !map || embedded || !focusTreeId) return;

		const tree = getTreeById(focusTreeId);
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
			const online = onlineState.online;

			if (!target) {
				resetCadastreLookup();
				return;
			}

			cadastreLookup.latitude = target.latitude;
			cadastreLookup.longitude = target.longitude;
			cadastreLookup.data = target.stored ?? null;

			if (!online && target.stored) {
				cadastreLookup.loading = false;
				return;
			}

			if (target.stored) {
				cadastreLookup.loading = false;
				cadastreLookup.data = target.stored;
				return;
			}

			if (!online) {
				cadastreLookup.loading = false;
				cadastreLookup.data = target.stored ?? null;
				return;
			}

			cadastreLookup.loading = true;

			cadastreDebounceTimer = setTimeout(() => {
				void resolveCadastre(target.latitude, target.longitude, online, target.stored ?? null);
			}, 500);

			return () => {
				if (cadastreDebounceTimer) {
					clearTimeout(cadastreDebounceTimer);
					cadastreDebounceTimer = null;
				}
			};
		}

		const selection = mapCadastreSelection;
		if (!selection) {
			resetCadastreLookup();
			return;
		}

		const online = onlineState.online;
		cadastreLookup.latitude = selection.latitude;
		cadastreLookup.longitude = selection.longitude;
		cadastreLookup.data = selection.stored ?? null;

		if (selection.stored) {
			cadastreLookup.loading = false;
			return;
		}

		if (!online) {
			cadastreLookup.loading = false;
			return;
		}

		cadastreLookup.loading = true;
		cadastreDebounceTimer = setTimeout(() => {
			void resolveCadastre(selection.latitude, selection.longitude, online, null);
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
</script>

<div class="relative h-full min-h-0 w-full flex-1">
	<div bind:this={mapContainer} class="topo-map absolute inset-0 h-full w-full"></div>

	{#if !embedded}
	<div class="map-controls-top absolute inset-x-2 z-30 pointer-events-none">
		<div class="pointer-events-auto flex items-center gap-1 overflow-x-auto pb-0.5">
			<div class="flex shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
				<button
					type="button"
					class="px-2.5 py-1.5 text-[11px] font-semibold transition {basemap === 'topo'
						? 'bg-forest-800 text-white'
						: 'text-forest-900'}"
					onclick={() => setBasemap('topo')}
				>
					{m.map_layer_plan()}
				</button>
				<button
					type="button"
					class="px-2.5 py-1.5 text-[11px] font-semibold transition {basemap === 'satellite'
						? 'bg-forest-800 text-white'
						: 'text-forest-900'}"
					onclick={() => setBasemap('satellite')}
				>
					{m.map_layer_satellite()}
				</button>
			</div>
			<div class="flex shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
				<button
					type="button"
					class="px-2.5 py-1.5 text-[11px] font-semibold transition {showCadastreLayer
						? 'bg-forest-800 text-white'
						: 'text-forest-900'}"
					onclick={() => setCadastreLayer(!showCadastreLayer)}
					disabled={!onlineState.online}
					title={onlineState.online ? undefined : m.settings_offline_map_hint()}
				>
					{m.map_layer_cadastre()}
				</button>
			</div>
			<div class="flex shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm">
				<button
					type="button"
					class="px-2.5 py-1.5 text-[11px] font-semibold transition {viewMode === 'topdown'
						? 'bg-forest-800 text-white'
						: 'text-forest-900'}"
					onclick={() => setViewMode('topdown')}
				>
					Dessus
				</button>
				<button
					type="button"
					class="px-2.5 py-1.5 text-[11px] font-semibold transition {viewMode === 'oblique'
						? 'bg-forest-800 text-white'
						: 'text-forest-900'}"
					onclick={() => setViewMode('oblique')}
				>
					Oblique
				</button>
			</div>
			{#if showCadastreLayer && onlineState.online}
				<span
					class="shrink-0 rounded-lg bg-white/90 px-2 py-1.5 text-[10px] text-gray-600 shadow-sm backdrop-blur-sm"
				>
					{m.map_cadastre_tap_hint()}
				</span>
			{/if}
			{#if onlineState.online && !downloadSelectionMode}
				<button
					type="button"
					class="shrink-0 rounded-lg border border-forest-600/40 bg-forest-50/95 px-2.5 py-1.5 text-[11px] font-semibold text-forest-900 shadow-sm backdrop-blur-sm disabled:opacity-50"
					onclick={startDownloadSelection}
					disabled={downloadingZone || !mapReady}
				>
					{m.map_offline_button()}
				</button>
			{/if}
			{#if cacheCount > 0}
				<span
					class="shrink-0 rounded-lg bg-white/90 px-2 py-1.5 text-[10px] text-gray-600 shadow-sm backdrop-blur-sm"
				>
					{m.settings_tiles_count({ count: cacheCount })}
				</span>
			{/if}
		</div>
	</div>
	{/if}

	{#if !embedded}
	<MapDownloadOverlay
		active={downloadSelectionMode}
		tileCount={downloadTileCount}
		downloading={downloadingZone}
		progress={downloadProgress}
		onCancel={cancelDownloadSelection}
		onDownload={() => void handleDownloadZone()}
	/>
	{/if}

	<div
		class="map-recenter-control pointer-events-auto absolute right-2 z-50 {embedded
			? 'map-recenter-control--embedded'
			: ''}"
	>
		<button
			type="button"
			use:nativeTap={{ onactivate: () => void recenterOnUser(), label: 'map-recenter' }}
			class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white/95 text-forest-800 shadow-sm backdrop-blur-sm transition active:scale-95 disabled:opacity-50"
			disabled={!canRecenter}
			aria-label={m.map_orient_north()}
			title={m.map_north_position()}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-5 w-5"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="3" />
				<path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke-linecap="round" />
				<path d="M12 5l-1.5 4.5H12h1.5L12 5z" fill="currentColor" stroke="none" />
			</svg>
		</button>
	</div>

	{#if !onlineState.online && cacheCount === 0 && !downloadSelectionMode && !embedded}
		<div
			class="pointer-events-none absolute inset-x-4 map-banner-top rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm text-sky-900 shadow-sm"
			role="status"
		>
			{m.settings_offline_map_hint()}
		</div>
	{/if}

	{#if tileError}
		<div
			class="pointer-events-none absolute inset-x-4 map-banner-top rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 shadow-sm"
			role="alert"
		>
			{tileError}
		</div>
	{:else if gpsCount === 0 && !embedded}
		<div
			class="pointer-events-none absolute inset-x-4 map-banner-top rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 shadow-sm"
			role="status"
		>
			{m.gps_no_coords_saved()}
		</div>
	{/if}

	{#if showCadastreBanner}
		<div
			class="map-cadastre-banner pointer-events-auto {embedded ? 'map-cadastre-banner--embedded' : ''}"
		>
			<CadastreBanner
				info={cadastreDisplay}
				loading={cadastreBannerLoading}
				floating
				dismissible
				checklistOpen={vetoChecklistOpen}
				onchecklisttoggle={() => (vetoChecklistOpen = !vetoChecklistOpen)}
				ondismiss={dismissCadastreBanner}
			/>
			{#if vetoChecklistOpen && cadastreDisplay && cadastreTarget}
				<div class="map-cadastre-checklist mt-2">
					<VetoLegalChecklist
						cadastreInfo={cadastreDisplay}
						species={cadastreSpecies}
						latitude={cadastreTarget.latitude}
						longitude={cadastreTarget.longitude}
						onclose={() => (vetoChecklistOpen = false)}
					/>
				</div>
			{/if}
		</div>
	{/if}

	<div class="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex flex-col gap-2">
		{#if !embedded}
		<p
			class="pointer-events-auto self-end max-w-[min(100%,18rem)] rounded bg-white/90 px-2 py-1 text-right text-[10px] leading-snug text-gray-600 shadow-sm"
		>
			{showCadastreLayer ? `${IGN_ATTRIBUTION} · ${CADASTRE_LAYER.attribution}` : IGN_ATTRIBUTION}
		</p>
		<div class="pointer-events-auto w-full">
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
</style>
