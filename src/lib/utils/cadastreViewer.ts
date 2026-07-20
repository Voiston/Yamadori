import type { CountryCode } from '$lib/geo/countries';
import type { CadastreInfo } from '$lib/types/cadastre';
import { resolveGbNation } from '$lib/geo/providers/protected/gb';

export type CadastreViewerLink = {
	url: string;
	/** Official map / registry name for display. */
	label: string;
};

/**
 * Deep link to an official (or best-available) cadastre / land viewer.
 * Never includes owner identity — coords and/or parcel refs only.
 */
export function getCadastreViewerLink(
	country: CountryCode | null,
	latitude: number,
	longitude: number,
	info?: CadastreInfo | null
): CadastreViewerLink | null {
	if (!country || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}

	const lat = latitude.toFixed(6);
	const lng = longitude.toFixed(6);

	switch (country) {
		case 'FR':
			return {
				label: 'Géoportail',
				url:
					`https://www.geoportail.gouv.fr/carte?c=${lng},${lat}&z=18` +
					`&l0=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:100&permalink=yes`
			};
		case 'ES': {
			const rc = info?.codeInsee?.trim();
			if (rc && rc.length >= 14) {
				return {
					label: 'Sede Electrónica del Catastro',
					url: `https://www1.sedecatastro.gob.es/Cartografia/mapa.aspx?refcat=${encodeURIComponent(rc)}`
				};
			}
			return {
				label: 'Sede Electrónica del Catastro',
				url: `https://www1.sedecatastro.gob.es/Cartografia/mapa.aspx?latitud=${lat}&longitud=${lng}`
			};
		}
		case 'IT':
			// Geoportale redirects aggressively; portal landing + lat/lon query for hand-off.
			return {
				label: 'Geoportale Cartografia Catastale',
				url:
					'https://www.agenziaentrate.gov.it/portale/web/guest/schede/fabbricatiterreni/consultazione-cartografia-catastale/geoportale-cartografico-catastale' +
					`?lat=${lat}&lon=${lng}`
			};
		case 'CH': {
			const egrid = info?.codeInsee?.trim();
			if (egrid && /^CH\d/i.test(egrid)) {
				return {
					label: 'map.geo.admin.ch',
					url: `https://map.geo.admin.ch/?lang=fr&topic=ech&bgLayer=ch.swisstopo.pixelkarte-farbe&layers=ch.swisstopo-vd.amtliche-vermessung&EGRID=${encodeURIComponent(egrid)}`
				};
			}
			return {
				label: 'map.geo.admin.ch',
				url: `https://map.geo.admin.ch/?lang=fr&topic=ech&bgLayer=ch.swisstopo.pixelkarte-farbe&layers=ch.swisstopo-vd.amtliche-vermessung&swisssearch=${lat},${lng}&zoom=12`
			};
		}
		case 'BE':
			return {
				label: 'CadGIS Viewer',
				url: `https://eservices.minfin.fgov.be/cadgis/?lat=${lat}&lon=${lng}`
			};
		case 'NL':
			return {
				label: 'Kadaster / PDOK Viewer',
				url: `https://www.pdok.nl/viewer/#?center=${lng}%2C${lat}&zoom=16`
			};
		case 'NO': {
			const kommune = info?.codeInsee?.trim();
			const parcel = info?.parcelNumber?.trim();
			const params = new URLSearchParams({
				nord: lat,
				ost: lng
			});
			if (kommune) params.set('kommunenummer', kommune);
			if (parcel) params.set('matrikkelnummer', parcel);
			return {
				label: 'Seeiendom (Kartverket)',
				url: `https://seeiendom.kartverket.no/?${params}`
			};
		}
		case 'SE':
			return {
				label: 'Lantmäteriet Min Karta',
				url: `https://minkarta.lantmateriet.se/?e=${lng}&n=${lat}&z=16&map=topowebbkartan`
			};
		case 'DE':
			return {
				label: 'Geoportal.de',
				url: `https://www.geoportal.de/map.html?center=${lng},${lat}&zoom=16`
			};
		case 'AT':
			return {
				label: 'basemap.at',
				url: `https://basemap.at/#map=17/${lat}/${lng}`
			};
		case 'GB': {
			const nation = resolveGbNation(latitude, longitude);
			if (nation === 'scotland') {
				return {
					label: 'ScotLIS (Registers of Scotland)',
					url: 'https://scotlis.ros.gov.uk/'
				};
			}
			if (nation === 'ni') {
				return {
					label: 'nidirect — Land Registry (LPS)',
					url: 'https://www.nidirect.gov.uk/articles/searching-land-registry'
				};
			}
			return {
				label: 'HM Land Registry',
				url: 'https://www.gov.uk/search-property-information-land-registry'
			};
		}
		case 'PT':
			// SNIC / DGT visualizers are often auth-walled; OSM centres the field point for hand-off.
			return {
				label: 'Mapa — posição GPS (DGT Cadastro via pesquisa local)',
				url: `https://www.openstreetmap.org/#map=17/${lat}/${lng}`
			};
		case 'US':
			return {
				label: 'USGS PAD-US Map Viewer',
				url: `https://maps.usgs.gov/padus/#/?lat=${lat}&lon=${lng}&z=12`
			};
		case 'CA':
			return {
				label: 'CPCAD — Open Maps',
				url: `https://search.open.canada.ca/openmap/6c343726-1e92-451a-876a-76e17d398a1c`
			};
		case 'NZ':
			return {
				label: 'DOC Maps',
				url: `https://www.doc.govt.nz/map/index.html?lat=${lat}&lon=${lng}`
			};
		default:
			return null;
	}
}
