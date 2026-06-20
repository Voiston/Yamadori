<script lang="ts">
	import type { CompassTarget } from '$lib/types/compass';
	import {
		formatDistance,
		getRelativeDirection,
		haversineBearingDeg,
		haversineDistanceM,
		normalizeAngle,
		normalizeHeading360,
		shortestAngleDelta,
		smoothBearing
	} from '$lib/utils/haversine';
	import {
		headingToCardinal,
		requestOrientationPermission,
		subscribeDeviceOrientation
	} from '$lib/utils/compass';
	import { isGpsCourseFusionActive } from '$lib/utils/haversine';
	import {
		requestCurrentPosition,
		startWatchingPosition,
		stopWatchingPosition,
		userPositionState
	} from '$lib/utils/userPosition.svelte';
	import { onMount } from 'svelte';

	let { target }: { target: CompassTarget } = $props();

	let heading = $state<number | null>(null);
	let orientationEnabled = $state(false);
	let orientationError = $state('');
	let unsubscribeOrientation: (() => void) | null = null;
	let smoothedBearing = $state<number | null>(null);
	let lastBearingPosition = $state<{ latitude: number; longitude: number } | null>(null);
	let displayRotation = $state(0);

	let distance = $derived.by(() => {
		if (
			!userPositionState.position ||
			target.latitude === null ||
			target.longitude === null
		) {
			return null;
		}
		return haversineDistanceM(
			userPositionState.position.latitude,
			userPositionState.position.longitude,
			target.latitude,
			target.longitude
		);
	});

	$effect(() => {
		const position = userPositionState.position;
		if (!position || target.latitude === null || target.longitude === null) {
			smoothedBearing = null;
			lastBearingPosition = null;
			return;
		}

		const nextBearing = haversineBearingDeg(
			position.latitude,
			position.longitude,
			target.latitude,
			target.longitude
		);

		const movedMeters = lastBearingPosition
			? haversineDistanceM(
					lastBearingPosition.latitude,
					lastBearingPosition.longitude,
					position.latitude,
					position.longitude
				)
			: Number.POSITIVE_INFINITY;

		smoothedBearing = smoothBearing(smoothedBearing, nextBearing, movedMeters);
		lastBearingPosition = {
			latitude: position.latitude,
			longitude: position.longitude
		};
	});

	let bearing = $derived(smoothedBearing);

	let relativeAngle = $derived.by(() => {
		if (bearing === null || heading === null) return null;
		return normalizeAngle(bearing - heading);
	});

	let arrowRotation = $derived.by(() => {
		if (bearing === null) return 0;
		if (heading !== null) return normalizeHeading360(bearing - heading);
		return bearing;
	});

	$effect(() => {
		const targetRotation = arrowRotation;
		displayRotation += shortestAngleDelta(displayRotation, targetRotation);
	});

	let directionText = $derived.by(() => {
		if (bearing === null) return '';
		if (relativeAngle !== null) return getRelativeDirection(relativeAngle);
		return headingToCardinal(bearing);
	});

	let compassStatusText = $derived.by(() => {
		if (!orientationEnabled) return '';
		if (heading === null) {
			return 'Direction approximative — alignez le haut du téléphone vers le nord';
		}
		const position = userPositionState.position;
		if (
			position &&
			isGpsCourseFusionActive(position.courseDegrees, position.speedMps)
		) {
			return 'Boussole + cap GPS (en marchant)';
		}
		return 'Boussole active (nord vrai)';
	});

	function getHeadingFusionContext() {
		const position = userPositionState.position;
		return {
			latitude: position?.latitude ?? null,
			longitude: position?.longitude ?? null,
			gpsCourseDegrees: position?.courseDegrees ?? null,
			speedMps: position?.speedMps ?? null
		};
	}

	async function enableOrientation() {
		orientationError = '';
		const granted = await requestOrientationPermission();
		if (!granted) {
			orientationError = 'Permission boussole refusée';
			return;
		}

		unsubscribeOrientation?.();
		unsubscribeOrientation = subscribeDeviceOrientation(
			(value) => {
				heading = value;
			},
			getHeadingFusionContext
		);
		orientationEnabled = true;
	}

	onMount(() => {
		void requestCurrentPosition();
		startWatchingPosition();

		return () => {
			stopWatchingPosition();
			unsubscribeOrientation?.();
		};
	});
</script>

<div class="flex flex-col items-center gap-6 py-6">
	{#if target.latitude === null || target.longitude === null}
		<p class="text-center text-muted">Aucune coordonnée GPS disponible.</p>
	{:else}
		<div class="text-center">
			<h2 class="text-xl font-semibold text-forest-900">{target.label}</h2>
			{#if distance !== null}
				<p class="mt-2 text-2xl font-semibold text-forest-800">{formatDistance(distance)}</p>
			{:else}
				<p class="mt-2 text-sm text-muted">Calcul de la position…</p>
			{/if}
			{#if directionText}
				<p class="mt-1 text-base text-muted">{directionText}</p>
			{/if}
		</div>

		<div class="relative flex h-64 w-64 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm lg:h-80 lg:w-80">
			<div class="absolute inset-4 rounded-full border border-dashed border-gray-200"></div>
			<span class="absolute top-3 text-xs font-medium text-muted">N</span>
			<div
				style:transform="rotate({displayRotation}deg)"
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
		{:else if compassStatusText}
			<p class="text-center text-sm text-muted">{compassStatusText}</p>
		{/if}

		{#if orientationError}
			<p class="text-center text-sm text-amber-800">{orientationError}</p>
		{/if}

		{#if userPositionState.error}
			<p class="text-center text-sm text-amber-800">{userPositionState.error}</p>
		{/if}
	{/if}
</div>
