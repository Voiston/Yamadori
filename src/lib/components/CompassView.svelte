<script lang="ts">
	import type { Tree } from '$lib/types/tree';
	import {
		formatDistance,
		getRelativeDirection,
		haversineBearingDeg,
		haversineDistanceM,
		normalizeAngle
	} from '$lib/utils/haversine';
	import { getDeviceHeading, requestOrientationPermission } from '$lib/utils/compass';
	import {
		requestCurrentPosition,
		startWatchingPosition,
		stopWatchingPosition,
		userPositionState
	} from '$lib/utils/userPosition.svelte';
	import { onMount } from 'svelte';

	let { tree }: { tree: Tree } = $props();

	let heading = $state<number | null>(null);
	let orientationEnabled = $state(false);
	let orientationError = $state('');

	let distance = $derived.by(() => {
		if (
			!userPositionState.position ||
			tree.latitude === null ||
			tree.longitude === null
		) {
			return null;
		}
		return haversineDistanceM(
			userPositionState.position.latitude,
			userPositionState.position.longitude,
			tree.latitude,
			tree.longitude
		);
	});

	let bearing = $derived.by(() => {
		if (!userPositionState.position || tree.latitude === null || tree.longitude === null) {
			return null;
		}
		return haversineBearingDeg(
			userPositionState.position.latitude,
			userPositionState.position.longitude,
			tree.latitude,
			tree.longitude
		);
	});

	let arrowRotation = $derived.by(() => {
		if (bearing === null || heading === null) return 0;
		return normalizeAngle(bearing - heading);
	});

	let directionText = $derived(
		heading === null ? '' : getRelativeDirection(arrowRotation)
	);

	function handleOrientation(event: DeviceOrientationEvent) {
		const value = getDeviceHeading(event);
		if (value !== null) {
			heading = value;
		}
	}

	async function enableOrientation() {
		orientationError = '';
		const granted = await requestOrientationPermission();
		if (!granted) {
			orientationError = 'Permission boussole refusée';
			return;
		}

		window.addEventListener('deviceorientation', handleOrientation, true);
		orientationEnabled = true;
	}

	onMount(() => {
		void requestCurrentPosition();
		startWatchingPosition();

		return () => {
			stopWatchingPosition();
			window.removeEventListener('deviceorientation', handleOrientation, true);
		};
	});
</script>

<div class="flex flex-col items-center gap-6 py-6">
	{#if tree.latitude === null || tree.longitude === null}
		<p class="text-center text-muted">Cet arbre n'a pas de coordonnées GPS.</p>
	{:else}
		<div class="text-center">
			<h2 class="text-xl font-semibold text-forest-900">{tree.species}</h2>
			{#if distance !== null}
				<p class="mt-2 text-2xl font-semibold text-forest-800">{formatDistance(distance)}</p>
			{:else}
				<p class="mt-2 text-sm text-muted">Calcul de la position…</p>
			{/if}
			{#if directionText}
				<p class="mt-1 text-base text-muted">{directionText}</p>
			{/if}
		</div>

		<div class="relative flex h-64 w-64 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
			<div class="absolute inset-4 rounded-full border border-dashed border-gray-200"></div>
			<span class="absolute top-3 text-xs font-medium text-muted">N</span>
			<div
				class="transition-transform duration-200"
				style:transform="rotate({arrowRotation}deg)"
				aria-hidden="true"
			>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" class="h-24 w-24">
					<path d="M32 6 L40 44 L32 38 L24 44 Z" fill="#2d4a2d" />
				</svg>
			</div>
		</div>

		{#if !orientationEnabled}
			<button
				type="button"
				onclick={enableOrientation}
				class="flex h-12 items-center justify-center rounded-xl bg-forest-800 px-6 text-base font-semibold text-white transition active:scale-[0.98]"
			>
				Activer la boussole
			</button>
		{/if}

		{#if orientationError}
			<p class="text-center text-sm text-amber-800">{orientationError}</p>
		{/if}

		{#if userPositionState.error}
			<p class="text-center text-sm text-amber-800">{userPositionState.error}</p>
		{/if}
	{/if}
</div>
