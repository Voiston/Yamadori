<script lang="ts">
	import { base } from '$app/paths';
	import { clearParking, parkingStore, saveParking } from '$lib/stores/parking.svelte';
	import { headingToCardinal } from '$lib/utils/compass';
	import { getCoordinates } from '$lib/utils/geo';
	import { formatAccuracy, isPoorAccuracy } from '$lib/utils/gps';
	import {
		formatDistance,
		haversineBearingDeg,
		haversineDistanceM
	} from '$lib/utils/haversine';
	import { userPositionState } from '$lib/utils/userPosition.svelte';

	let {
		variant = 'overlay'
	}: {
		variant?: 'overlay' | 'inline';
	} = $props();

	let saving = $state(false);
	let feedback = $state('');
	let warning = $state('');

	let parking = $derived(parkingStore.position);

	let distance = $derived.by(() => {
		if (!parking || !userPositionState.position) return null;
		return haversineDistanceM(
			userPositionState.position.latitude,
			userPositionState.position.longitude,
			parking.latitude,
			parking.longitude
		);
	});

	let bearing = $derived.by(() => {
		if (!parking || !userPositionState.position) return null;
		return haversineBearingDeg(
			userPositionState.position.latitude,
			userPositionState.position.longitude,
			parking.latitude,
			parking.longitude
		);
	});

	let statusText = $derived.by(() => {
		if (!parking) return '';
		if (distance === null || bearing === null) {
			return 'Calcul de la position…';
		}
		return `La voiture est à ${formatDistance(distance)} au ${headingToCardinal(bearing)}`;
	});

	async function handleSave() {
		saving = true;
		feedback = '';
		warning = '';

		try {
			const capture = await getCoordinates();
			if (capture.latitude === null || capture.longitude === null) {
				warning = 'Position GPS indisponible — réessayez en plein air.';
				return;
			}

			if (isPoorAccuracy(capture.accuracyMeters)) {
				warning = `Précision faible (${formatAccuracy(capture.accuracyMeters)}) — position approximative`;
			}

			await saveParking(capture);
			feedback = 'Position de la voiture enregistrée';
		} finally {
			saving = false;
		}
	}

	async function handleClear() {
		await clearParking();
		feedback = '';
		warning = '';
	}
</script>

<div
	class={variant === 'overlay'
		? 'rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm'
		: 'rounded-xl border border-gray-200 bg-white p-4'}
>
	{#if !parking}
		<button
			type="button"
			onclick={handleSave}
			disabled={saving}
			class="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
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
			{saving ? 'Enregistrement…' : 'Enregistrer la position de la voiture'}
		</button>
	{:else}
		<p class="text-center text-sm font-medium text-forest-900">{statusText}</p>

		<div class="mt-3 grid grid-cols-2 gap-2">
			<a
				href="{base}/parking/compass"
				class="col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-forest-800 text-sm font-semibold text-white transition active:scale-[0.98]"
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
				Ouvrir la boussole
			</a>
			<button
				type="button"
				onclick={handleSave}
				disabled={saving}
				class="flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-xs font-medium text-forest-900 transition active:scale-[0.98] disabled:opacity-60"
			>
				{saving ? '…' : 'Réenregistrer'}
			</button>
			<button
				type="button"
				onclick={handleClear}
				class="flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-xs font-medium text-muted transition active:scale-[0.98]"
			>
				Effacer
			</button>
		</div>
	{/if}

	{#if feedback}
		<p class="mt-2 text-center text-xs text-green-800" role="status">{feedback}</p>
	{/if}
	{#if warning}
		<p class="mt-2 text-center text-xs text-amber-800" role="status">{warning}</p>
	{/if}
</div>
