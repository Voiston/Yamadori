<script lang="ts">
	import { resolve } from '$app/paths';
	import { clearParking, parkingStore, saveParking } from '$lib/stores/parking.svelte';
	import { showOkToast } from '$lib/stores/appToast.svelte';
	import { resolveErrorCopy, type ErrorCopy } from '$lib/utils/userFacingError';
	import { mapRecenterGpsCopy, parkingSaveFailedCopy } from '$lib/utils/errorCopy';
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import {
		compassSettingsState,
		initCompassSettings
	} from '$lib/stores/compassSettings.svelte';
	import { headingToCardinal } from '$lib/utils/compass';
	import { getCoordinates, type GpsCapture } from '$lib/utils/geo';
	import { formatAccuracy, isBetterAccuracy, isPoorAccuracy } from '$lib/utils/gps';
	import { shouldUpdateCompassPosition } from '$lib/utils/compassPosition';
	import { COMPASS_GPS_CONSUMER_ID } from '$lib/utils/gpsSession';
	import {
		formatDistance,
		haversineBearingDeg,
		haversineDistanceM,
		magneticToTrueHeading,
		normalizeHeading360,
		shortestAngleDelta,
		smoothBearing
	} from '$lib/utils/haversine';
	import { hapticLight, hapticSelection } from '$lib/utils/haptics';
	import {
		createHeadingFusionState,
		processHeadingFusion,
		resetHeadingFusionState
	} from '$lib/utils/headingFusion';
	import { watchFusedHeading } from '$lib/utils/headingProvider';
	import { loadMagneticDeclinationDeg } from '$lib/utils/magneticDeclination';
	import {
		acquireLocationWatch,
		getPublishedUserPosition,
		getPublishedUserPositionUpdatedAt,
		requestCurrentPosition,
		userPositionState
	} from '$lib/utils/userPosition.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { untrack } from 'svelte';

	const PARKING_PUBLISHED_MAX_AGE_MS = 15_000;
	const PARKING_GPS_WAIT_MS = 20_000;
	const PARKING_GPS_POLL_MS = 500;
	const DISPLAY_ROTATION_DEADBAND_DEG = 0.5;

	let {
		variant = 'overlay'
	}: {
		variant?: 'overlay' | 'inline';
	} = $props();

	let expanded = $state(false);
	let saving = $state(false);
	let warning = $state('');
	let saveError = $state<ErrorCopy | null>(null);
	let liveAccuracyMeters = $state<number | null>(null);
	let sensorHeadingRaw = $state<number | null>(null);
	let sensorReference = $state<'true' | 'magnetic'>('true');
	let declinationDeg = $state<number | null>(null);
	let displayRotation = $state(0);
	let smoothedBearing = $state<number | null>(null);
	let lastBearingPosition = $state<{ latitude: number; longitude: number } | null>(null);
	let lastParkingKey = $state('');

	const fusionState = createHeadingFusionState();

	let parking = $derived(parkingStore.position);

	const compassLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_compass_title().replace(/\s*\([^)]*\)$/, '');
	});

	let distance = $derived.by(() => {
		const position = userPositionState.position;
		if (!parking || !position) return null;
		return haversineDistanceM(
			position.latitude,
			position.longitude,
			parking.latitude,
			parking.longitude
		);
	});

	const declinationGridKey = $derived.by(() => {
		const position = userPositionState.position;
		if (!position) {
			return null;
		}
		return `${position.latitude.toFixed(3)},${position.longitude.toFixed(3)}`;
	});

	let trueSensorHeading = $derived.by(() => {
		if (sensorHeadingRaw === null) {
			return null;
		}
		if (sensorReference === 'magnetic' && declinationDeg !== null) {
			return magneticToTrueHeading(sensorHeadingRaw, declinationDeg);
		}
		return sensorHeadingRaw;
	});

	let heading = $derived.by(() => {
		if (!parking) return null;
		const position = userPositionState.position;
		return processHeadingFusion(fusionState, {
			sensorHeading: trueSensorHeading,
			gpsHeading: position?.courseDegrees ?? null,
			speedMps: position?.speedMps ?? null
		});
	});

	let bearing = $derived(smoothedBearing);

	let arrowRotation = $derived.by(() => {
		if (bearing === null) return 0;
		if (heading !== null) return normalizeHeading360(bearing - heading);
		return bearing;
	});

	$effect(() => {
		void initCompassSettings();
	});

	$effect(() => {
		if (!parking) {
			return;
		}
		const profile = compassSettingsState.gpsProfile;
		void requestCurrentPosition(profile);
		const release = acquireLocationWatch(COMPASS_GPS_CONSUMER_ID, profile);
		return () => release();
	});

	$effect(() => {
		if (!parking) {
			sensorHeadingRaw = null;
			displayRotation = 0;
			resetHeadingFusionState(fusionState);
			return;
		}

		const stop = watchFusedHeading({
			onSample(sample) {
				sensorHeadingRaw = sample.heading;
				sensorReference = sample.reference;
			},
			onPause() {
				sensorHeadingRaw = null;
			}
		});

		return () => {
			stop();
			resetHeadingFusionState(fusionState);
		};
	});

	$effect(() => {
		const gridKey = declinationGridKey;
		if (!gridKey) {
			declinationDeg = null;
			return;
		}

		const [latitude, longitude] = gridKey.split(',').map(Number);
		let cancelled = false;
		void loadMagneticDeclinationDeg(latitude, longitude).then((decl) => {
			if (!cancelled) {
				declinationDeg = decl;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const parkingKey = parking ? `${parking.latitude},${parking.longitude}` : '';
		const position = userPositionState.position;
		if (!parking || !position) {
			untrack(() => {
				smoothedBearing = null;
				lastBearingPosition = null;
				lastParkingKey = '';
			});
			return;
		}

		let previousPosition = untrack(() => lastBearingPosition);
		if (parkingKey !== untrack(() => lastParkingKey)) {
			lastParkingKey = parkingKey;
			previousPosition = null;
		}

		if (!shouldUpdateCompassPosition(previousPosition, position)) {
			return;
		}

		const nextBearing = haversineBearingDeg(
			position.latitude,
			position.longitude,
			parking.latitude,
			parking.longitude
		);

		const previousBearing = untrack(() => smoothedBearing);
		const movedMeters = previousPosition
			? haversineDistanceM(
					previousPosition.latitude,
					previousPosition.longitude,
					position.latitude,
					position.longitude
				)
			: Number.POSITIVE_INFINITY;

		smoothedBearing = smoothBearing(previousBearing, nextBearing, movedMeters);
		lastBearingPosition = {
			latitude: position.latitude,
			longitude: position.longitude
		};
	});

	$effect(() => {
		const targetRotation = arrowRotation;
		const current = untrack(() => displayRotation);
		const delta = shortestAngleDelta(current, targetRotation);
		if (Math.abs(delta) >= DISPLAY_ROTATION_DEADBAND_DEG) {
			displayRotation = current + delta;
		}
	});

	let statusText = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!parking) return '';
		if (distance === null || bearing === null) {
			return m.parking_calculating();
		}
		return m.parking_distance({
			distance: formatDistance(distance),
			direction: headingToCardinal(bearing)
		});
	});

	function sleep(ms: number): Promise<void> {
		return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
	}

	function captureFromPublishedPosition(): GpsCapture | null {
		const published = getPublishedUserPosition();
		const updatedAt = getPublishedUserPositionUpdatedAt();
		if (!published || updatedAt === null) return null;
		if (Date.now() - updatedAt > PARKING_PUBLISHED_MAX_AGE_MS) return null;
		return {
			latitude: published.latitude,
			longitude: published.longitude,
			accuracyMeters: published.accuracyMeters,
			altitudeMeters: published.altitudeMeters
		};
	}

	function isUsableCapture(capture: GpsCapture | null): capture is GpsCapture {
		return (
			capture !== null && capture.latitude !== null && capture.longitude !== null
		);
	}

	function considerCapture(candidate: GpsCapture | null, best: GpsCapture | null): GpsCapture | null {
		if (!isUsableCapture(candidate)) return best;
		if (!isUsableCapture(best)) return candidate;
		if (isBetterAccuracy(candidate.accuracyMeters, best.accuracyMeters)) {
			return candidate;
		}
		return best;
	}

	async function resolveParkingCapturePrecise(): Promise<GpsCapture> {
		const deadline = Date.now() + PARKING_GPS_WAIT_MS;
		let best: GpsCapture | null = null;

		while (Date.now() < deadline) {
			const published = captureFromPublishedPosition();
			best = considerCapture(published, best);

			if (!published) {
				const fresh = await getCoordinates();
				best = considerCapture(fresh, best);
			}

			liveAccuracyMeters = best?.accuracyMeters ?? null;

			if (isUsableCapture(best) && !isPoorAccuracy(best.accuracyMeters)) {
				return best;
			}

			await sleep(PARKING_GPS_POLL_MS);
		}

		if (isUsableCapture(best)) {
			return best;
		}

		return {
			latitude: null,
			longitude: null,
			accuracyMeters: null,
			altitudeMeters: null
		};
	}

	function openPanel() {
		expanded = true;
		warning = '';
		void hapticLight();
	}

	function closePanel() {
		if (saving) return;
		expanded = false;
		warning = '';
		saveError = null;
		liveAccuracyMeters = null;
	}

	async function handleSave() {
		saving = true;
		warning = '';
		saveError = null;
		liveAccuracyMeters = null;

		try {
			const capture = await resolveParkingCapturePrecise();
			if (capture.latitude === null || capture.longitude === null) {
				saveError = mapRecenterGpsCopy();
				return;
			}

			const approximate = isPoorAccuracy(capture.accuracyMeters);
			if (approximate) {
				warning = m.gps_poor_warning({ accuracy: formatAccuracy(capture.accuracyMeters) });
			}

			await saveParking(capture);
			expanded = false;
			liveAccuracyMeters = null;

			if (approximate) {
				showOkToast(
					m.parking_saved_approximate({ accuracy: formatAccuracy(capture.accuracyMeters) })
				);
			}
		} catch (error) {
			saveError = resolveErrorCopy(error, parkingSaveFailedCopy());
		} finally {
			saving = false;
		}
	}

	async function handleClear() {
		await clearParking();
		warning = '';
		saveError = null;
		expanded = false;
		liveAccuracyMeters = null;
		void hapticSelection();
	}

	const showEmptyOverlayChip = $derived(variant === 'overlay' && !parking && !expanded);
	const showEmptyPanel = $derived(!parking && (variant === 'inline' || expanded));
	const showSavedOverlayChip = $derived(
		variant === 'overlay' && Boolean(parking) && !expanded && !saving
	);

	const chipDistanceLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!parking) return '';
		if (distance === null || bearing === null) {
			return m.parking_calculating();
		}
		return `${formatDistance(distance)} · ${headingToCardinal(bearing)}`;
	});
</script>

{#snippet compassNeedle()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		class="origin-center h-9 w-9 shrink-0"
		style:transform="rotate({displayRotation}deg)"
		aria-hidden="true"
	>
		<circle cx="12" cy="12" r="10" />
		<path d="M12 8l3 8-3-2-3 2 3-8z" fill="currentColor" stroke="none" />
	</svg>
{/snippet}

{#if showEmptyOverlayChip}
	<div class="flex w-full flex-col items-end gap-2">
		<button
			type="button"
			onclick={openPanel}
			class="btn-primary btn-primary--inline !h-16 gap-2 text-sm shadow-md"
			aria-label={m.parking_save()}
			aria-expanded="false"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-5 w-5 shrink-0"
				aria-hidden="true"
			>
				<path
					d="M5 17h14v-5H5v5zM5 10l2-4h10l2 4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<circle cx="7.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
				<circle cx="16.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
			</svg>
			{m.parking_save_short()}
		</button>
	</div>
{:else if showSavedOverlayChip}
	<div class="flex w-full flex-col items-end gap-2">
		<div class="flex h-16 overflow-hidden rounded-lg border border-forest-700 shadow-md">
			<button
				type="button"
				onclick={openPanel}
				class="flex max-w-[11rem] items-center bg-white/95 px-3 text-sm font-semibold text-forest-900 backdrop-blur-sm"
				aria-expanded="false"
				aria-label={statusText}
			>
				<span class="block truncate">{chipDistanceLabel}</span>
			</button>
			<a
				href={resolve('/parking/compass')}
				class="btn-primary flex !h-16 !w-16 !rounded-none items-center justify-center"
				aria-label={compassLabel}
			>
				{@render compassNeedle()}
			</a>
		</div>
	</div>
{:else}
	<div
		class={variant === 'overlay'
			? 'app-card w-full bg-white/95 p-2 backdrop-blur-sm'
			: 'app-card p-4'}
	>
		{#if showEmptyPanel}
			{#if saving}
				<div
					class="mb-2 rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-center"
					role="status"
					aria-live="polite"
				>
					<p class="flex items-center justify-center gap-2 text-sm font-medium text-forest-900">
						<span
							class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700"
							aria-hidden="true"
						></span>
						{m.parking_waiting_gps()}
					</p>
					<p class="mt-1 text-xs text-muted">{m.gps_waiting_online()}</p>
					{#if liveAccuracyMeters !== null}
						<p class="mt-1 text-xs font-medium text-forest-800">
							{formatAccuracy(liveAccuracyMeters)}
						</p>
					{/if}
				</div>
			{/if}

			<button
				type="button"
				onclick={handleSave}
				disabled={saving}
				class="btn-primary !h-14 gap-2 text-sm"
				aria-label={m.parking_save()}
				aria-expanded={variant === 'overlay' ? true : undefined}
			>
				{#if saving}
					<span
						class="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
						aria-hidden="true"
					></span>
					{m.parking_waiting_gps()}
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="h-5 w-5 shrink-0"
						aria-hidden="true"
					>
						<path
							d="M5 17h14v-5H5v5zM5 10l2-4h10l2 4"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<circle cx="7.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
						<circle cx="16.5" cy="17" r="1.5" fill="currentColor" stroke="none" />
					</svg>
					{m.parking_save()}
				{/if}
			</button>

			{#if variant === 'overlay'}
				<button
					type="button"
					onclick={closePanel}
					disabled={saving}
					class="btn-secondary mt-2 !h-10 text-xs"
				>
					{m.action_close()}
				</button>
			{/if}
		{:else if parking}
			{#if saving}
				<div
					class="mb-2 rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-center"
					role="status"
					aria-live="polite"
				>
					<p class="flex items-center justify-center gap-2 text-sm font-medium text-forest-900">
						<span
							class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700"
							aria-hidden="true"
						></span>
						{m.parking_waiting_gps()}
					</p>
					<p class="mt-1 text-xs text-muted">{m.gps_waiting_online()}</p>
					{#if liveAccuracyMeters !== null}
						<p class="mt-1 text-xs font-medium text-forest-800">
							{formatAccuracy(liveAccuracyMeters)}
						</p>
					{/if}
				</div>
			{:else}
				<p
					class="text-center font-medium text-forest-900 {variant === 'overlay'
						? 'text-xs'
						: 'text-sm'}"
				>
					{statusText}
				</p>
			{/if}

			<div class="mt-2 grid grid-cols-2 gap-2">
				<a
					href={resolve('/parking/compass')}
					class="btn-primary col-span-2 gap-2 text-sm {variant === 'overlay' ? '!h-11' : ''}"
				>
					{@render compassNeedle()}
					{compassLabel}
				</a>
				<button
					type="button"
					onclick={handleSave}
					disabled={saving}
					class="btn-secondary !h-10 text-xs"
				>
					{saving ? m.parking_waiting_gps() : m.parking_resave()}
				</button>
				<button
					type="button"
					onclick={handleClear}
					disabled={saving}
					class="btn-secondary !h-10 text-xs text-muted"
				>
					{m.action_clear()}
				</button>
			</div>

			{#if variant === 'overlay'}
				<button
					type="button"
					onclick={closePanel}
					disabled={saving}
					class="btn-secondary mt-2 !h-10 text-xs"
				>
					{m.action_close()}
				</button>
			{/if}
		{/if}

		{#if saveError}
			<div class="mt-2">
				<ErrorBanner copy={saveError} onretry={() => void handleSave()} />
			</div>
		{/if}
		{#if warning}
			<p class="mt-2 text-center text-xs text-amber-800" role="status">{warning}</p>
		{/if}
	</div>
{/if}
