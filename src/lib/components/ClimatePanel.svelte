<script lang="ts">
	import type { ClimateHistory } from '$lib/types/climate';

	let {
		climate = null,
		loading = false,
		error = ''
	}: {
		climate?: ClimateHistory | null;
		loading?: boolean;
		error?: string;
	} = $props();

	const frostYearLabels = $derived(
		climate?.yearlyStats.map((year) => `${year.frostDays} j · ${year.year}`).join(' · ') ?? ''
	);
</script>

<section class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
	<h3 class="text-sm font-medium text-forest-900">Historique climatique du biotope</h3>

	{#if loading}
		<div class="mt-4 flex items-center gap-3 text-sm text-muted" role="status">
			<svg
				class="h-5 w-5 animate-spin text-forest-600"
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
			Analyse du climat local (3 ans)…
		</div>
	{:else if climate}
		<p class="mt-1 text-xs text-muted">
			{climate.startDate} → {climate.endDate}
		</p>

		<div class="mt-4 flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-3">
			<article class="rounded-lg bg-sky-50 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">❄️ Température minimale absolue</p>
				<p class="mt-1 text-2xl font-semibold text-forest-800">
					{climate.absoluteMinTempC}°C
				</p>
				<p class="mt-1 text-xs text-muted">Minimum subi sur 3 ans</p>
			</article>

			<article class="rounded-lg bg-blue-50 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">🌧️ Pluviométrie annuelle moyenne</p>
				<p class="mt-1 text-2xl font-semibold text-forest-800">
					{climate.avgAnnualPrecipitationMm} mm/an
				</p>
				<p class="mt-1 text-xs text-muted">Essentiel pour doser l'arrosage chez soi</p>
			</article>

			<article class="rounded-lg bg-amber-50 px-4 py-3">
				<p class="text-sm font-medium text-forest-900">☀️ Jours de gel par an</p>
				<p class="mt-1 text-base font-semibold text-forest-800">{frostYearLabels}</p>
				<p class="mt-1 text-xs text-muted">
					Moyenne : {climate.avgFrostDaysPerYear} jours/an
				</p>
			</article>
		</div>
	{:else if error}
		<p class="mt-3 text-sm text-amber-700" role="status">{error}</p>
	{:else}
		<p class="mt-3 text-sm text-muted">Données climatiques non disponibles</p>
	{/if}
</section>
