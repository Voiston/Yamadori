<script lang="ts">
	import { DEFAULT_ASSESSMENT, type TreeAssessment, type VoiceNote } from '$lib/types/tree';
	import type { ClimateHistory } from '$lib/types/climate';
	import { DEFAULT_ENVIRONMENT_EXPOSURE, type EnvironmentExposure } from '$lib/types/environment';
	import { addTree } from '$lib/stores/trees.svelte';
	import { agriData } from '$lib/stores/agriData.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { goHome } from '$lib/utils/app-navigation';
	import { fetchClimateHistory } from '$lib/utils/climate';
	import { loadAgriData, resetAgriData } from '$lib/stores/agriData.svelte';
	import { reverseGeocode } from '$lib/utils/geocoding';
	import { lookupCadastre } from '$lib/utils/cadastre';
	import { scheduleCadastreBackfill } from '$lib/utils/cadastreBackfill';
	import { ensureCapturePositionForSave } from '$lib/utils/capture-save-position';
	import type { CadastreInfo } from '$lib/types/cadastre';
	import {
		formatFrontLabel
	} from '$lib/utils/compass';
	import {
		createHeadingFusionState,
		processHeadingFusion,
		resetHeadingFusionState
	} from '$lib/utils/headingFusion';
	import {
		requestFusedHeadingPermission,
		subscribeFusedHeading
	} from '$lib/utils/headingProvider';
	import { magneticToTrueHeading } from '$lib/utils/haversine';
	import { loadMagneticDeclinationDeg } from '$lib/utils/magneticDeclination';
	import { haversineDistanceM } from '$lib/utils/haversine';
	import GpsAccuracyBadge from './GpsAccuracyBadge.svelte';
	import GpsStatusCompact from './GpsStatusCompact.svelte';
	import { shouldConfirmGpsBeforeSave } from '$lib/utils/capture-gps-confirm';
	import { formatAccuracy, isBetterAccuracy, isPoorAccuracy } from '$lib/utils/gps';
	import { GPS_EXCELLENT_ACCURACY_THRESHOLD_M, type GpsProfile } from '$lib/utils/geo';
	import {
		getAndroidVolumeButtonHint,
		getGpsCaptureReadyHint,
		getGpsCaptureTips,
		getGpsCaptureWaitingHint
	} from '$lib/utils/gps-capture';
	import { onlineState } from '$lib/utils/online.svelte';
	import {
		acquireLocationWatch,
		getLastGpsUpdateAt,
		requestCurrentPosition,
		resetPositionSmoothing,
		getSmoothedAltitudeMeters,
		userPositionState
	} from '$lib/utils/userPosition.svelte';
	import { compressImageWithFallback } from '$lib/utils/photo';
	import { getCaliberOptions, getNebariOptions } from '$lib/constants/assessment';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import * as m from '$lib/paraglide/messages.js';
	import { getSpeciesSuggestionsForPosition } from '$lib/utils/species-suggestions';
	import { onMount, tick, untrack } from 'svelte';
	import { debugCounters, debugLog, resetVisitDebugCounters } from '$lib/utils/debug-log';
	import { captureFormRoot } from '$lib/utils/native-touch';
	import { isAndroidApp } from '$lib/utils/platform';
	import { hapticSuccess } from '$lib/utils/haptics';
	import { toYrsStoredSnapshot } from '$lib/utils/yrs';
	import { startVolumeButtonWatch, stopVolumeButtonWatch } from '$lib/utils/volumeButtons';
	import SpeciesAutocomplete from './SpeciesAutocomplete.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import PhotoPreview from './PhotoPreview.svelte';
	import VoiceNoteRecorder from './VoiceNoteRecorder.svelte';
	import YrsScoreBanner from './YrsScoreBanner.svelte';
	import CadastreBanner from './CadastreBanner.svelte';
	import VetoLegalChecklist from './VetoLegalChecklist.svelte';
	import ClimateDataSection from './ClimateDataSection.svelte';
	import EnvironmentExposureField from './EnvironmentExposureField.svelte';

	let species = $state('');
	let notes = $state('');
	let environmentExposure = $state<EnvironmentExposure>(DEFAULT_ENVIRONMENT_EXPOSURE);
	let voiceNote = $state<VoiceNote | null>(null);
	let photoFile = $state<File | null>(null);
	let photoPreviewUrl = $state('');
	let submitting = $state(false);
	let gpsChecking = $state(false);
	let gpsWarning = $state('');
	let gpsSuccess = $state('');
	let error = $state('');

	const nebariOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getNebariOptions();
	});

	const caliberOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getCaliberOptions();
	});

	const capturePosition = $derived.by(() => {
		const pos = userPositionState.position;
		if (!pos) {
			return null;
		}
		return {
			latitude: pos.latitude,
			longitude: pos.longitude,
			altitudeMeters: pos.altitudeMeters,
			accuracyMeters: pos.accuracyMeters,
			courseDegrees: pos.courseDegrees,
			speedMps: pos.speedMps
		};
	});

	let bestCapturePosition = $state<{
		latitude: number;
		longitude: number;
		altitudeMeters: number | null;
		accuracyMeters: number | null;
		courseDegrees: number | null;
		speedMps: number | null;
	} | null>(null);
	let gpsLoading = $state(true);
	let climateHistory = $state<ClimateHistory | null>(null);
	let climateLoading = $state(false);
	let climateError = $state('');
	let locationLabel = $state<string | null>(null);
	let locationLoading = $state(false);
	let frontHeadingDegrees = $state<number | null>(null);
	let declinationDeg = $state<number | null>(null);
	const fusionState = createHeadingFusionState();
	let sensorHeadingRaw = $state<number | null>(null);
	let sensorReference = $state<'true' | 'magnetic'>('true');
	let speciesFeedback = $state('');
	let speciesHighlight = $state(false);
	let displayedSpecies = $state<string[]>([]);
	let climateAnchor = $state<{ latitude: number; longitude: number } | null>(null);
	let agriFetchAnchor = $state<{ latitude: number; longitude: number } | null>(null);
	let lastAgriInputsKey = $state('');
	let climateAutoFetchKey = $state('');
	let climateLocked = $state(false);
	let climateFetchedApproximate = $state(false);
	let locationFetchKey = $state('');
	let locationAnchor = $state<{ latitude: number; longitude: number } | null>(null);
	let cadastreInfo = $state<CadastreInfo | null>(null);
	let cadastreLoading = $state(false);
	let cadastreFetchKey = $state('');
	let vetoChecklistOpen = $state(false);
	let submitLock = $state(false);
	let climateFetchInFlight = false;
	let showGpsConfirm = $state(false);
	let gpsConfirmMessage = $state('');

	const CAPTURE_IDLE_SPEED_MPS = 0.5;
	const CAPTURE_IDLE_MS = 10_000;
	let captureGpsProfile = $state<GpsProfile>('capture');
	let captureIdleSince = $state<number | null>(null);
	let quickAssessmentOpen = $state(false);
	let quickAssessment = $state<TreeAssessment>({ ...DEFAULT_ASSESSMENT });
	let photoPreviewRef = $state<PhotoPreview | undefined>();
	let voiceRecorderRef = $state<VoiceNoteRecorder | undefined>();
	let voiceSessionActive = $state(false);

	const CLIMATE_REFETCH_DISTANCE_M = 10;
	const LOCATION_REFETCH_DISTANCE_M = 10;
	const AGRI_REFETCH_DISTANCE_M = 10;

	function positionKey(latitude: number, longitude: number): string {
		return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
	}

	const simpleMode = $derived(appearanceSettingsState.simpleMode);

	$effect(() => {
		if (simpleMode) {
			vetoChecklistOpen = false;
		}
	});

	const savedPosition = $derived(bestCapturePosition ?? capturePosition);

	const showBestPositionHint = $derived.by(() => {
		if (simpleMode) return false;
		if (!bestCapturePosition || !capturePosition) {
			return false;
		}
		const best = bestCapturePosition.accuracyMeters;
		const live = capturePosition.accuracyMeters;
		return best !== null && live !== null && best < live;
	});

	const gpsCaptureHint = $derived.by(() => {
		if (simpleMode) return '';
		if (gpsLoading) {
			return getGpsCaptureWaitingHint(onlineState.online);
		}
		if (savedPosition) {
			return getGpsCaptureReadyHint(onlineState.online, savedPosition.accuracyMeters);
		}
		return '';
	});

	const gpsCaptureTips = $derived(simpleMode ? [] : getGpsCaptureTips());
	const androidVolumeHint = $derived(
		!simpleMode && isAndroidApp() ? getAndroidVolumeButtonHint() : null
	);

	$effect(() => {
		const position = savedPosition;
		if (!position) {
			declinationDeg = null;
			return;
		}

		let cancelled = false;
		void loadMagneticDeclinationDeg(position.latitude, position.longitude).then((decl) => {
			if (!cancelled) {
				declinationDeg = decl;
			}
		});

		return () => {
			cancelled = true;
		};
	});

	const currentHeading = $derived.by(() => {
		let trueSensor: number | null = sensorHeadingRaw;
		if (trueSensor !== null && sensorReference === 'magnetic' && declinationDeg !== null) {
			trueSensor = magneticToTrueHeading(trueSensor, declinationDeg);
		}
		return processHeadingFusion(fusionState, {
			sensorHeading: trueSensor,
			gpsHeading: capturePosition?.courseDegrees ?? null,
			speedMps: capturePosition?.speedMps ?? null
		});
	});

	$effect(() => {
		let stop: (() => void) | null = null;
		let cancelled = false;

		void requestFusedHeadingPermission().then((granted) => {
			if (!granted || cancelled) {
				return;
			}
			stop = subscribeFusedHeading((sample) => {
				sensorHeadingRaw = sample.heading;
				sensorReference = sample.reference;
			});
		});

		return () => {
			cancelled = true;
			stop?.();
			sensorHeadingRaw = null;
			resetHeadingFusionState(fusionState);
		};
	});

	const suggestions = $derived.by(() => {
		if (!savedPosition) {
			return { regions: [], species: [] as string[] };
		}
		return getSpeciesSuggestionsForPosition(
			savedPosition.latitude,
			savedPosition.longitude
		);
	});

	$effect(() => {
		const speciesList = suggestions.species;
		if (speciesList.length === 0) {
			return;
		}
		const nextKey = JSON.stringify(speciesList);
		if (nextKey !== JSON.stringify(displayedSpecies)) {
			displayedSpecies = speciesList;
		}
	});

	const frontLabel = $derived(formatFrontLabel(frontHeadingDegrees));

	const showClimatePanel = $derived(savedPosition !== null);

	$effect(() => {
		if (simpleMode) return;
		const position = savedPosition;
		const currentSpecies = species;
		const currentExposure = environmentExposure;
		if (!position) return;

		const inputsKey = `${currentSpecies}|${currentExposure}`;
		const movedEnough = shouldRefetchAgri(position);
		if (!movedEnough && inputsKey === lastAgriInputsKey) return;

		lastAgriInputsKey = inputsKey;
		if (movedEnough) {
			agriFetchAnchor = { latitude: position.latitude, longitude: position.longitude };
		}

		void loadAgriData(position.latitude, position.longitude, false, {
			species: currentSpecies,
			environmentExposure: currentExposure
		});
	});

	$effect(() => {
		debugCounters.submitting = submitting;
	});

	const climateApproximate = $derived(
		savedPosition !== null && isPoorAccuracy(savedPosition.accuracyMeters)
	);

	async function loadClimateForPosition(latitude: number, longitude: number, force = false) {
		const key = positionKey(latitude, longitude);

		if (!force && climateLocked && climateHistory) {
			return;
		}

		if (
			!force &&
			climateAutoFetchKey === key &&
			(climateLoading || climateHistory)
		) {
			return;
		}

		if (climateFetchInFlight) {
			return;
		}

		debugCounters.climateFetches += 1;
		// #region agent log
		debugLog(
			'CaptureForm:loadClimateForPosition',
			'climate fetch start',
			{ key, force, inFlight: climateFetchInFlight },
			'H1'
		);
		// #endregion

		climateFetchInFlight = true;
		climateAutoFetchKey = key;
		climateLoading = true;
		climateError = '';

		try {
			const result = await fetchClimateHistory(latitude, longitude);
			climateHistory = result;
			climateAnchor = { latitude, longitude };
			climateFetchedApproximate = isPoorAccuracy(savedPosition?.accuracyMeters ?? null);
			climateLocked = !climateFetchedApproximate;
		} catch (err) {
			climateHistory = null;
			if (typeof navigator !== 'undefined' && !navigator.onLine) {
				climateError = `${m.tree_climate_unavailable()} — ${m.climate_online_required().toLowerCase()}`;
			} else {
				climateError =
					err instanceof Error ? err.message : m.capture_climate_error();
			}
		} finally {
			climateLoading = false;
			climateFetchInFlight = false;
			// #region agent log
			debugLog(
				'CaptureForm:loadClimateForPosition',
				'climate fetch end',
				{
					key,
					hasError: !!climateError,
					hasHistory: !!climateHistory,
					errorMessage: climateError || null
				},
				'H1'
			);
			// #endregion
		}
	}

	function retryClimate() {
		const position = savedPosition;
		if (!position) {
			return;
		}
		climateAutoFetchKey = '';
		climateLocked = false;
		climateFetchedApproximate = false;
		void loadClimateForPosition(position.latitude, position.longitude, true);
		void loadAgriData(position.latitude, position.longitude, true, { species, environmentExposure });
	}

	function clearClimateState(): void {
		if (
			!climateHistory &&
			!climateError &&
			!climateLoading &&
			!climateAnchor &&
			!climateAutoFetchKey &&
			!climateLocked &&
			!climateFetchedApproximate
		) {
			return;
		}
		climateHistory = null;
		climateError = '';
		climateLoading = false;
		climateAnchor = null;
		climateAutoFetchKey = '';
		climateLocked = false;
		climateFetchedApproximate = false;
		agriFetchAnchor = null;
		lastAgriInputsKey = '';
		resetAgriData();
	}

	function clearLocationState(): void {
		if (
			!locationLabel &&
			!locationLoading &&
			!locationAnchor &&
			!locationFetchKey &&
			!cadastreInfo &&
			!cadastreLoading &&
			!cadastreFetchKey
		) {
			return;
		}
		locationLabel = null;
		locationLoading = false;
		locationAnchor = null;
		locationFetchKey = '';
		cadastreInfo = null;
		cadastreLoading = false;
		cadastreFetchKey = '';
	}

	function shouldRefetchClimate(
		position: { latitude: number; longitude: number; accuracyMeters?: number | null }
	): boolean {
		if (climateLocked && climateHistory) {
			return false;
		}

		if (
			climateHistory &&
			climateFetchedApproximate &&
			!isPoorAccuracy(position.accuracyMeters ?? null)
		) {
			return true;
		}

		const anchor = untrack(() => climateAnchor);
		if (!anchor) {
			return true;
		}
		return (
			haversineDistanceM(
				anchor.latitude,
				anchor.longitude,
				position.latitude,
				position.longitude
			) >= CLIMATE_REFETCH_DISTANCE_M
		);
	}

	function shouldRefetchLocation(
		position: { latitude: number; longitude: number }
	): boolean {
		const anchor = untrack(() => locationAnchor);
		if (!anchor) {
			return true;
		}
		return (
			haversineDistanceM(
				anchor.latitude,
				anchor.longitude,
				position.latitude,
				position.longitude
			) >= LOCATION_REFETCH_DISTANCE_M
		);
	}

	function shouldRefetchAgri(position: { latitude: number; longitude: number }): boolean {
		const anchor = untrack(() => agriFetchAnchor);
		if (!anchor) {
			return true;
		}
		return (
			haversineDistanceM(
				anchor.latitude,
				anchor.longitude,
				position.latitude,
				position.longitude
			) >= AGRI_REFETCH_DISTANCE_M
		);
	}

	function syncClimateAndLocationForPosition(
		position: NonNullable<typeof savedPosition>
	): void {
		if (!simpleMode && shouldRefetchClimate(position)) {
			void loadClimateForPosition(position.latitude, position.longitude);
		}

		if (isPoorAccuracy(position.accuracyMeters)) {
			clearLocationState();
			return;
		}

		if (shouldRefetchLocation(position)) {
			void loadLocationForPosition(position.latitude, position.longitude);
			void loadCadastreForPosition(position.latitude, position.longitude);
		}
	}

	async function loadCadastreForPosition(latitude: number, longitude: number, force = false) {
		if (isPoorAccuracy(savedPosition?.accuracyMeters ?? null)) {
			cadastreInfo = null;
			cadastreLoading = false;
			return;
		}

		const key = positionKey(latitude, longitude);
		if (!force && cadastreFetchKey === key && (cadastreLoading || cadastreInfo !== null)) {
			return;
		}

		cadastreFetchKey = key;
		cadastreLoading = true;

		try {
			cadastreInfo = await lookupCadastre(latitude, longitude);
		} catch {
			cadastreInfo = null;
		} finally {
			cadastreLoading = false;
		}
	}

	async function loadLocationForPosition(latitude: number, longitude: number, force = false) {
		if (isPoorAccuracy(savedPosition?.accuracyMeters ?? null)) {
			locationLabel = null;
			locationLoading = false;
			return;
		}

		const key = positionKey(latitude, longitude);

		if (!force && locationFetchKey === key && (locationLoading || locationLabel !== null)) {
			return;
		}

		locationFetchKey = key;
		locationLoading = true;

		try {
			locationLabel = await reverseGeocode(latitude, longitude);
			locationAnchor = { latitude, longitude };
		} catch {
			locationLabel = null;
			locationAnchor = { latitude, longitude };
		} finally {
			locationLoading = false;
		}
	}

	$effect(() => {
		const position = savedPosition;
		debugCounters.climateEffectRuns += 1;
		if (!position) {
			untrack(clearClimateState);
			untrack(clearLocationState);
			return;
		}

		const needsClimate = !simpleMode && shouldRefetchClimate(position);
		const needsLocation =
			!isPoorAccuracy(position.accuracyMeters) && shouldRefetchLocation(position);
		const needsLocationReset =
			isPoorAccuracy(position.accuracyMeters) &&
			!!untrack(
				() =>
					locationLabel ||
					cadastreInfo ||
					locationLoading ||
					cadastreLoading ||
					locationAnchor
			);

		if (!needsClimate && !needsLocation && !needsLocationReset) {
			return;
		}

		syncClimateAndLocationForPosition(position);
	});

	$effect(() => {
		if (!onlineState.online) return;
		const position = savedPosition;
		if (!position || cadastreInfo || isPoorAccuracy(position.accuracyMeters)) return;
		void loadCadastreForPosition(position.latitude, position.longitude, true);
	});

	$effect(() => {
		const position = capturePosition;
		if (!position) {
			return;
		}

		const currentBest = untrack(() => bestCapturePosition);
		if (isBetterAccuracy(position.accuracyMeters, currentBest?.accuracyMeters ?? null)) {
			bestCapturePosition = position;
		}
		if (gpsLoading) {
			gpsLoading = false;
		}
	});

	$effect(() => {
		if (userPositionState.error && !userPositionState.position) {
			gpsLoading = false;
		}
	});

	function isPhotoPicking(): boolean {
		return photoPreviewRef?.isPicking() ?? false;
	}

	async function handleVolumeDown(): Promise<void> {
		if (voiceSessionActive || submitting || showGpsConfirm || isPhotoPicking()) {
			return;
		}

		await voiceRecorderRef?.toggleVolumeRecording();
	}

	async function handleVolumeUpSave(): Promise<void> {
		if (voiceSessionActive || submitting || gpsChecking || isPhotoPicking()) {
			return;
		}

		if (showGpsConfirm) {
			confirmGpsSave();
			return;
		}

		void hapticSuccess();

		if (voiceRecorderRef?.isVoiceRecording()) {
			await voiceRecorderRef.toggleVolumeRecording();
		}

		if (!photoFile) {
			await photoPreviewRef?.openCamera();
		}

		await handleSubmit();
	}

	onMount(() => {
		submitting = false;
		submitLock = false;
		debugCounters.submitting = false;
		resetVisitDebugCounters();
		resetPositionSmoothing();
		debugCounters.captureMounts += 1;
		// #region agent log
		debugLog('CaptureForm:onMount', 'form mounted', { mounts: debugCounters.captureMounts }, 'H2');
		// #endregion
	});

	$effect(() => {
		const best = bestCapturePosition;
		const live = capturePosition;
		const speed = live?.speedMps ?? best?.speedMps ?? null;
		const bestAccuracy = best?.accuracyMeters ?? null;
		const liveAccuracy = live?.accuracyMeters ?? null;

		if (
			live &&
			(liveAccuracy === null ||
				isPoorAccuracy(liveAccuracy) ||
				(speed !== null && speed >= CAPTURE_IDLE_SPEED_MPS))
		) {
			captureIdleSince = null;
			captureGpsProfile = 'capture';
			return;
		}

		if (
			best &&
			bestAccuracy !== null &&
			bestAccuracy <= GPS_EXCELLENT_ACCURACY_THRESHOLD_M &&
			(speed === null || speed < CAPTURE_IDLE_SPEED_MPS)
		) {
			if (captureIdleSince === null) {
				captureIdleSince = Date.now();
			} else if (Date.now() - captureIdleSince >= CAPTURE_IDLE_MS) {
				captureGpsProfile = 'proximity';
			}
			return;
		}

		captureIdleSince = null;
		captureGpsProfile = 'capture';
	});

	$effect(() => {
		const profile = captureGpsProfile;
		void requestCurrentPosition(profile);
		const release = acquireLocationWatch('capture-form', profile);
		return () => release();
	});

	$effect(() => {
		if (!isAndroidApp()) {
			return;
		}

		if (voiceSessionActive) {
			void stopVolumeButtonWatch();
			return;
		}

		void startVolumeButtonWatch({
			onDown: () => void handleVolumeDown(),
			onUp: () => void handleVolumeUpSave()
		});

		return () => {
			void stopVolumeButtonWatch();
		};
	});

	function buildCaptureAssessment(): TreeAssessment {
		if (simpleMode) {
			return { ...DEFAULT_ASSESSMENT };
		}
		return {
			...DEFAULT_ASSESSMENT,
			potentialScore: quickAssessment.potentialScore,
			caliber: quickAssessment.caliber,
			nebari: quickAssessment.nebari
		};
	}

	async function saveTree(): Promise<void> {
		error = '';
		gpsWarning = '';
		gpsSuccess = '';

		const trimmedSpecies = species.trim();

		submitting = true;
		const saveStartedAt = performance.now();
		debugLog('CaptureForm:handleSubmit', 'submit start', { submitting: true }, 'H3');
		await tick();

		try {
			const knownPosition = bestCapturePosition ?? capturePosition;
			const gpsStartedAt = performance.now();
			const gpsSource = await ensureCapturePositionForSave(
				knownPosition,
				getLastGpsUpdateAt(),
				() => requestCurrentPosition('capture')
			);
			debugLog(
				'CaptureForm:saveTree',
				'gps resolve',
				{
					gpsMs: Math.round(performance.now() - gpsStartedAt),
					gpsSource
				},
				'H3'
			);
			await tick();

			const position = bestCapturePosition ?? capturePosition;
			const latitude = position?.latitude ?? null;
			const longitude = position?.longitude ?? null;
			const accuracyMeters = position?.accuracyMeters ?? null;
			const altitudeMeters = getSmoothedAltitudeMeters();

			const savedCadastreInfo = cadastreInfo;

			if (latitude === null || longitude === null) {
				gpsWarning =
					m.gps_no_coords_saved();
			} else if (isPoorAccuracy(accuracyMeters)) {
				gpsWarning = m.gps_poor_warning({ accuracy: formatAccuracy(accuracyMeters) });
			} else {
				gpsSuccess = m.gps_saved({ accuracy: formatAccuracy(accuracyMeters) });
			}

			let photos: string[] = [];
			if (photoFile) {
				photos = [await compressImageWithFallback(photoFile)];
			}

			const capturedAt = new Date().toISOString();
			const yrsAtCapture =
				!simpleMode && agriData.data?.yrs
					? toYrsStoredSnapshot(agriData.data.yrs, capturedAt)
					: null;

			const persistStartedAt = performance.now();
			await addTree({
				species: trimmedSpecies,
				notes: simpleMode ? '' : notes.trim(),
				photos,
				voiceNote,
				latitude,
				longitude,
				accuracyMeters,
				altitudeMeters,
				frontHeadingDegrees,
				isFavorite: false,
				climateHistory: simpleMode ? null : climateHistory,
				locationLabel,
				cadastreInfo: savedCadastreInfo,
				harvestEthicsConfirmation: null,
				environmentExposure,
				yrsAtCapture,
				assessment: buildCaptureAssessment()
			});
			debugLog(
				'CaptureForm:saveTree',
				'persist done',
				{ persistMs: Math.round(performance.now() - persistStartedAt) },
				'H3'
			);

			scheduleCadastreBackfill();

			await new Promise((resolve) => setTimeout(resolve, 50));
			await goHome();
			debugLog(
				'CaptureForm:saveTree',
				'submit complete',
				{ totalMs: Math.round(performance.now() - saveStartedAt) },
				'H3'
			);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.';
		} finally {
			submitting = false;
			submitLock = false;
			debugLog('CaptureForm:handleSubmit', 'submit end', { submitting: false }, 'H3');
		}
	}

	async function handleSubmit(event?: Event) {
		event?.preventDefault();
		event?.stopPropagation();
		if (submitLock || submitting || gpsChecking) return;
		submitLock = true;

		const position = bestCapturePosition ?? capturePosition;

		if (shouldConfirmGpsBeforeSave(position)) {
			gpsConfirmMessage = !position
				? m.gps_confirm_no_position()
				: m.gps_confirm_poor({ accuracy: formatAccuracy(position.accuracyMeters) });
			showGpsConfirm = true;
			submitLock = false;
			return;
		}

		gpsChecking = true;
		try {
			await saveTree();
		} finally {
			gpsChecking = false;
		}
	}

	function confirmGpsSave() {
		submitLock = true;
		void saveTree();
	}

	function cancelGpsSave() {
		submitLock = false;
	}

	function toggleQuickAssessmentChip<K extends keyof TreeAssessment>(
		key: K,
		value: TreeAssessment[K]
	) {
		quickAssessment = {
			...quickAssessment,
			[key]: quickAssessment[key] === value ? null : value
		};
	}

	function handlePhoto(file: File, previewUrl: string) {
		photoFile = file;
		photoPreviewUrl = previewUrl;
		frontHeadingDegrees = currentHeading;
	}

	function selectSpecies(name: string, event?: Event) {
		debugCounters.speciesClicks += 1;
		debugCounters.visitSpeciesClicks += 1;
		// #region agent log
		debugLog('CaptureForm:selectSpecies', 'species selected', { name }, 'H4');
		// #endregion
		event?.preventDefault();
		event?.stopPropagation();
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		species = name;
		speciesFeedback = m.capture_species_selected({ name: speciesDisplayName(name) });
		speciesHighlight = true;
		setTimeout(() => {
			speciesHighlight = false;
		}, 2000);
	}
</script>

<div class="capture-screen">
	<div class="capture-screen__scroll scroll-pb-safe">
<div
	class="flex flex-col gap-6 simple-density md:grid md:grid-cols-2 md:items-start md:gap-6"
	use:captureFormRoot={{
		onSpecies: selectSpecies,
		onSubmit: (event) => void handleSubmit(event),
		onClimateRetry: retryClimate
	}}
>
	{#if !simpleMode}
		<div class="order-0 flex flex-col gap-4 md:col-span-2">
			{#if showClimatePanel}
				<EnvironmentExposureField bind:value={environmentExposure} disabled={submitting} />
			{/if}
			<YrsScoreBanner
				gpsReady={savedPosition !== null}
				locationError={savedPosition ? '' : userPositionState.error}
			/>
		</div>
	{/if}

	<div class="order-1 flex flex-col gap-4">
		<PhotoPreview
			bind:this={photoPreviewRef}
			previewUrl={photoPreviewUrl}
			{photoFile}
			{frontLabel}
			onfile={handlePhoto}
		/>

		{#if error}
			<p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
		{/if}

		{#if gpsWarning}
			<p class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
				{gpsWarning}
			</p>
		{/if}

		{#if gpsSuccess && !simpleMode}
			<p class="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
				{gpsSuccess}
			</p>
		{/if}

		<VoiceNoteRecorder
			bind:this={voiceRecorderRef}
			bind:value={voiceNote}
			bind:sessionActive={voiceSessionActive}
			disabled={submitting}
			compact
		/>

		{#if androidVolumeHint}
			<p class="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800" role="status">
				{androidVolumeHint}
			</p>
		{/if}
	</div>

	<div class="order-2 flex flex-col gap-6">
		<div class="flex flex-col gap-2">
			<label for="species" class="text-sm font-medium text-forest-900">{m.capture_species_optional()}</label>

			{#if simpleMode}
				<GpsStatusCompact
					loading={gpsLoading}
					accuracyMeters={savedPosition?.accuracyMeters ?? null}
					{locationLabel}
					{locationLoading}
				/>
				{#if cadastreLoading || cadastreInfo}
					<CadastreBanner
						info={cadastreInfo}
						loading={cadastreLoading}
						compact
						minimal
						checklistOpen={vetoChecklistOpen}
						onchecklisttoggle={() => (vetoChecklistOpen = !vetoChecklistOpen)}
					/>
					{#if vetoChecklistOpen && cadastreInfo && savedPosition}
						<VetoLegalChecklist
							cadastreInfo={cadastreInfo}
							species={species}
							latitude={savedPosition.latitude}
							longitude={savedPosition.longitude}
							onclose={() => (vetoChecklistOpen = false)}
						/>
					{/if}
				{/if}
			{:else if gpsLoading}
				<GpsAccuracyBadge accuracyMeters={null} loading={true} />
			{:else if savedPosition}
				<GpsAccuracyBadge accuracyMeters={savedPosition.accuracyMeters} />
				{#if showBestPositionHint && bestCapturePosition}
					<p class="text-sm text-forest-600" role="status">
						{m.gps_saved({ accuracy: formatAccuracy(bestCapturePosition.accuracyMeters) })}
					</p>
				{/if}
				{#if locationLoading}
					<p class="text-sm text-muted" role="status">{m.capture_location_identifying()}</p>
				{:else if locationLabel}
					<p class="text-sm font-medium text-forest-800" role="status">
						{m.share_location({ location: locationLabel })}
					</p>
				{/if}
				{#if cadastreLoading || cadastreInfo}
					<CadastreBanner
						info={cadastreInfo}
						loading={cadastreLoading}
						compact
						checklistOpen={vetoChecklistOpen}
						onchecklisttoggle={() => (vetoChecklistOpen = !vetoChecklistOpen)}
					/>
					{#if vetoChecklistOpen && cadastreInfo && savedPosition}
						<VetoLegalChecklist
							cadastreInfo={cadastreInfo}
							species={species}
							latitude={savedPosition.latitude}
							longitude={savedPosition.longitude}
							onclose={() => (vetoChecklistOpen = false)}
						/>
					{/if}
				{/if}
			{/if}

			{#if !simpleMode && gpsCaptureHint}
				<p class="text-sm text-muted" role="status">{gpsCaptureHint}</p>
			{/if}

			{#if userPositionState.error}
				<p class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
					{userPositionState.error}
				</p>
			{/if}

			{#if !simpleMode}
			<details class="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-muted">
				<summary class="cursor-pointer font-medium text-forest-800">{m.gps_forest_tips_title()}</summary>
				<ul class="mt-2 list-disc space-y-1 pl-5">
					{#each gpsCaptureTips as tip}
						<li>{tip}</li>
					{/each}
				</ul>
			</details>
			{/if}

			{#if !gpsLoading && savedPosition && displayedSpecies.length > 0}
				<div
					class="flex flex-wrap gap-2"
					role="group"
					aria-label={m.capture_species_suggestions()}
				>
						{#each displayedSpecies as suggestion (suggestion)}
							<button
								type="button"
								data-capture-action="species"
								data-species-value={suggestion}
								disabled={submitting}
								class="h-10 touch-manipulation rounded-full px-4 text-sm font-medium transition disabled:opacity-50 {species ===
								suggestion
									? 'bg-forest-800 text-white'
									: 'border border-gray-200 bg-white text-forest-900'}"
								aria-pressed={species === suggestion}
							>
								{speciesDisplayName(suggestion)}
							</button>
						{/each}
				</div>
			{:else if !gpsLoading && savedPosition && displayedSpecies.length === 0 && !species.trim()}
				<p class="text-sm text-muted">{m.capture_no_suggestions()}</p>
			{/if}

			<SpeciesAutocomplete
				id="species"
				bind:value={species}
				disabled={submitting}
				highlight={speciesHighlight}
				onselect={(name) => selectSpecies(name)}
			/>

			{#if speciesFeedback}
				<p class="text-sm font-medium text-green-800" role="status">{speciesFeedback}</p>
			{/if}
		</div>

		{#if !simpleMode}
		<section class="rounded-xl border border-gray-100 bg-white shadow-sm">
			<button
				type="button"
				class="flex w-full items-center justify-between gap-3 p-4 text-left"
				onclick={() => (quickAssessmentOpen = !quickAssessmentOpen)}
				aria-expanded={quickAssessmentOpen}
			>
				<div>
					<h3 class="text-sm font-medium text-forest-900">{m.capture_quick_assessment()}</h3>
					<p class="mt-1 text-sm text-muted">{m.capture_quick_assessment_hint()}</p>
				</div>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="h-5 w-5 shrink-0 text-muted transition {quickAssessmentOpen ? 'rotate-180' : ''}"
					aria-hidden="true"
				>
					<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</button>

			{#if quickAssessmentOpen}
				<div class="flex flex-col gap-4 border-t border-gray-100 p-4">
					<div class="flex flex-col gap-2">
						<span class="text-sm font-medium text-forest-900">
							{m.assessment_potential()} (1–10) : {quickAssessment.potentialScore ?? '—'}/10
						</span>
						<div class="grid grid-cols-5 gap-2">
							{#each Array.from({ length: 10 }, (_, index) => index + 1) as score (score)}
								<button
									type="button"
									disabled={submitting}
									onclick={() => toggleQuickAssessmentChip('potentialScore', score)}
									class="flex h-10 items-center justify-center rounded-lg text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 {quickAssessment.potentialScore ===
									score
										? 'bg-forest-800 text-white'
										: 'border border-gray-200 bg-white text-forest-900'}"
								>
									{score}
								</button>
							{/each}
						</div>
					</div>

					<div class="flex flex-col gap-2">
						<span class="text-sm font-medium text-forest-900">{m.assessment_caliber()}</span>
						<div class="flex flex-wrap gap-2">
							{#each caliberOptions as option (option.value)}
								<button
									type="button"
									disabled={submitting}
									onclick={() => toggleQuickAssessmentChip('caliber', option.value)}
									class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] disabled:opacity-50 {quickAssessment.caliber ===
									option.value
										? 'bg-forest-800 text-white'
										: 'border border-gray-200 bg-white text-forest-900'}"
								>
									{option.label}
								</button>
							{/each}
						</div>
					</div>

					<div class="flex flex-col gap-2">
						<span class="text-sm font-medium text-forest-900">{m.assessment_nebari()}</span>
						<div class="flex flex-wrap gap-2">
							{#each nebariOptions as option (option.value)}
								<button
									type="button"
									disabled={submitting}
									onclick={() => toggleQuickAssessmentChip('nebari', option.value)}
									class="rounded-full px-3 py-2 text-sm transition active:scale-[0.98] disabled:opacity-50 {quickAssessment.nebari ===
									option.value
										? 'bg-forest-800 text-white'
										: 'border border-gray-200 bg-white text-forest-900'}"
								>
									{option.label}
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</section>

		<div class="flex flex-col gap-2">
			<label for="notes" class="text-sm font-medium text-forest-900">{m.capture_notes()}</label>
			<textarea
				id="notes"
				bind:value={notes}
				rows="3"
				placeholder={m.capture_notes_placeholder()}
				disabled={submitting}
				class="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
			></textarea>
		</div>
	{/if}
	</div>

	{#if !simpleMode && showClimatePanel}
		<div class="order-3 md:col-span-2">
			<ClimateDataSection
				climate={climateHistory}
				loading={climateLoading}
				error={climateError}
				approximate={climateApproximate}
				offline={!onlineState.online}
				{species}
				environmentExposure={environmentExposure}
				onretry={retryClimate}
			/>
		</div>
	{/if}
</div>
	</div>

	<footer class="capture-screen__footer">
		<button
			type="button"
			data-capture-action="submit"
			disabled={submitting || gpsChecking || submitLock}
			class="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
			onclick={(event) => void handleSubmit(event)}
		>
			{#if submitting || gpsChecking}
				<svg
					class="h-5 w-5 animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					></path>
				</svg>
				{m.action_saving()}
			{:else}
				{m.capture_submit()}
			{/if}
		</button>
	</footer>

	<ConfirmDialog
		bind:open={showGpsConfirm}
		title={m.gps_confirm_title()}
		message={gpsConfirmMessage}
		confirmLabel={m.confirm_save_anyway()}
		variant="default"
		onconfirm={confirmGpsSave}
		oncancel={cancelGpsSave}
	/>
</div>
