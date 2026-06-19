<script lang="ts">
	import type { Tree } from '$lib/types/tree';
	import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';
	import { formatAccuracy } from '$lib/utils/gps';
	import { getTreeById, treesWithGps } from '$lib/stores/trees.svelte';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { onMount } from 'svelte';

	let {
		focusTreeId
	}: {
		focusTreeId?: string;
	} = $props();

	let mapContainer: HTMLDivElement | undefined = $state();
	let map: L.Map | undefined;

	const defaultCenter: L.LatLngExpression = [46.5, 2.5];
	const defaultZoom = 6;

	const treeIcon = L.divIcon({
		className: '',
		html: `<div style="background:#2d4a2d;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
		iconSize: [14, 14],
		iconAnchor: [7, 7]
	});

	function buildPopupContent(tree: Tree): string {
		const link = `/tree/${tree.id}`;
		const accuracyLine =
			tree.accuracyMeters !== null
				? `<br><span style="color:#6b7280;font-size:12px;">${escapeHtml(formatAccuracy(tree.accuracyMeters))}</span>`
				: '';
		return `<strong>${escapeHtml(tree.species)}</strong>${accuracyLine}<br><a href="${link}" style="color:#2d4a2d;font-weight:600;">Voir</a>`;
	}

	function escapeHtml(text: string): string {
		return text
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;');
	}

	onMount(() => {
		if (!mapContainer) return;

		const gpsTrees = treesWithGps();
		const markers = new Map<string, L.Marker>();

		map = L.map(mapContainer, {
			zoomControl: true,
			attributionControl: true
		});

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);

		const bounds = L.latLngBounds([]);

		for (const tree of gpsTrees) {
			if (tree.latitude === null || tree.longitude === null) continue;

			const latLng: L.LatLngExpression = [tree.latitude, tree.longitude];

			if (tree.accuracyMeters) {
				const isPoor = tree.accuracyMeters > POOR_ACCURACY_THRESHOLD_M;
				L.circle(latLng, {
					radius: tree.accuracyMeters,
					color: isPoor ? '#d97706' : '#4a7c4a',
					fillOpacity: 0.15,
					weight: 1
				}).addTo(map);
			}

			const marker = L.marker(latLng, { icon: treeIcon }).addTo(map);
			marker.bindPopup(buildPopupContent(tree));
			markers.set(tree.id, marker);
			bounds.extend(latLng);
		}

		const focusTree = focusTreeId ? getTreeById(focusTreeId) : undefined;
		const focusMarker = focusTreeId ? markers.get(focusTreeId) : undefined;

		if (
			focusTree &&
			focusMarker &&
			focusTree.latitude !== null &&
			focusTree.longitude !== null
		) {
			map.setView([focusTree.latitude, focusTree.longitude], 16);
			focusMarker.openPopup();
		} else if (gpsTrees.length > 1) {
			map.fitBounds(bounds, { padding: [40, 40] });
		} else if (gpsTrees.length === 1) {
			const tree = gpsTrees[0];
			map.setView([tree.latitude!, tree.longitude!], 14);
		} else {
			map.setView(defaultCenter, defaultZoom);
		}

		return () => {
			map?.remove();
			map = undefined;
		};
	});

	let gpsCount = $derived(treesWithGps().length);
</script>

<div class="relative h-[calc(100dvh-3.5rem-4rem)] min-h-[320px] w-full">
	<div bind:this={mapContainer} class="h-full w-full"></div>

	{#if gpsCount === 0}
		<div
			class="pointer-events-none absolute inset-x-4 top-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 shadow-sm"
			role="status"
		>
			Aucun arbre géolocalisé — activez le GPS lors de la capture
		</div>
	{/if}
</div>
