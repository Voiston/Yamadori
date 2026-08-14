import { resolveCountry } from '$lib/geo/resolveCountry';
import { lookupCadastreAt } from '$lib/geo/providers/cadastre/at';
import { lookupCadastreBe } from '$lib/geo/providers/cadastre/be';
import { lookupCadastreCh } from '$lib/geo/providers/cadastre/ch';
import { withCadastreCountryCache } from '$lib/geo/providers/cadastre/countryCache';
import { lookupCadastreDe } from '$lib/geo/providers/cadastre/de';
import { lookupCadastreEs } from '$lib/geo/providers/cadastre/es';
import { lookupCadastreGb } from '$lib/geo/providers/cadastre/gb';
import { lookupCadastreIt } from '$lib/geo/providers/cadastre/it';
import { lookupCadastreNl } from '$lib/geo/providers/cadastre/nl';
import { lookupCadastreNo } from '$lib/geo/providers/cadastre/no';
import { lookupCadastreSe } from '$lib/geo/providers/cadastre/se';
import { lookupCadastreUs } from '$lib/geo/providers/cadastre/us';
import { lookupCadastreCa } from '$lib/geo/providers/cadastre/ca';
import { lookupCadastreNz } from '$lib/geo/providers/cadastre/nz';
import { lookupCadastrePt } from '$lib/geo/providers/cadastre/pt';
import { lookupCadastreIe } from '$lib/geo/providers/cadastre/ie';
import { lookupCadastreAu } from '$lib/geo/providers/cadastre/au';
import { lookupCadastreDk } from '$lib/geo/providers/cadastre/dk';
import { lookupCadastreFi } from '$lib/geo/providers/cadastre/fi';
import { lookupCadastreJp } from '$lib/geo/providers/cadastre/jp';
import type { CadastreInfo } from '$lib/types/cadastre';
import { getApiDisabledError, isApiEnabled } from '$lib/utils/apiPolicy';
import { lookupCadastre } from '$lib/utils/cadastre';

/**
 * Country-aware cadastre lookup. Toggle key remains `ignCadastre` for settings compat.
 * FR → Apicarto; …; NZ → DOC PCL; PT → DGT Cadastro Predial.
 * EU providers go through shared IDB/memory cache (US/CA/NZ/FR cache themselves).
 */
export async function lookupCadastreForCoords(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	const country = resolveCountry(latitude, longitude);
	if (!country) return null;

	// FR checks the toggle inside lookupCadastre (after cache/coverage).
	// Non-FR providers need an explicit gate so Settings still applies.
	if (country !== 'FR' && !isApiEnabled('ignCadastre')) {
		throw new Error(getApiDisabledError('ignCadastre'));
	}

	const cached = (prefix: string, fetcher: () => Promise<CadastreInfo | null>) =>
		withCadastreCountryCache(prefix, latitude, longitude, fetcher);

	switch (country) {
		case 'FR':
			return lookupCadastre(latitude, longitude, options);
		case 'ES':
			return cached('es', () => lookupCadastreEs(latitude, longitude, options));
		case 'IT':
			return cached('it', () => lookupCadastreIt(latitude, longitude, options));
		case 'DE':
			return cached('de', () => lookupCadastreDe(latitude, longitude, options));
		case 'GB':
			return cached('gb', () => lookupCadastreGb(latitude, longitude, options));
		case 'CH':
			return cached('ch', () => lookupCadastreCh(latitude, longitude, options));
		case 'AT':
			return cached('at', () => lookupCadastreAt(latitude, longitude, options));
		case 'BE':
			return cached('be', () => lookupCadastreBe(latitude, longitude, options));
		case 'NL':
			return cached('nl', () => lookupCadastreNl(latitude, longitude, options));
		case 'SE':
			return cached('se', () => lookupCadastreSe(latitude, longitude, options));
		case 'NO':
			return cached('no', () => lookupCadastreNo(latitude, longitude, options));
		case 'US':
			return lookupCadastreUs(latitude, longitude, options);
		case 'CA':
			return lookupCadastreCa(latitude, longitude, options);
		case 'NZ':
			return lookupCadastreNz(latitude, longitude, options);
		case 'PT':
			return cached('pt', () => lookupCadastrePt(latitude, longitude, options));
		case 'IE':
			return cached('ie', () => lookupCadastreIe(latitude, longitude, options));
		case 'AU':
			return lookupCadastreAu(latitude, longitude, options);
		case 'DK':
			return cached('dk', () => lookupCadastreDk(latitude, longitude, options));
		case 'FI':
			return cached('fi', () => lookupCadastreFi(latitude, longitude, options));
		case 'JP':
			return cached('jp', () => lookupCadastreJp(latitude, longitude, options));
		default:
			return null;
	}
}
