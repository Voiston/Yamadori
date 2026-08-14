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
			// Géoportail permalinks no longer centre; use cartes.gouv.fr (IGN successor).
			return {
				label: 'cartes.gouv.fr',
				url:
					`https://cartes.gouv.fr/explorer-les-cartes/?c=${lng},${lat}&z=18` +
					`&l=CADASTRALPARCELS.PARCELLAIRE_EXPRESS:100(1;1;1;0)&permalink=yes`
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
			// Registry portals have no lat/lon deep-link; OSM centres the field point.
			const osm = `https://www.openstreetmap.org/#map=17/${lat}/${lng}`;
			const nation = resolveGbNation(latitude, longitude);
			if (nation === 'scotland') {
				return {
					label: 'ScotLIS (Registers of Scotland) (GPS position)',
					url: osm
				};
			}
			if (nation === 'ni') {
				return {
					label: 'nidirect — Land Registry (LPS) (GPS position)',
					url: osm
				};
			}
			return {
				label: 'HM Land Registry (GPS position)',
				url: osm
			};
		}
		case 'PT':
			// SNIC / DGT visualizers are often auth-walled; OSM centres the field point for hand-off.
			return {
				label: 'Mapa — posição GPS (DGT Cadastro via pesquisa local)',
				url: `https://www.openstreetmap.org/#map=17/${lat}/${lng}`
			};
		case 'IE':
			// Tailte Éireann / landdirect often require account; OSM centres the field point.
			return {
				label: 'Tailte Éireann — land registry (GPS position)',
				url: `https://www.openstreetmap.org/#map=17/${lat}/${lng}`
			};
		case 'DK':
			// Matriklen (Datafordeler) needs API key; OSM + Dataforsyning landing for hand-off.
			return {
				label: 'Dataforsyning / Matriklen (GPS position)',
				url: `https://www.openstreetmap.org/#map=17/${lat}/${lng}`
			};
		case 'FI':
			// MML kiinteistö APIs need API key; OSM / Karttapaikka hand-off.
			return {
				label: 'Karttapaikka / kiinteistöt (GPS position)',
				url: `https://www.openstreetmap.org/#map=17/${lat}/${lng}`
			};
		case 'US':
			// PAD-US explorer has no lat/lon deep-link; OSM centres the field point.
			return {
				label: 'USGS PAD-US (GPS position)',
				url: `https://www.openstreetmap.org/#map=17/${lat}/${lng}`
			};
		case 'CA':
			// Geo.ca map browser has no lat/lon deep-link; OSM centres the field point.
			return {
				label: 'CPCAD — Geo.ca (GPS position)',
				url: `https://www.openstreetmap.org/#map=17/${lat}/${lng}`
			};
		case 'NZ':
			return {
				label: 'DOC Maps',
				url: `https://www.doc.govt.nz/map/index.html?lat=${lat}&lon=${lng}`
			};
		case 'AU':
			// CAPAD info page has no lat/lon deep-link; OSM centres the field point.
			return {
				label: 'CAPAD — DCCEEW (GPS position)',
				url: `https://www.openstreetmap.org/#map=17/${lat}/${lng}`
			};
		case 'JP':
			return {
				label: 'GSI Maps',
				url: `https://maps.gsi.go.jp/#15/${lat}/${lng}/&base=std`
			};
		default:
			return null;
	}
}
