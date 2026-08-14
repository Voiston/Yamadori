<script lang="ts">
	import type { CountryCode } from '$lib/geo/countries';
	import {
		getGeoCapabilities,
		hasPartialOrMissingCapability,
		type GeoCapabilities
	} from '$lib/geo/capabilities';
	import * as m from '$lib/paraglide/messages.js';

	let {
		country,
		protectedCoverage = undefined
	}: {
		country: CountryCode | null;
		protectedCoverage?: 'full' | 'partial' | 'unsupported' | undefined;
	} = $props();

	const caps = $derived(getGeoCapabilities(country));
	const show = $derived(
		hasPartialOrMissingCapability(caps) ||
			protectedCoverage === 'partial' ||
			protectedCoverage === 'unsupported'
	);

	function lineFor(caps: GeoCapabilities): string {
		if (!caps.country) return m.geo_capability_unsupported();
		if (caps.country === 'GB') return m.geo_capability_gb_partial();
		if (caps.country === 'DE') return m.geo_capability_de_partial();
		if (caps.country === 'CH') return m.geo_capability_ch_partial();
		if (caps.country === 'AT') return m.geo_capability_at_partial();
		if (caps.country === 'BE') return m.geo_capability_be_partial();
		if (caps.country === 'NL') return m.geo_capability_nl_partial();
		if (caps.country === 'SE') return m.geo_capability_se_partial();
		if (caps.country === 'NO') return m.geo_capability_no_partial();
		if (caps.country === 'US') return m.geo_capability_us_partial();
		if (caps.country === 'CA') return m.geo_capability_ca_partial();
		if (caps.country === 'NZ') return m.geo_capability_nz_partial();
		if (caps.country === 'PT') return m.geo_capability_pt_partial();
		if (caps.country === 'IE') return m.geo_capability_ie_partial();
		if (caps.country === 'DK') return m.geo_capability_dk_partial();
		if (caps.country === 'FI') return m.geo_capability_fi_partial();
		if (caps.country === 'AU') return m.geo_capability_au_partial();
		if (caps.country === 'JP') return m.geo_capability_jp_partial();
		if (caps.municipality === 'partial') return m.geo_capability_municipality_partial();
		return m.geo_capability_partial_generic();
	}
</script>

{#if show}
	<p
		class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950"
		role="status"
	>
		{lineFor(caps)}
	</p>
{/if}
