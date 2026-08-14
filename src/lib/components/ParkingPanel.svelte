<script lang="ts">
	import { resolve } from '$app/paths';
	import { clearParking, parkingStore, saveParking } from '$lib/stores/parking.svelte';
	import { showErrorToast, showOkToast } from '$lib/stores/appToast.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { headingToCardinal } from '$lib/utils/compass';
	import { getCoordinates, type GpsCapture } from '$lib/utils/geo';
	import { formatAccuracy, isBetterAccuracy, isPoorAccuracy } from '$lib/utils/gps';
	import {
		formatDistance,
		haversineBearingDeg,
		haversineDistanceM
	} from '$lib/utils/haversine';
	import { hapticLight, hapticSelection } from '$lib/utils/haptics';
	import {
		getPublishedUserPosition,
		getPublishedUserPositionUpdatedAt
	} from '$lib/utils/userPosition.svelte';
	import * as m from '$lib/paraglide/messages.js';

	const PARKING_PUBLISHED_MAX_AGE_MS = 15_000;
	const PARKING_GPS_WAIT_MS = 20_000;
	const PARKING_GPS_POLL_MS = 500;

	let {
		variant = 'overlay'
	}: {
		variant?: 'overlay' | 'inline';
	} = $props();

	let expanded = $state(false);
	let saving = $state(false);
	let warning = $state('');
	let liveAccuracyMeters = $state<number | null>(null);

	let parking = $derived(parkingStore.position);

	const compassLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_compass_title().replace(/\s*\([^)]*\)$/, '');
	});

	let distance = $derived.by(() => {
		const position = getPublishedUserPosition();
		if (!parking || !position) return null;
		return haversineDistanceM(
			position.latitude,
			position.longitude,
			parking.latitude,
			parking.longitude
		);
	});

	let bearing = $derived.by(() => {
		const position = getPublishedUserPosition();
		if (!parking || !position) return null;
		return haversineBearingDeg(
			position.latitude,
			position.longitude,
			parking.latitude,
			parking.longitude
		);
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
		liveAccuracyMeters = null;
	}

	async function handleSave() {
		saving = true;
		warning = '';
		liveAccuracyMeters = null;

		try {
			const capture = await resolveParkingCapturePrecise();
			if (capture.latitude === null || capture.longitude === null) {
				showErrorToast(m.parking_gps_unavailable());
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
			} else {
				showOkToast(m.parking_saved());
			}
		} finally {
			saving = false;
		}
	}

	async function handleClear() {
		await clearParking();
		warning = '';
		expanded = false;
		liveAccuracyMeters = null;
		void hapticSelection();
	}

	const showEmptyOverlayChip = $derived(variant === 'overlay' && !parking && !expanded);
	const showEmptyPanel = $derived(!parking && (variant === 'inline' || expanded));
</script>

{#if showEmptyOverlayChip}
	<div class="flex w-full flex-col items-end gap-2">
		<button
			type="button"
			onclick={openPanel}
			class="btn-primary btn-primary--inline !h-12 gap-2 text-sm shadow-md"
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
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="h-5 w-5"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M12 8l3 8-3-2-3 2 3-8z" fill="currentColor" stroke="none" />
					</svg>
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
		{/if}

		{#if warning}
			<p class="mt-2 text-center text-xs text-amber-800" role="status">{warning}</p>
		{/if}
	</div>
{/if}
