<script lang="ts">
	import type { Tree } from '$lib/types/tree';
	import { base } from '$app/paths';
	import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';
	import { formatAccuracy } from '$lib/utils/gps';
	import {
		createAccuracyCircleFeature,
		createApproachLine,
		emptyFeatureCollection
	} from '$lib/utils/map/geojson';
	import { IGN_ATTRIBUTION } from '$lib/utils/map/ign';
	import {
		createIgnMapStyle,
		setBasemapVisibility,
		type MapBasemap
	} from '$lib/utils/map/styles';
	import { getTreeById, treeStore, treesWithGps } from '$lib/stores/trees.svelte';
	import {
		requestCurrentPosition,
		startWatchingPosition,
		stopWatchingPosition,
		userPositionState
	} from '$lib/utils/userPosition.svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { onMount } from 'svelte';
	import type { GeoJSONSource, Map as MaplibreMap, Marker, Popup } from 'maplibre-gl';

	let {
		focusTreeId
	}: {
		focusTreeId?: string;
	} = $props();

	let mapContainer: HTMLDivElement | undefined = $state();
	let map: MaplibreMap | undefined = $state();
	let basemap = $state<MapBasemap>('topo');

	const defaultCenter: [number, number] = [2.5, 46.5];
	const defaultZoom = 6;

	const markers = new Map<string, Marker>();
	const popups = new Map<string, Popup>();
	let userMarker: Marker | undefined;
	let mapReady = $state(false);
	let tileError = $state('');

	function escapeHtml(text: string): string {
		return text
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;');
	}

	function buildPopupHtml(tree: Tree): string {
		const link = `${base}/tree/${tree.id}`;
		const accuracyLine =
			tree.accuracyMeters !== null
				? `<br><span style="color:#6b7280;font-size:12px;">${escapeHtml(formatAccuracy(tree.accuracyMeters))}</span>`
				: '';
		return `<strong>${escapeHtml(tree.species)}</strong>${accuracyLine}<br><a href="${link}" style="color:#2d4a2d;font-weight:600;">Voir</a>`;
	}

	function createTreeMarkerElement(): HTMLDivElement {
		const el = document.createElement('div');
		el.style.cssText =
			'background:#2d4a2d;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
		return el;
	}

	function createUserMarkerElement(): HTMLDivElement {
		const el = document.createElement('div');
		el.style.cssText =
			'background:#2563eb;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35);';
		return el;
	}

	function getAccuracyCirclesGeoJson(trees: Tree[]) {
		const features = trees
			.filter((tree) => tree.accuracyMeters && tree.latitude !== null && tree.longitude !== null)
			.map((tree) => {
				const isPoor = tree.accuracyMeters! > POOR_ACCURACY_THRESHOLD_M;
				return createAccuracyCircleFeature(
					tree.longitude!,
					tree.latitude!,
					tree.accuracyMeters!,
					isPoor ? '#d97706' : '#4a7c4a'
				);
			});
		return { type: 'FeatureCollection', features };
	}

	function syncTreeMarkers(): void {
		if (!map) return;

		const gpsTrees = treesWithGps();
		const currentIds = new Set(gpsTrees.map((tree) => tree.id));

		for (const [id, marker] of markers) {
			if (!currentIds.has(id)) {
				marker.remove();
				markers.delete(id);
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
				marker = new maplibregl.Marker({ element: createTreeMarkerElement() })
					.setLngLat(lngLat)
					.setPopup(popup)
					.addTo(map);
				markers.set(tree.id, marker);
			} else {
				marker.setLngLat(lngLat);
				popups.get(tree.id)?.setHTML(buildPopupHtml(tree));
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

		if (
			focusTree &&
			userPos &&
			focusTree.latitude !== null &&
			focusTree.longitude !== null
		) {
			source.setData({
				type: 'FeatureCollection',
				features: [
					createApproachLine(
						userPos.longitude,
						userPos.latitude,
						focusTree.longitude,
						focusTree.latitude
					)
				]
			});
		} else {
			source.setData(emptyFeatureCollection());
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
		if (!userMarker) {
			userMarker = new maplibregl.Marker({ element: createUserMarkerElement() })
				.setLngLat(lngLat)
				.addTo(map);
		} else {
			userMarker.setLngLat(lngLat);
		}
	}

	function fitMapToTrees(): void {
		if (!map) return;

		const gpsTrees = treesWithGps();
		const focusTree = focusTreeId ? getTreeById(focusTreeId) : undefined;
		const focusMarker = focusTreeId ? markers.get(focusTreeId) : undefined;

		if (
			focusTree &&
			focusMarker &&
			focusTree.latitude !== null &&
			focusTree.longitude !== null
		) {
			map.flyTo({
				center: [focusTree.longitude, focusTree.latitude],
				zoom: 16,
				pitch: basemap === 'topo' ? 45 : 0,
				duration: 800
			});
			focusMarker.togglePopup();
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
				pitch: basemap === 'topo' ? 45 : 0,
				duration: 800
			});
		} else {
			map.flyTo({ center: defaultCenter, zoom: defaultZoom, pitch: 0, duration: 800 });
		}
	}

	function setBasemap(next: MapBasemap): void {
		basemap = next;
		if (!map) return;
		setBasemapVisibility(map, next);
		map.easeTo({ pitch: next === 'topo' ? 45 : 0, duration: 400 });
	}

	function resetNorthView(): void {
		map?.easeTo({ bearing: 0, pitch: basemap === 'topo' ? 45 : 0, duration: 400 });
	}

	onMount(() => {
		if (!mapContainer) return;

		void requestCurrentPosition();
		startWatchingPosition();

		const instance = new maplibregl.Map({
			container: mapContainer,
			style: createIgnMapStyle(),
			center: defaultCenter,
			zoom: defaultZoom,
			pitch: 45,
			attributionControl: { compact: true },
			maxPitch: 60
		});

		instance.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
		instance.on('error', (event) => {
			if (event.error?.message) {
				tileError = 'Impossible de charger les tuiles IGN — vérifiez votre connexion';
			}
		});
		instance.on('load', () => {
			map = instance;
			mapReady = true;
			syncTreeMarkers();
			syncUserMarker();
			syncApproachLine();
			fitMapToTrees();
		});

		return () => {
			stopWatchingPosition();
			for (const marker of markers.values()) marker.remove();
			markers.clear();
			popups.clear();
			userMarker?.remove();
			userMarker = undefined;
			instance.remove();
			map = undefined;
			mapReady = false;
		};
	});

	$effect(() => {
		if (!mapReady || !map) return;
		void treeStore.trees;
		syncTreeMarkers();
	});

	$effect(() => {
		if (!mapReady || !map) return;
		void userPositionState.position;
		void focusTreeId;
		syncUserMarker();
		syncApproachLine();
	});

	let gpsCount = $derived(treesWithGps().length);
</script>

<div class="relative h-[calc(100dvh-3.5rem-4rem)] min-h-[320px] w-full">
	<div bind:this={mapContainer} class="h-full w-full"></div>

	<div class="absolute top-3 left-3 flex flex-col gap-2">
		<div class="flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
			<button
				type="button"
				class="px-3 py-2 text-xs font-semibold transition {basemap === 'topo'
					? 'bg-forest-800 text-white'
					: 'text-forest-900'}"
				onclick={() => setBasemap('topo')}
			>
				Topographique
			</button>
			<button
				type="button"
				class="px-3 py-2 text-xs font-semibold transition {basemap === 'satellite'
					? 'bg-forest-800 text-white'
					: 'text-forest-900'}"
				onclick={() => setBasemap('satellite')}
			>
				Satellite
			</button>
		</div>
		<button
			type="button"
			class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-forest-900 shadow-sm"
			onclick={resetNorthView}
		>
			Vue nord
		</button>
	</div>

	{#if tileError}
		<div
			class="pointer-events-none absolute inset-x-4 top-20 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 shadow-sm"
			role="alert"
		>
			{tileError}
		</div>
	{:else if gpsCount === 0}
		<div
			class="pointer-events-none absolute inset-x-4 top-20 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 shadow-sm"
			role="status"
		>
			Aucun arbre géolocalisé — activez le GPS lors de la capture
		</div>
	{/if}

	<div
		class="pointer-events-none absolute right-2 bottom-2 max-w-[55%] rounded bg-white/80 px-2 py-1 text-[10px] text-gray-600"
	>
		{IGN_ATTRIBUTION}
	</div>
</div>
