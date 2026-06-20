<script lang="ts">
	import { DEFAULT_ASSESSMENT, type VoiceNote } from '$lib/types/tree';
	import type { ClimateHistory } from '$lib/types/climate';
	import { addTree } from '$lib/stores/trees.svelte';
	import { goHome } from '$lib/utils/app-navigation';
	import { formatBiologicalAltitude } from '$lib/utils/altitude';
	import { fetchClimateHistory } from '$lib/utils/climate';
	import { reverseGeocode } from '$lib/utils/geocoding';
	import {
		formatFrontLabel,
		requestOrientationPermission,
		subscribeDeviceOrientation
	} from '$lib/utils/compass';
	import { formatAccuracy, isPoorAccuracy } from '$lib/utils/gps';
	import { compressImage } from '$lib/utils/photo';
	import { getSpeciesSuggestionsForPosition } from '$lib/utils/species-suggestions';
	import { onMount } from 'svelte';
	import ClimatePanel from './ClimatePanel.svelte';
	import PhotoPreview from './PhotoPreview.svelte';
	import VoiceNoteRecorder from './VoiceNoteRecorder.svelte';

	let species = $state('');
	let notes = $state('');
	let voiceNote = $state<VoiceNote | null>(null);
	let photoFile = $state<File | null>(null);
	let photoPreview = $state('');
	let submitting = $state(false);
	let gpsWarning = $state('');
	let gpsSuccess = $state('');
	let error = $state('');

	let capturePosition = $state<{
		latitude: number;
		longitude: number;
		altitudeMeters: number | null;
		accuracyMeters: number | null;
	} | null>(null);
	let gpsLoading = $state(true);
	let climateHistory = $state<ClimateHistory | null>(null);
	let climateLoading = $state(false);
	let climateError = $state('');
	let locationLabel = $state<string | null>(null);
	let locationLoading = $state(false);
	let currentHeading = $state<number | null>(null);
	let frontHeadingDegrees = $state<number | null>(null);

	const suggestions = $derived.by(() => {
		if (!capturePosition) {
			return { regions: [], species: [] as string[] };
		}
		return getSpeciesSuggestionsForPosition(
			capturePosition.latitude,
			capturePosition.longitude
		);
	});

	const biotopeLabel = $derived.by(() => {
		const { regions } = suggestions;
		if (regions.length === 0) return '';
		if (regions.length === 1) return `${regions[0].name} — ${regions[0].biotope}`;
		return `${regions.length} biotopes — ${regions.map((r) => r.name).join(', ')}`;
	});

	const liveAltitudeLabel = $derived.by(() => {
		if (!capturePosition) {
			return null;
		}
		return formatBiologicalAltitude(capturePosition.altitudeMeters) ?? 'Altitude : non disponible';
	});

	const frontLabel = $derived(formatFrontLabel(frontHeadingDegrees));

	const showClimatePanel = $derived(
		capturePosition !== null && !isPoorAccuracy(capturePosition.accuracyMeters)
	);

	$effect(() => {
		const position = capturePosition;
		if (!position || isPoorAccuracy(position.accuracyMeters)) {
			climateHistory = null;
			climateError = '';
			climateLoading = false;
			return;
		}

		const { latitude, longitude } = position;
		const debounceId = setTimeout(() => {
			void (async () => {
				climateLoading = true;
				climateError = '';
				try {
					const result = await fetchClimateHistory(latitude, longitude);
					if (
						capturePosition?.latitude === latitude &&
						capturePosition?.longitude === longitude
					) {
						climateHistory = result;
					}
				} catch (err) {
					if (
						capturePosition?.latitude === latitude &&
						capturePosition?.longitude === longitude
					) {
						climateHistory = null;
						climateError =
							err instanceof Error ? err.message : 'Erreur lors de la récupération du climat.';
					}
				} finally {
					if (
						capturePosition?.latitude === latitude &&
						capturePosition?.longitude === longitude
					) {
						climateLoading = false;
					}
				}
			})();
		}, 2000);

		return () => clearTimeout(debounceId);
	});

	$effect(() => {
		const position = capturePosition;
		if (!position || isPoorAccuracy(position.accuracyMeters)) {
			locationLabel = null;
			locationLoading = false;
			return;
		}

		const { latitude, longitude } = position;
		const debounceId = setTimeout(() => {
			void (async () => {
				locationLoading = true;
				try {
					const result = await reverseGeocode(latitude, longitude);
					if (
						capturePosition?.latitude === latitude &&
						capturePosition?.longitude === longitude
					) {
						locationLabel = result;
					}
				} catch {
					if (
						capturePosition?.latitude === latitude &&
						capturePosition?.longitude === longitude
					) {
						locationLabel = null;
					}
				} finally {
					if (
						capturePosition?.latitude === latitude &&
						capturePosition?.longitude === longitude
					) {
						locationLoading = false;
					}
				}
			})();
		}, 500);

		return () => clearTimeout(debounceId);
	});

	onMount(() => {
		let watchId: number | null = null;
		let unsubscribeOrientation: (() => void) | null = null;

		void requestOrientationPermission().then((granted) => {
			if (granted) {
				unsubscribeOrientation = subscribeDeviceOrientation((value) => {
					currentHeading = value;
				});
			}
		});

		if (navigator.geolocation) {
			watchId = navigator.geolocation.watchPosition(
				(pos) => {
					capturePosition = {
						latitude: pos.coords.latitude,
						longitude: pos.coords.longitude,
						altitudeMeters: pos.coords.altitude ?? null,
						accuracyMeters: pos.coords.accuracy ?? null
					};
					gpsLoading = false;
				},
				() => {
					gpsLoading = false;
				},
				{
					enableHighAccuracy: true,
					maximumAge: 5_000,
					timeout: 15_000
				}
			);
		} else {
			gpsLoading = false;
		}

		return () => {
			unsubscribeOrientation?.();
			if (watchId !== null) {
				navigator.geolocation.clearWatch(watchId);
			}
		};
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		gpsWarning = '';
		gpsSuccess = '';

		const trimmedSpecies = species.trim();
		if (!trimmedSpecies) {
			error = 'Le nom de l\'espèce est requis.';
			return;
		}

		submitting = true;

		try {
			const latitude = capturePosition?.latitude ?? null;
			const longitude = capturePosition?.longitude ?? null;
			const accuracyMeters = capturePosition?.accuracyMeters ?? null;
			const altitudeMeters = capturePosition?.altitudeMeters ?? null;

			if (latitude === null || longitude === null) {
				gpsWarning = 'Position GPS indisponible — l\'arbre sera enregistré sans coordonnées.';
			} else if (isPoorAccuracy(accuracyMeters)) {
				gpsWarning = `Précision faible (${formatAccuracy(accuracyMeters)}) — position approximative en forêt`;
			} else {
				const altitudePart = formatBiologicalAltitude(altitudeMeters);
				gpsSuccess = altitudePart
					? `Position enregistrée (${formatAccuracy(accuracyMeters)}) · ${altitudePart}`
					: `Position enregistrée (${formatAccuracy(accuracyMeters)})`;
			}

			let photos: string[] = [];
			if (photoFile) {
				photos = [await compressImage(photoFile)];
			}

			await addTree({
				species: trimmedSpecies,
				notes: notes.trim(),
				photos,
				voiceNote,
				latitude,
				longitude,
				accuracyMeters,
				altitudeMeters,
				frontHeadingDegrees,
				isFavorite: false,
				climateHistory,
				locationLabel,
				assessment: { ...DEFAULT_ASSESSMENT }
			});

			await goHome();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.';
		} finally {
			submitting = false;
		}
	}

	function handlePhoto(file: File) {
		photoFile = file;
		frontHeadingDegrees = currentHeading;
	}

	function selectSpecies(name: string) {
		species = name;
	}
</script>

<form
	class="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.5fr)] lg:items-start lg:gap-8"
	onsubmit={handleSubmit}
>
	<div class="hidden flex-col gap-6 lg:sticky lg:top-20 lg:flex">
		<PhotoPreview bind:preview={photoPreview} {frontLabel} onfile={handlePhoto} />
		<VoiceNoteRecorder bind:value={voiceNote} disabled={submitting} />
	</div>

	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-2">
			<label for="species" class="text-sm font-medium text-forest-900">Espèce</label>
			<input
				id="species"
				type="text"
				bind:value={species}
				autocomplete="off"
				placeholder="Ex. Pin sylvestre, Genévrier..."
				disabled={submitting}
				class="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-base text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
			/>

			{#if gpsLoading}
				<p class="text-sm text-muted" role="status">Localisation en cours…</p>
			{:else if capturePosition}
				<p class="text-sm font-medium text-forest-800" role="status">
					{liveAltitudeLabel}
				</p>
				{#if locationLoading}
					<p class="text-sm text-muted" role="status">Identification du lieu…</p>
				{:else if locationLabel}
					<p class="text-sm font-medium text-forest-800" role="status">
						Repéré à : {locationLabel}
					</p>
				{/if}
			{/if}

			{#if !gpsLoading && capturePosition && suggestions.species.length > 0}
				<div class="flex flex-col gap-2">
					<p class="text-xs text-forest-600">{biotopeLabel}</p>
					<div
						class="flex flex-wrap gap-2"
						role="group"
						aria-label="Suggestions d'espèces selon votre position"
					>
						{#each suggestions.species as suggestion (suggestion)}
							<button
								type="button"
								onclick={() => selectSpecies(suggestion)}
								disabled={submitting}
								class="h-10 rounded-full px-4 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 {species ===
								suggestion
									? 'bg-forest-800 text-white'
									: 'border border-gray-200 bg-white text-forest-900'}"
								aria-pressed={species === suggestion}
							>
								{suggestion}
							</button>
						{/each}
					</div>
				</div>
			{:else if !gpsLoading && capturePosition && suggestions.species.length === 0}
				<p class="text-sm text-muted">Aucune suggestion pour cette zone.</p>
			{/if}
		</div>

		{#if showClimatePanel}
			<ClimatePanel climate={climateHistory} loading={climateLoading} error={climateError} />
		{/if}

		<div class="flex flex-col gap-2">
			<label for="notes" class="text-sm font-medium text-forest-900">Notes</label>
			<textarea
				id="notes"
				bind:value={notes}
				rows="4"
				placeholder="Taille, exposition, état sanitaire, accès..."
				disabled={submitting}
				class="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-forest-900 placeholder:text-gray-400 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 disabled:opacity-50"
			></textarea>
		</div>

		<div class="flex flex-col gap-6 lg:hidden">
			<VoiceNoteRecorder bind:value={voiceNote} disabled={submitting} />
			<PhotoPreview bind:preview={photoPreview} {frontLabel} onfile={handlePhoto} />
		</div>

		{#if error}
			<p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
		{/if}

		{#if gpsWarning}
			<p class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
				{gpsWarning}
			</p>
		{/if}

		{#if gpsSuccess}
			<p class="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
				{gpsSuccess}
			</p>
		{/if}

		<button
			type="submit"
			disabled={submitting}
			class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
		>
			{#if submitting}
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
				Enregistrement...
			{:else}
				Enregistrer l'arbre
			{/if}
		</button>
	</div>
</form>
