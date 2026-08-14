<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CompassTarget } from '$lib/types/compass';
	import { getCoverPhotoThumb, type Tree } from '$lib/types/tree';
	import CompassDial from '$lib/components/CompassDial.svelte';
	import CompassNavArrow from '$lib/components/CompassNavArrow.svelte';
	import TopoMapLazy from '$lib/components/TopoMapLazy.svelte';
	import AppLogoImage from './AppLogoImage.svelte';
	import {
		formatDistance,
		haversineBearingDeg,
		haversineDistanceM,
		magneticToTrueHeading,
		normalizeHeading360,
		shortestAngleDelta,
		smoothBearing
	} from '$lib/utils/haversine';
	import { shouldUpdateCompassPosition } from '$lib/utils/compassPosition';
	import {
		createHeadingStabilityState,
		headingToCardinal,
		resetHeadingStabilityState,
		updateHeadingStability
	} from '$lib/utils/compass';
	import type { GpsProfile } from '$lib/utils/geo';
	import { formatAccuracy } from '$lib/utils/gps';
	import { loadMagneticDeclinationDeg } from '$lib/utils/magneticDeclination';
	import {
		createHeadingFusionState,
		processHeadingFusion,
		resetHeadingFusionState
	} from '$lib/utils/headingFusion';
	import {
		requestFusedHeadingPermission,
		subscribeFusedHeading
	} from '$lib/utils/headingProvider';
	import {
		acquireLocationWatch,
		requestCurrentPosition,
		userPositionState
	} from '$lib/utils/userPosition.svelte';
	import { hapticSuccess } from '$lib/utils/haptics';
	import { isNativeApp } from '$lib/utils/platform';
	import { acquireScreenWakeLock, releaseScreenWakeLock } from '$lib/utils/wakeLock';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import {
		compassSettingsState,
		initCompassSettings
	} from '$lib/stores/compassSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { App } from '@capacitor/app';
	import { untrack } from 'svelte';

	type CompassViewMode = 'compass' | 'map';

	const VIEW_MODE_STORAGE_KEY = 'yamadori-compass-view-mode';
	const HEADING_LOCK_STORAGE_KEY = 'yamadori-compass-heading-lock';
	const DISPLAY_ROTATION_DEADBAND_DEG = 0.5;

	function readStoredViewMode(): CompassViewMode {
		if (typeof sessionStorage === 'undefined') {
			return 'compass';
		}
		const stored = sessionStorage.getItem(VIEW_MODE_STORAGE_KEY);
		return stored === 'map' ? 'map' : 'compass';
	}

	function readStoredHeadingLock(): boolean {
		if (typeof sessionStorage === 'undefined') {
			return false;
		}
		return sessionStorage.getItem(HEADING_LOCK_STORAGE_KEY) === 'true';
	}

	let {
		target,
		focusTreeId,
		focusCenter,
		trackedTree
	}: {
		target: CompassTarget;
		focusTreeId?: string;
		focusCenter?: { latitude: number; longitude: number };
		trackedTree?: Pick<Tree, 'id' | 'photos' | 'photoThumbs' | 'locationLabel' | 'species'>;
	} = $props();

	const fusionState = createHeadingFusionState();
	const stabilityState = createHeadingStabilityState();
	let sensorHeadingRaw = $state<number | null>(null);
	let sensorReference = $state<'true' | 'magnetic'>('true');
	let orientationEnabled = $state(false);
	let orientationError = $state('');
	let smoothedBearing = $state<number | null>(null);
	let lastBearingPosition = $state<{ latitude: number; longitude: number } | null>(null);
	let displayRotation = $state(0);
	let declinationDeg = $state<number | null>(null);
	let wasAligned = $state(false);
	let viewMode = $state<CompassViewMode>(readStoredViewMode());
	let headingLocked = $state(readStoredHeadingLock());
	let orientationAttempt = $state(0);
	let sensorUnstable = $state(false);

	let needleColor = $derived(appearanceSettingsState.outdoorMode ? '#000000' : '#2d4a2d');

	const compassLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_compass_title().replace(/\s*\([^)]*\)$/, '');
	});

	const distance = $derived.by(() => {
		const position = userPositionState.position;
		if (!position || target.latitude === null || target.longitude === null) {
			return null;
		}
		return haversineDistanceM(
			position.latitude,
			position.longitude,
			target.latitude,
			target.longitude
		);
	});

	const distanceLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return distance === null ? '' : formatDistance(distance);
	});

	const declinationGridKey = $derived.by(() => {
		const position = userPositionState.position;
		if (!position) {
			return null;
		}
		return `${position.latitude.toFixed(3)},${position.longitude.toFixed(3)}`;
	});

	let mapFocusCenter = $derived.by(() => {
		if (focusCenter) {
			return focusCenter;
		}
		if (target.latitude !== null && target.longitude !== null) {
			return { latitude: target.latitude, longitude: target.longitude };
		}
		return undefined;
	});

	$effect(() => {
		if (typeof sessionStorage === 'undefined') {
			return;
		}
		sessionStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
	});

	$effect(() => {
		if (typeof sessionStorage === 'undefined') {
			return;
		}
		sessionStorage.setItem(HEADING_LOCK_STORAGE_KEY, String(headingLocked));
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
		const position = userPositionState.position;
		if (!position || target.latitude === null || target.longitude === null) {
			untrack(() => {
				smoothedBearing = null;
				lastBearingPosition = null;
			});
			return;
		}

		const previousPosition = untrack(() => lastBearingPosition);
		if (!shouldUpdateCompassPosition(previousPosition, position)) {
			return;
		}

		const nextBearing = haversineBearingDeg(
			position.latitude,
			position.longitude,
			target.latitude,
			target.longitude
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

	let bearing = $derived(smoothedBearing);

	let coverPhoto = $derived(trackedTree ? getCoverPhotoThumb(trackedTree) : '');

	let coverPhotoAlt = $derived.by(() => {
		void appearanceSettingsState.locale;
		return `${m.photo_label()} — ${target.label}`;
	});

	let bearingLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (bearing === null) {
			return null;
		}
		const degrees = Math.round(bearing);
		return m.compass_bearing({
			degrees: String(degrees),
			cardinal: headingToCardinal(degrees)
		});
	});

	let accuracyMeters = $derived(userPositionState.position?.accuracyMeters ?? null);

	let accuracyLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (accuracyMeters === null) {
			return null;
		}
		return formatAccuracy(accuracyMeters);
	});

	let treeDetailHref = $derived(
		trackedTree ? resolve('/tree/[id]', { id: trackedTree.id }) : ''
	);

	let treeDetailAria = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.tree_view_detail({ label: target.label });
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

	let headingResult = $derived.by(() => {
		const position = userPositionState.position;
		const value = processHeadingFusion(fusionState, {
			sensorHeading: trueSensorHeading,
			gpsHeading: position?.courseDegrees ?? null,
			speedMps: position?.speedMps ?? null
		});
		return { value, source: fusionState.activeSource };
	});

	let heading = $derived(headingResult.value);
	let activeHeadingSource = $derived(headingResult.source);

	let headingQualityLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!orientationEnabled || heading === null) {
			return null;
		}
		if (activeHeadingSource === 'gps') {
			return m.compass_source_gps();
		}
		if (sensorUnstable) {
			return m.compass_unstable();
		}
		return m.compass_source_sensor();
	});

	let arrowRotation = $derived.by(() => {
		if (bearing === null) return 0;
		if (heading !== null) return normalizeHeading360(bearing - heading);
		return bearing;
	});

	let isNavAligned = $derived(
		Math.abs(shortestAngleDelta(0, normalizeHeading360(displayRotation))) <= 5
	);

	$effect(() => {
		const targetRotation = arrowRotation;
		const current = untrack(() => displayRotation);
		const delta = shortestAngleDelta(current, targetRotation);
		if (Math.abs(delta) >= DISPLAY_ROTATION_DEADBAND_DEG) {
			displayRotation = current + delta;
		}
	});

	$effect(() => {
		const aligned = Math.abs(shortestAngleDelta(0, normalizeHeading360(displayRotation))) <= 5;
		if (aligned && orientationEnabled && !wasAligned) {
			wasAligned = true;
			void hapticSuccess();
		} else if (!aligned) {
			wasAligned = false;
		}
	});

	$effect(() => {
		void acquireScreenWakeLock();
		return () => {
			void releaseScreenWakeLock();
		};
	});

	$effect(() => {
		void initCompassSettings();
	});

	$effect(() => {
		// Heading lock drives the map camera from device heading — keep high-rate
		// navigation GPS. Otherwise honor Settings → compass GPS profile.
		const profile: GpsProfile = headingLocked
			? 'navigation'
			: compassSettingsState.gpsProfile;
		void requestCurrentPosition(profile);
		const release = acquireLocationWatch('compass', profile);
		return () => release();
	});

	$effect(() => {
		void orientationAttempt;
		let stop: (() => void) | null = null;
		let cancelled = false;
		let permissionGranted = false;
		let appActive = typeof document === 'undefined' || document.visibilityState === 'visible';

		const startSubscription = () => {
			if (cancelled || !permissionGranted || !appActive || stop) {
				return;
			}
			orientationError = '';
			orientationEnabled = true;
			stop = subscribeFusedHeading((sample) => {
				sensorHeadingRaw = sample.heading;
				sensorReference = sample.reference;
				sensorUnstable = updateHeadingStability(stabilityState, sample.heading);
			});
		};

		const pauseSubscription = () => {
			stop?.();
			stop = null;
			sensorHeadingRaw = null;
			orientationEnabled = false;
			resetHeadingStabilityState(stabilityState);
			sensorUnstable = false;
		};

		const handleAppActiveChange = (isActive: boolean) => {
			appActive = isActive;
			if (appActive) {
				startSubscription();
			} else {
				pauseSubscription();
			}
		};

		const handleVisibilityChange = () => {
			if (typeof document === 'undefined') {
				return;
			}
			handleAppActiveChange(document.visibilityState === 'visible');
		};

		void requestFusedHeadingPermission().then((granted) => {
			if (cancelled) {
				return;
			}
			if (!granted) {
				orientationError = m.compass_permission_denied();
				orientationEnabled = false;
				return;
			}
			permissionGranted = true;
			startSubscription();
		});

		if (typeof document !== 'undefined') {
			document.addEventListener('visibilitychange', handleVisibilityChange);
		}

		let removeAppListener: (() => void) | undefined;
		if (isNativeApp()) {
			void App.addListener('appStateChange', ({ isActive }) => {
				handleAppActiveChange(isActive);
			}).then((handle) => {
				if (cancelled) {
					void handle.remove();
					return;
				}
				removeAppListener = () => {
					void handle.remove();
				};
			});
		}

		return () => {
			cancelled = true;
			if (typeof document !== 'undefined') {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
			}
			removeAppListener?.();
			pauseSubscription();
			resetHeadingFusionState(fusionState);
		};
	});

	async function retryOrientation() {
		orientationError = '';
		orientationAttempt += 1;
	}

	function toggleViewMode() {
		viewMode = viewMode === 'compass' ? 'map' : 'compass';
	}

	function toggleHeadingLock() {
		headingLocked = !headingLocked;
	}
</script>

{#if target.latitude === null || target.longitude === null}
	<div class="flex flex-col items-center gap-6 py-6">
		<p class="text-center text-muted">{m.compass_no_gps()}</p>
	</div>
{:else if viewMode === 'map'}
	<div
		class="relative -mx-4 -my-6 flex h-[calc(100dvh-3.5rem)] min-h-0 flex-1 flex-col overflow-hidden md:-mx-6"
	>
		<div class="absolute inset-x-4 top-3 z-40 flex items-start justify-between gap-2">
			<div class="app-card bg-white/95 px-3 py-2 backdrop-blur-sm">
				<p class="text-sm font-semibold text-forest-900">{target.label}</p>
				{#if distance !== null}
					<p class="text-xs font-medium text-forest-800">{distanceLabel}</p>
				{/if}
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<button
					type="button"
					onclick={toggleHeadingLock}
					class="flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] border px-3 text-sm font-semibold backdrop-blur-sm transition active:scale-[0.98] {headingLocked
						? 'border-forest-600 bg-forest-800 text-white'
						: 'app-card border-0 bg-white/95 text-forest-900'}"
					aria-pressed={headingLocked}
					title={headingLocked ? m.compass_north_up() : m.compass_lock_heading()}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="h-4 w-4"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="9" />
						<path d="M12 3v3M12 18v3M12 12l3.5 6" stroke-linecap="round" />
					</svg>
					{headingLocked ? m.compass_cardinal_n() : m.compass_lock_heading()}
				</button>
				<button
					type="button"
					onclick={toggleViewMode}
					class="app-card flex h-10 items-center gap-1.5 border-0 bg-white/95 px-3 text-sm font-semibold text-forest-900 backdrop-blur-sm transition active:scale-[0.98]"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="h-4 w-4"
						aria-hidden="true"
					>
						<path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round" />
						<path d="M7 6v12M13 10v8M19 8v10" stroke-linecap="round" />
					</svg>
					{compassLabel}
				</button>
			</div>
		</div>

		<TopoMapLazy
			{focusTreeId}
			focusCenter={mapFocusCenter}
			embedded
			externalGpsWatch
			deviceHeading={heading}
			headingLock={headingLocked}
		/>

		{#if headingLocked}
			<div class="pointer-events-none absolute inset-x-0 bottom-8 z-40 flex flex-col items-center gap-2">
				<CompassNavArrow {needleColor} aligned={isNavAligned && orientationEnabled} />
				{#if !isNavAligned && orientationEnabled}
					<p class="rounded-lg bg-white/90 px-2 py-1 text-[11px] font-medium text-muted shadow-sm">
						{m.compass_align_line()}
					</p>
				{/if}
			</div>
		{/if}

		{#if orientationError}
			<div class="absolute inset-x-4 bottom-32 z-40">
				<button
					type="button"
					onclick={retryOrientation}
					class="app-card w-full border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900"
				>
					{orientationError}
				</button>
			</div>
		{/if}
	</div>
{:else}
	<div class="flex flex-col items-center gap-6 py-6">
		<div class="flex w-full max-w-sm items-start justify-between gap-3 px-4">
			<div class="min-w-0 flex-1 text-center">
				<h2 class="text-xl font-semibold text-forest-900">{target.label}</h2>
				{#if distance !== null}
					<p class="mt-2 text-2xl font-semibold text-forest-800">{distanceLabel}</p>
				{:else}
					<p class="mt-2 text-sm text-muted">{m.compass_calculating()}</p>
				{/if}
			</div>
			<button
				type="button"
				onclick={toggleViewMode}
				class="btn-secondary !h-10 !w-auto shrink-0 gap-1.5 px-3 text-sm font-semibold"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="h-4 w-4"
					aria-hidden="true"
				>
					<path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round" />
					<path d="M7 6v12M13 10v8M19 8v10" stroke-linecap="round" />
				</svg>
				{m.nav_map()}
			</button>
		</div>

		<CompassDial {displayRotation} {needleColor} />

		{#if headingQualityLabel}
			<p
				class="max-w-sm px-4 text-center text-xs {sensorUnstable && activeHeadingSource === 'sensor'
					? 'font-medium text-amber-800'
					: 'text-muted'}"
			>
				{headingQualityLabel}
			</p>
		{/if}

		{#if trackedTree}
			<a
				href={treeDetailHref}
				class="mx-4 w-full max-w-sm transition active:scale-[0.98]"
				aria-label={treeDetailAria}
			>
				<article class="app-card flex items-center gap-4 p-4">
					<div class="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
						{#if coverPhoto}
							<img
								src={coverPhoto}
								alt={coverPhotoAlt}
								class="h-full w-full object-cover"
								loading="lazy"
								decoding="async"
							/>
						{:else}
							<AppLogoImage class="h-full w-full object-cover" />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						{#if bearingLabel}
							<p class="text-lg font-semibold tabular-nums text-forest-900">{bearingLabel}</p>
						{/if}
						{#if accuracyLabel}
							<p class="mt-0.5 text-sm text-muted">{accuracyLabel}</p>
						{/if}
						{#if trackedTree.locationLabel}
							<p class="mt-1 truncate text-xs text-muted">{trackedTree.locationLabel}</p>
						{/if}
					</div>
				</article>
			</a>
		{/if}

		{#if orientationError}
			<button
				type="button"
				onclick={retryOrientation}
				class="rounded-xl border border-amber-200 bg-amber-50 px-6 py-3 text-center text-sm text-amber-900"
			>
				{orientationError}
			</button>
		{/if}

		{#if userPositionState.error}
			<p class="text-center text-sm text-amber-800">{userPositionState.error}</p>
		{/if}
	</div>
{/if}
