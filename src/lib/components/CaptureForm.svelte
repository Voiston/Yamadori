<script lang="ts">
	import { DEFAULT_ASSESSMENT, type TreeAssessment, type VoiceNote } from '$lib/types/tree';
	import type { ClimateHistory } from '$lib/types/climate';
	import { DEFAULT_ENVIRONMENT_EXPOSURE, type EnvironmentExposure } from '$lib/types/environment';
	import { addTree, treeStore } from '$lib/stores/trees.svelte';
	import { agriData } from '$lib/stores/agriData.svelte';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { captureSettingsState } from '$lib/stores/captureSettings.svelte';
	import { goHome } from '$lib/utils/app-navigation';
	import { handlePostCaptureSaveNavigation } from '$lib/utils/capture-post-save';
	import { releaseOnboardingUiLocks } from '$lib/utils/onboardingUi';
	import {
		advanceOnboardingPhase,
		onboardingState,
		setCaptureSavedDuringTutorial
	} from '$lib/stores/onboarding.svelte';
	import { fetchClimateHistory } from '$lib/utils/climate';
	import { loadAgriData, resetAgriData } from '$lib/stores/agriData.svelte';
	import { reverseGeocode } from '$lib/utils/geocoding';
	import { lookupCadastreForCoords } from '$lib/geo/providers/cadastre/dispatch';
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
	import GpsAccuracyBadge from './GpsAccuracyBadge.svelte';
	import GpsStatusCompact from './GpsStatusCompact.svelte';
	import { needsLocationPromptBeforePhoto, shouldConfirmGpsBeforeSave, type LocationPromptBeforePhotoReason } from '$lib/utils/capture-gps-confirm';
	import { formatAccuracy, isBetterAccuracy, isPoorAccuracy } from '$lib/utils/gps';
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
	import {
		getLocationPermissionStatus,
		requestLocationPermissions
	} from '$lib/utils/locationProvider';
	import { openAppSettings, openLocationSettings } from '$lib/utils/openAppSettings';
	import { photoFileToStorageWithThumb } from '$lib/utils/photo';
	import {
		CAPTURE_AGRI_REFETCH_DISTANCE_M,
		CAPTURE_ENRICHMENT_DEBOUNCE_MS,
		CAPTURE_LOCATION_REFETCH_DISTANCE_M,
		capturePositionKey,
		shouldRefetchCapturePosition
	} from '$lib/utils/capture-enrichment';
	import {
		createCaptureEnrichmentSession,
		type CaptureEnrichmentRunResult
	} from '$lib/utils/capture-enrichment-runner';
	import { isCameraCaptureActive } from '$lib/utils/cameraCaptureSession';
	import {
		getBarkOptions,
		getCaliberOptions,
		getDeadwoodOptions,
		getNebariOptions,
		getSizeOptions
	} from '$lib/constants/assessment';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import * as m from '$lib/paraglide/messages.js';
	import { getSpeciesSuggestionsForPosition } from '$lib/utils/species-suggestions';
	import { onMount, tick, untrack } from 'svelte';
	import { captureFormRoot } from '$lib/utils/native-touch';
	import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
	import { App } from '@capacitor/app';
	import { showAppToast } from '$lib/stores/appToast.svelte';
	import { hapticError, hapticSuccess } from '$lib/utils/haptics';
	import { toYrsStoredSnapshot } from '$lib/utils/yrs';
	import { startVolumeButtonWatch, stopVolumeButtonWatch } from '$lib/utils/volumeButtons';
	import SpeciesAutocomplete from './SpeciesAutocomplete.svelte';
	import CaptureAssessmentSection from './capture/CaptureAssessmentSection.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import LocationPermissionPrompt from './LocationPermissionPrompt.svelte';
	import MultiPhotoPreview, { type MultiPhotoSlot } from './MultiPhotoPreview.svelte';
	import VoiceNoteRecorderLazy from './VoiceNoteRecorderLazy.svelte';
	import YrsScoreBanner from './YrsScoreBanner.svelte';
	import { canAddTree } from '$lib/utils/featurePolicy';
	import { openProPaywall } from '$lib/stores/proPaywall.svelte';
	import CadastreBanner from './CadastreBanner.svelte';
	import { effectiveCollectStatus } from '$lib/utils/cadastreRefs';
	import VetoLegalChecklist from './VetoLegalChecklist.svelte';
	import GeoCapabilityBanner from './GeoCapabilityBanner.svelte';
	import { resolveCountry } from '$lib/geo/resolveCountry';
	import ClimateDataSectionLazy from './ClimateDataSectionLazy.svelte';
	import EnvironmentExposureField from './EnvironmentExposureField.svelte';
	import { teardownCaptureTutorial } from '$lib/utils/captureTutorialTeardown';

	type VoiceRecorderHandle = {
		toggleVolumeRecording: () => Promise<void>;
		isVoiceRecording: () => boolean;
	};

	let { tutorialActive = false }: { tutorialActive?: boolean } = $props();

	let species = $state('');
	let notes = $state('');
	let environmentExposure = $state<EnvironmentExposure>(DEFAULT_ENVIRONMENT_EXPOSURE);
	let voiceNote = $state<VoiceNote | null>(null);
	let photoSlots = $state<MultiPhotoSlot[]>([]);
	let photoProcessingBusy = $state(false);
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

	const barkOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getBarkOptions();
	});

	const deadwoodOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getDeadwoodOptions();
	});

	const sizeOptions = $derived.by(() => {
		void appearanceSettingsState.locale;
		return getSizeOptions();
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
	let gpsAutoSavePending = $state(false);
	let showLocationPrompt = $state(false);
	let locationPromptReason = $state<LocationPromptBeforePhotoReason | null>(null);
	let locationPromptBusy = $state(false);
	let awaitingLocationSettingsReturn = $state(false);
	let openCameraAfterLocationSettings = $state(false);
	let showSettingsHint = $state(false);
	let saveSuccessPulse = $state(false);

	let quickAssessment = $state<TreeAssessment>({ ...DEFAULT_ASSESSMENT });
	let photoPreviewRef = $state<MultiPhotoPreview | undefined>();
	let voiceRecorderRef = $state<VoiceRecorderHandle | undefined>();
	let voiceSessionActive = $state(false);

	const ENRICHMENT_DEBOUNCE_MS = CAPTURE_ENRICHMENT_DEBOUNCE_MS;
	const LOCATION_REFETCH_DISTANCE_M = CAPTURE_LOCATION_REFETCH_DISTANCE_M;
	const AGRI_REFETCH_DISTANCE_M = CAPTURE_AGRI_REFETCH_DISTANCE_M;
	const BEST_POSITION_MIN_INTERVAL_MS = 500;
	const enrichmentSession = createCaptureEnrichmentSession();
	let bestPositionTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingBestPosition: typeof capturePosition = null;

	function positionKey(latitude: number, longitude: number): string {
		return capturePositionKey(latitude, longitude);
	}

	const simpleMode = $derived(appearanceSettingsState.simpleMode);
	const simplified = $derived(simpleMode || tutorialActive);
	const captureBlocked = $derived(!canAddTree(treeStore.trees.length));

	$effect(() => {
		if (simplified) {
			vetoChecklistOpen = false;
		}
	});

	const savedPosition = $derived(bestCapturePosition ?? capturePosition);
	const captureCountry = $derived(
		savedPosition ? resolveCountry(savedPosition.latitude, savedPosition.longitude) : null
	);
	let enrichmentPosition = $state<typeof savedPosition>(null);
	let enrichmentDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	const gpsCaptureHint = $derived.by(() => {
		if (simplified) return '';
		if (gpsLoading) {
			return getGpsCaptureWaitingHint(onlineState.online);
		}
		if (savedPosition) {
			return getGpsCaptureReadyHint(onlineState.online, savedPosition.accuracyMeters);
		}
		return '';
	});

	const gpsCaptureTips = $derived(simplified ? [] : getGpsCaptureTips());
	const androidVolumeHint = $derived(
		captureSettingsState.terrainModeEnabled && isAndroidApp() ? getAndroidVolumeButtonHint() : null
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
		const position = savedPosition;
		if (!position) {
			enrichmentPosition = null;
			return;
		}

		if (enrichmentDebounceTimer) {
			clearTimeout(enrichmentDebounceTimer);
		}

		enrichmentDebounceTimer = setTimeout(() => {
			enrichmentPosition = position;
			enrichmentDebounceTimer = null;
		}, ENRICHMENT_DEBOUNCE_MS);

		return () => {
			if (enrichmentDebounceTimer) {
				clearTimeout(enrichmentDebounceTimer);
				enrichmentDebounceTimer = null;
			}
		};
	});

	$effect(() => {
		let stop: (() => void) | null = null;
		let cancelled = false;
		let permissionGranted = false;
		let appActive = typeof document === 'undefined' || document.visibilityState === 'visible';

		const startSubscription = () => {
			if (cancelled || !permissionGranted || !appActive || stop) {
				return;
			}
			stop = subscribeFusedHeading((sample) => {
				sensorHeadingRaw = sample.heading;
				sensorReference = sample.reference;
			});
		};

		const pauseSubscription = () => {
			stop?.();
			stop = null;
			sensorHeadingRaw = null;
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

	function applyEnrichmentResult(patch: CaptureEnrichmentRunResult): void {
		if (patch.clearClimate) {
			clearClimateState();
		}
		if (patch.clearLocation) {
			clearLocationState();
		}

		if (patch.climate.history !== undefined) {
			climateHistory = patch.climate.history;
		}
		if (patch.climate.loading !== undefined) {
			climateLoading = patch.climate.loading;
		}
		if (patch.climate.error !== undefined) {
			if (
				patch.climate.error &&
				typeof navigator !== 'undefined' &&
				!navigator.onLine
			) {
				climateError = `${m.tree_climate_unavailable()} — ${m.climate_online_required().toLowerCase()}`;
			} else if (patch.climate.error) {
				climateError = patch.climate.error;
			} else {
				climateError = '';
			}
		}
		if (patch.climate.anchor !== undefined) {
			climateAnchor = patch.climate.anchor;
		}
		if (patch.climate.autoFetchKey !== undefined) {
			climateAutoFetchKey = patch.climate.autoFetchKey;
		}
		if (patch.climate.locked !== undefined) {
			climateLocked = patch.climate.locked;
		}
		if (patch.climate.fetchedApproximate !== undefined) {
			climateFetchedApproximate = patch.climate.fetchedApproximate;
		}
		if (patch.climate.fetchInFlight !== undefined) {
			climateFetchInFlight = patch.climate.fetchInFlight;
		}

		if (patch.location.label !== undefined) {
			locationLabel = patch.location.label;
		}
		if (patch.location.loading !== undefined) {
			locationLoading = patch.location.loading;
		}
		if (patch.location.anchor !== undefined) {
			locationAnchor = patch.location.anchor;
		}
		if (patch.location.fetchKey !== undefined) {
			locationFetchKey = patch.location.fetchKey;
		}
		if (patch.location.cadastreInfo !== undefined) {
			cadastreInfo = patch.location.cadastreInfo;
		}
		if (patch.location.cadastreLoading !== undefined) {
			cadastreLoading = patch.location.cadastreLoading;
		}
		if (patch.location.cadastreFetchKey !== undefined) {
			cadastreFetchKey = patch.location.cadastreFetchKey;
		}

		if (patch.agri.lastInputsKey !== undefined) {
			lastAgriInputsKey = patch.agri.lastInputsKey;
		}
		if (patch.agri.fetchAnchor !== undefined) {
			agriFetchAnchor = patch.agri.fetchAnchor;
		}
	}

	function shouldDeferCaptureEnrichment(): boolean {
		return isCameraCaptureActive() || photoProcessingBusy;
	}

	function flushBestCapturePosition(): void {
		const position = pendingBestPosition;
		pendingBestPosition = null;
		bestPositionTimer = null;
		if (!position) {
			return;
		}
		const currentBest = bestCapturePosition;
		if (isBetterAccuracy(position.accuracyMeters, currentBest?.accuracyMeters ?? null)) {
			bestCapturePosition = position;
		}
		if (gpsLoading) {
			gpsLoading = false;
		}
	}

	function scheduleBestCapturePosition(position: NonNullable<typeof capturePosition>): void {
		const currentBest = untrack(() => bestCapturePosition);
		if (!isBetterAccuracy(position.accuracyMeters, currentBest?.accuracyMeters ?? null)) {
			if (gpsLoading) {
				gpsLoading = false;
			}
			return;
		}

		pendingBestPosition = position;
		if (bestPositionTimer) {
			return;
		}

		bestPositionTimer = setTimeout(() => {
			flushBestCapturePosition();
		}, BEST_POSITION_MIN_INTERVAL_MS);
	}

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
		void loadAgriData(position.latitude, position.longitude, true, {
			species,
			environmentExposure,
			observedPhenologyStage: quickAssessment.observedPhenologyStage,
			cernageStatus: quickAssessment.cernageStatus,
			aoutementStatus: quickAssessment.aoutementStatus,
			leafFallPct: quickAssessment.leafFallPct
		});
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
		_position: { latitude: number; longitude: number; accuracyMeters?: number | null }
	): boolean {
		// Climate archive is loaded on first expand of ClimateDataSection (see onretry),
		// not on every GPS settle during capture enrichment.
		return false;
	}

	function shouldRefetchLocation(
		position: { latitude: number; longitude: number }
	): boolean {
		return shouldRefetchCapturePosition(
			untrack(() => locationAnchor),
			position,
			LOCATION_REFETCH_DISTANCE_M
		);
	}

	function shouldRefetchAgri(position: { latitude: number; longitude: number }): boolean {
		return shouldRefetchCapturePosition(
			untrack(() => agriFetchAnchor),
			position,
			AGRI_REFETCH_DISTANCE_M
		);
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
			cadastreInfo = await lookupCadastreForCoords(latitude, longitude);
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
		const position = enrichmentPosition;
		const mode = simplified;
		const online = onlineState.online;
		const currentSpecies = species;
		const currentExposure = environmentExposure;
		const currentObservedPhenologyStage = quickAssessment.observedPhenologyStage;
		const currentCernageStatus = quickAssessment.cernageStatus;
		const currentAoutementStatus = quickAssessment.aoutementStatus;
		const currentLeafFallPct = quickAssessment.leafFallPct;
		void photoProcessingBusy;

		if (!position) {
			enrichmentSession.cancel();
			untrack(clearClimateState);
			untrack(clearLocationState);
			return;
		}

		if (shouldDeferCaptureEnrichment()) {
			return;
		}

		const agriInputsKey = [
			currentSpecies,
			currentExposure,
			currentObservedPhenologyStage ?? '',
			currentCernageStatus ?? '',
			currentAoutementStatus ?? '',
			currentLeafFallPct ?? ''
		].join('|');

		const needsClimate = !mode && shouldRefetchClimate(position);
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
		const needsAgri =
			!mode &&
			(shouldRefetchAgri(position) || agriInputsKey !== lastAgriInputsKey);
		const needsCadastreRetry =
			online &&
			!cadastreInfo &&
			!isPoorAccuracy(position.accuracyMeters);

		if (!needsClimate && !needsLocation && !needsLocationReset && !needsAgri && !needsCadastreRetry) {
			return;
		}

		const controller = new AbortController();
		let cancelled = false;

		void enrichmentSession
			.run({
				position,
				simpleMode: mode,
				online,
				species: currentSpecies,
				environmentExposure: currentExposure,
				observedPhenologyStage: currentObservedPhenologyStage,
				cernageStatus: currentCernageStatus,
				aoutementStatus: currentAoutementStatus,
				leafFallPct: currentLeafFallPct,
				signal: controller.signal,
				shouldRefetchClimate,
				shouldRefetchLocation,
				shouldRefetchAgri,
				needsCadastreRetry: () => needsCadastreRetry,
				climate: {
					history: climateHistory,
					loading: climateLoading,
					error: climateError,
					anchor: climateAnchor,
					autoFetchKey: climateAutoFetchKey,
					locked: climateLocked,
					fetchedApproximate: climateFetchedApproximate,
					fetchInFlight: climateFetchInFlight
				},
				location: {
					label: locationLabel,
					loading: locationLoading,
					anchor: locationAnchor,
					fetchKey: locationFetchKey,
					cadastreInfo,
					cadastreLoading,
					cadastreFetchKey
				},
				agri: {
					fetchAnchor: agriFetchAnchor,
					lastInputsKey: lastAgriInputsKey
				}
			})
			.then((result) => {
				if (cancelled) {
					return;
				}
				applyEnrichmentResult(result);
			});

		return () => {
			cancelled = true;
			controller.abort();
			enrichmentSession.cancel();
		};
	});

	$effect(() => {
		const position = capturePosition;
		if (!position) {
			return;
		}

		scheduleBestCapturePosition(position);

		return () => {
			if (bestPositionTimer) {
				clearTimeout(bestPositionTimer);
				bestPositionTimer = null;
			}
			flushBestCapturePosition();
		};
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
		if (voiceSessionActive || submitting || gpsChecking || isPhotoPicking() || locationPromptBusy) {
			return;
		}

		if (showGpsConfirm) {
			confirmGpsSave();
			return;
		}

		if (showLocationPrompt) {
			return;
		}

		if (voiceRecorderRef?.isVoiceRecording()) {
			await voiceRecorderRef.toggleVolumeRecording();
		}

		if (photoSlots.length === 0) {
			await photoPreviewRef?.openCamera();
			if (showLocationPrompt || photoSlots.length === 0) {
				return;
			}
		}

		await handleSubmit();
	}

	onMount(() => {
		submitting = false;
		submitLock = false;
		resetPositionSmoothing();
		bestCapturePosition = null;
		gpsLoading = true;
	});

	$effect(() => {
		void requestCurrentPosition('capture');
		const release = acquireLocationWatch('capture-form', 'capture');
		return () => release();
	});

	$effect(() => {
		if (!isAndroidApp() || !captureSettingsState.terrainModeEnabled) {
			void stopVolumeButtonWatch();
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
		if (simplified) {
			return { ...DEFAULT_ASSESSMENT };
		}
		return {
			...DEFAULT_ASSESSMENT,
			...quickAssessment
		};
	}

	async function saveTree(): Promise<void> {
		error = '';
		gpsWarning = '';
		gpsSuccess = '';

		if (captureBlocked) {
			openProPaywall('tree_limit');
			return;
		}

		const trimmedSpecies = species.trim();

		submitting = true;
		await tick();

		try {
			const knownPosition = bestCapturePosition ?? capturePosition;
			await ensureCapturePositionForSave(
				knownPosition,
				getLastGpsUpdateAt(),
				() => requestCurrentPosition('capture')
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

			const photos: string[] = [];
			const photoThumbs: string[] = [];
			for (const slot of photoSlots) {
				if (slot.encoding?.full) {
					photos.push(slot.encoding.full);
					photoThumbs.push(slot.encoding.thumb);
				} else if (slot.existingFull) {
					photos.push(slot.existingFull);
					photoThumbs.push(slot.existingThumb ?? slot.existingFull);
				} else if (slot.file) {
					const encoded = await photoFileToStorageWithThumb(slot.file);
					photos.push(encoded.full);
					photoThumbs.push(encoded.thumb);
				}
			}

			const capturedAt = new Date().toISOString();
			const yrsAtCapture =
				!simplified && agriData.data?.yrs
					? toYrsStoredSnapshot(agriData.data.yrs, capturedAt)
					: null;

			await addTree({
				species: trimmedSpecies,
				notes: simplified ? '' : notes.trim(),
				photos,
				photoThumbs: photoThumbs.length > 0 ? photoThumbs : undefined,
				voiceNote,
				latitude,
				longitude,
				accuracyMeters,
				altitudeMeters,
				frontHeadingDegrees,
				isFavorite: false,
				climateHistory: simplified ? null : climateHistory,
				locationLabel,
				cadastreInfo: savedCadastreInfo,
				harvestEthicsConfirmation: null,
				environmentExposure,
				yrsAtCapture,
				assessment: buildCaptureAssessment()
			});

			scheduleCadastreBackfill();

			submitting = false;
			submitLock = false;
			gpsChecking = false;

			saveSuccessPulse = true;
			void hapticSuccess();
			showAppToast('ok', m.capture_tree_saved());
			await handlePostCaptureSaveNavigation({
				phase: onboardingState.phase,
				advanceToProtection: async () => {
					teardownCaptureTutorial();
					await advanceOnboardingPhase('protection');
					await releaseOnboardingUiLocks();
				},
				markCaptureSavedDuringTutorial: () => setCaptureSavedDuringTutorial(true),
				goHome
			});
		} catch (err) {
			void hapticError();
			error = err instanceof Error ? err.message : m.capture_save_error();
			submitting = false;
			submitLock = false;
			gpsChecking = false;
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

	function hasLegalRiskSignal(info: CadastreInfo | null): boolean {
		if (!info) return false;
		const status = effectiveCollectStatus(info);
		return (
			status === 'forbidden' ||
			status === 'permit_required' ||
			status === 'forbidden_or_agency'
		);
	}

	let showLegalReviewChip = $derived(
		hasLegalRiskSignal(cadastreInfo) && !vetoChecklistOpen && !cadastreLoading
	);

	$effect(() => {
		if (!showGpsConfirm || gpsAutoSavePending) return;
		void appearanceSettingsState.locale;
		const position = bestCapturePosition ?? capturePosition;
		if (!position) {
			gpsConfirmMessage = m.gps_confirm_no_position();
			return;
		}
		gpsConfirmMessage = m.gps_confirm_poor({
			accuracy: formatAccuracy(position.accuracyMeters)
		});
		if (!shouldConfirmGpsBeforeSave(position)) {
			gpsAutoSavePending = true;
			showGpsConfirm = false;
			submitLock = true;
			void saveTree().finally(() => {
				gpsAutoSavePending = false;
			});
		}
	});

	const locationPromptMessage = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (locationPromptReason === 'coarse-only') {
			return m.gps_enable_before_photo_precise();
		}
		if (locationPromptReason === 'unsupported') {
			return m.location_unsupported();
		}
		return m.gps_enable_before_photo_body();
	});

	async function evaluateLocationGate(): Promise<LocationPromptBeforePhotoReason | null> {
		const permissionStatus = await getLocationPermissionStatus();
		return needsLocationPromptBeforePhoto({
			permissionStatus,
			hasPosition: Boolean(userPositionState.position),
			locationError: userPositionState.error
		});
	}

	async function shouldShowSettingsTutorial(
		reason: LocationPromptBeforePhotoReason
	): Promise<boolean> {
		if (reason === 'denied') {
			return true;
		}
		if (reason === 'unavailable') {
			const status = await getLocationPermissionStatus();
			return status === 'granted' || status === 'denied';
		}
		return false;
	}

	async function handleBeforePhotoOpen(): Promise<boolean> {
		if (locationPromptBusy) {
			return false;
		}
		const reason = await evaluateLocationGate();
		if (!reason) {
			return true;
		}
		locationPromptReason = reason;
		showSettingsHint = await shouldShowSettingsTutorial(reason);
		showLocationPrompt = true;
		return false;
	}

	async function openSettingsForLocationReason(
		reason: LocationPromptBeforePhotoReason
	): Promise<boolean> {
		if (reason === 'denied') {
			await openAppSettings();
			return true;
		}
		if (reason === 'unavailable') {
			const status = await getLocationPermissionStatus();
			if (status === 'granted') {
				await openLocationSettings();
				return true;
			}
			if (status === 'denied') {
				await openAppSettings();
				return true;
			}
		}
		return false;
	}

	async function retryLocationAccess(options?: {
		openCameraOnSuccess?: boolean;
	}): Promise<boolean> {
		locationPromptBusy = true;
		gpsLoading = true;
		try {
			await requestLocationPermissions();
			await requestCurrentPosition('capture');
			const reason = await evaluateLocationGate();
			locationPromptReason = reason;
			if (reason === null) {
				awaitingLocationSettingsReturn = false;
				openCameraAfterLocationSettings = false;
				showSettingsHint = false;
				return true;
			}

			const needsSettings = await shouldShowSettingsTutorial(reason);
			if (needsSettings) {
				showSettingsHint = true;
				await tick();
			}

			const openedSettings = await openSettingsForLocationReason(reason);
			if (openedSettings) {
				awaitingLocationSettingsReturn = true;
				openCameraAfterLocationSettings = options?.openCameraOnSuccess ?? false;
				showSettingsHint = true;
			} else {
				awaitingLocationSettingsReturn = false;
				openCameraAfterLocationSettings = false;
				if (!needsSettings) {
					showSettingsHint = false;
				}
			}
			return false;
		} finally {
			locationPromptBusy = false;
			if (userPositionState.position || userPositionState.error) {
				gpsLoading = false;
			}
		}
	}

	async function handleLocationSettingsReturn(): Promise<void> {
		if (!awaitingLocationSettingsReturn || locationPromptBusy) {
			return;
		}
		locationPromptBusy = true;
		gpsLoading = true;
		try {
			await requestCurrentPosition('capture');
			const reason = await evaluateLocationGate();
			locationPromptReason = reason;
			if (reason !== null) {
				return;
			}
			awaitingLocationSettingsReturn = false;
			showSettingsHint = false;
			showLocationPrompt = false;
			const shouldOpenCamera = openCameraAfterLocationSettings;
			openCameraAfterLocationSettings = false;
			if (shouldOpenCamera) {
				await photoPreviewRef?.openCamera({ bypassBeforeOpen: true });
			}
		} finally {
			locationPromptBusy = false;
			if (userPositionState.position || userPositionState.error) {
				gpsLoading = false;
			}
		}
	}

	async function confirmLocationPrompt(): Promise<void> {
		const ok = await retryLocationAccess({ openCameraOnSuccess: true });
		if (ok) {
			showLocationPrompt = false;
			locationPromptReason = null;
			await photoPreviewRef?.openCamera({ bypassBeforeOpen: true });
			return;
		}
		showLocationPrompt = true;
	}

	function continueWithoutLocation(): void {
		showLocationPrompt = false;
		locationPromptReason = null;
		awaitingLocationSettingsReturn = false;
		openCameraAfterLocationSettings = false;
		showSettingsHint = false;
		void photoPreviewRef?.openCamera({ bypassBeforeOpen: true });
	}

	async function retryLocationFromBanner(): Promise<void> {
		const ok = await retryLocationAccess({ openCameraOnSuccess: false });
		if (ok) {
			showLocationPrompt = false;
			locationPromptReason = null;
		}
	}

	$effect(() => {
		if (!isNativeApp()) {
			return;
		}

		let cancelled = false;
		let removeListener: (() => void) | undefined;

		void App.addListener('appStateChange', ({ isActive }) => {
			if (!isActive || cancelled) {
				return;
			}
			void handleLocationSettingsReturn();
		}).then((handle) => {
			if (cancelled) {
				void handle.remove();
				return;
			}
			removeListener = () => {
				void handle.remove();
			};
		});

		return () => {
			cancelled = true;
			removeListener?.();
		};
	});

	function handlePhotoSlotsChange(next: MultiPhotoSlot[]) {
		photoSlots = next;
		if (next.length > 0) {
			frontHeadingDegrees = currentHeading;
		}
	}

	function handlePhotoProcessingChange(busy: boolean) {
		photoProcessingBusy = busy;
	}

	function selectSpecies(name: string, event?: Event) {
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
	{#if !simplified || tutorialActive}
		<div class="order-0 flex flex-col gap-4 md:col-span-2">
			{#if !simplified}
				{#if showClimatePanel}
					<EnvironmentExposureField bind:value={environmentExposure} disabled={submitting} />
				{/if}
			{/if}
			<YrsScoreBanner
				gpsReady={savedPosition !== null}
				locationError={savedPosition ? '' : userPositionState.error}
				potentialScore={quickAssessment.potentialScore}
				{species}
			/>
		</div>
	{/if}

	<div class="order-1 flex flex-col gap-4">
		<MultiPhotoPreview
			bind:this={photoPreviewRef}
			bind:slots={photoSlots}
			{frontLabel}
			onchange={handlePhotoSlotsChange}
			onprocessingchange={handlePhotoProcessingChange}
			onbeforeopen={handleBeforePhotoOpen}
		/>

		{#if error}
			<p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
		{/if}

		{#if gpsWarning}
			<p class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status" aria-live="polite">
				{gpsWarning}
			</p>
		{/if}

		{#if gpsSuccess && !simplified}
			<p class="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800" role="status" aria-live="polite">
				{gpsSuccess}
			</p>
		{/if}

		<div>
			<VoiceNoteRecorderLazy
				bind:this={voiceRecorderRef}
				bind:value={voiceNote}
				bind:sessionActive={voiceSessionActive}
				disabled={submitting}
				compact
			/>
		</div>

		{#if androidVolumeHint}
			<p class="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800" role="status">
				{androidVolumeHint}
			</p>
		{/if}
	</div>

	<div class="order-2 flex flex-col gap-6">
		<div class="flex flex-col gap-2">
			<p class="text-sm font-medium text-forest-900">{m.capture_position_label()}</p>

			{#if simplified}
				<div data-capture-tutorial="gps">
				<GpsStatusCompact
					loading={gpsLoading}
					accuracyMeters={capturePosition?.accuracyMeters ?? null}
					bestAccuracyMeters={capturePosition
						? (bestCapturePosition?.accuracyMeters ?? capturePosition.accuracyMeters)
						: undefined}
					{locationLabel}
					{locationLoading}
				/>
				</div>
				{#if savedPosition}
					<GeoCapabilityBanner country={captureCountry} />
				{/if}
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
				<div data-capture-tutorial="gps">
				<GpsAccuracyBadge accuracyMeters={null} loading={true} />
				</div>
			{:else if capturePosition}
				<div data-capture-tutorial="gps">
				<GpsAccuracyBadge
					accuracyMeters={capturePosition.accuracyMeters}
					bestAccuracyMeters={bestCapturePosition?.accuracyMeters ??
						capturePosition.accuracyMeters}
				/>
				{#if locationLoading}
					<p class="text-sm text-muted" role="status">{m.capture_location_identifying()}</p>
				{:else if locationLabel}
					<p class="text-sm font-medium text-forest-800" role="status">
						{m.share_location({ location: locationLabel })}
					</p>
				{/if}
				</div>
				{#if savedPosition}
					<GeoCapabilityBanner country={captureCountry} />
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

			{#if !simplified && gpsCaptureHint}
				<p class="text-sm text-muted" role="status">{gpsCaptureHint}</p>
			{/if}

			{#if userPositionState.error}
				<div class="flex flex-col gap-2">
					<p class="app-card-muted px-3 py-2 text-sm text-amber-900" role="alert">
						{userPositionState.error}
					</p>
					<button
						type="button"
						disabled={locationPromptBusy || submitting}
						class="btn-secondary"
						onclick={() => void retryLocationFromBanner()}
					>
						{m.action_retry()}
					</button>
				</div>
			{/if}

			{#if !simplified}
			<details class="app-card-muted px-3 py-2 text-sm text-muted">
				<summary class="cursor-pointer font-medium text-forest-800">{m.gps_forest_tips_title()}</summary>
				<ul class="mt-2 list-disc space-y-1 pl-5">
					{#each gpsCaptureTips as tip (tip)}
						<li>{tip}</li>
					{/each}
				</ul>
			</details>
			{/if}
		</div>

		<div class="flex flex-col gap-2">
			<label for="species" class="text-sm font-medium text-forest-900">{m.capture_species_optional()}</label>

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
				latitude={savedPosition?.latitude ?? null}
				longitude={savedPosition?.longitude ?? null}
				onselect={(name) => selectSpecies(name)}
			/>

			{#if speciesFeedback}
				<p class="text-sm font-medium text-green-800" role="status">{speciesFeedback}</p>
			{/if}
		</div>

		{#if !simplified || tutorialActive}
			<CaptureAssessmentSection
				bind:assessment={quickAssessment}
				species={species}
				{submitting}
				{caliberOptions}
				{nebariOptions}
				{barkOptions}
				{deadwoodOptions}
				{sizeOptions}
			/>
		{/if}

		{#if !simplified}
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

	{#if !simplified && showClimatePanel}
		<div class="order-3 md:col-span-2">
			<ClimateDataSectionLazy
				climate={climateHistory}
				loading={climateLoading}
				error={climateError}
				approximate={climateApproximate}
				offline={!onlineState.online}
				{species}
				observedPhenologyStage={quickAssessment.observedPhenologyStage}
				cernageStatus={quickAssessment.cernageStatus}
				aoutementStatus={quickAssessment.aoutementStatus}
				leafFallPct={quickAssessment.leafFallPct}
				environmentExposure={environmentExposure}
				latitude={savedPosition?.latitude ?? null}
				longitude={savedPosition?.longitude ?? null}
				onretry={retryClimate}
			/>
		</div>
	{/if}
</div>
	</div>

	<footer class="capture-screen__footer flex flex-col gap-2">
		{#if showLegalReviewChip}
			<button
				type="button"
				class="w-full rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm font-medium text-amber-900 transition active:scale-[0.99]"
				onclick={() => (vetoChecklistOpen = true)}
			>
				{m.capture_legal_review_chip()}
			</button>
		{/if}
		<button
			type="button"
			data-capture-tutorial="save"
			data-capture-action="submit"
			disabled={submitting || gpsChecking || submitLock}
			class="btn-primary !h-14 gap-2 {saveSuccessPulse ? 'save-success-pulse' : ''}"
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
		trapFocus={onboardingState.phase !== 'capture'}
		title={m.gps_confirm_title()}
		message={gpsConfirmMessage}
		confirmLabel={m.confirm_save_anyway()}
		variant="default"
		onconfirm={confirmGpsSave}
		oncancel={cancelGpsSave}
	/>

	{#if showLocationPrompt}
		<LocationPermissionPrompt
			message={locationPromptMessage}
			showTutorial={showSettingsHint}
			busy={locationPromptBusy}
			onenable={() => void confirmLocationPrompt()}
			oncontinue={continueWithoutLocation}
		/>
	{/if}
</div>
