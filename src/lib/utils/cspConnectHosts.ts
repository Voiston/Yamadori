/**
 * Hosts allowed in the WebView CSP `connect-src`.
 * Keep in sync with the meta tag in `src/app.html`.
 * Tile CDNs are included because MapLibre fetches tiles over XHR, not <img>.
 */
export const CSP_CONNECT_HOSTS = [
	'https://api.open-meteo.com',
	'https://archive-api.open-meteo.com',
	'https://nominatim.openstreetmap.org',
	'https://apicarto.ign.fr',
	'https://data.geopf.fr',
	'https://api-lannuaire.service-public.gouv.fr',
	'https://ovc.catastro.meh.es',
	'http://ovc.catastro.meh.es',
	'https://ccff02.minfin.fgov.be',
	'https://wms.cartografia.agenziaentrate.gov.it',
	'https://snicws.dgterritorio.gov.pt',
	'https://api.kartverket.no',
	'https://service.pdok.nl',
	'https://inspire.landregistry.gov.uk',
	'https://gdi.berlin.de',
	'https://www.geodaten-mv.de',
	'https://www.geodatenportal.sachsen-anhalt.de',
	'https://geodienste.hamburg.de',
	'https://geodienste.bremen.de',
	'https://www.wfs.nrw.de',
	'https://owsproxy.lgl-bw.de',
	'https://geo5.service24.rlp.de',
	'https://api3.geo.admin.ch',
	'https://wmts.geo.admin.ch',
	'https://maps.zh.ch',
	'https://wfs.geo.bs.ch',
	'https://bio.discomap.eea.europa.eu',
	'https://edits.nationalmap.gov',
	'https://maps-cartes.ec.gc.ca',
	'https://mapserver.doc.govt.nz',
	'https://gis.environment.gov.au',
	'https://services.arcgis.com',
	'https://services1.arcgis.com',
	'https://services-eu1.arcgis.com',
	'https://datamap.gov.wales',
	'https://environment.data.gov.uk',
	'https://ogc.nature.scot',
	'https://a.tile.opentopomap.org',
	'https://b.tile.opentopomap.org',
	'https://c.tile.opentopomap.org',
	'https://server.arcgisonline.com',
	'https://basemap.nationalmap.gov',
	'https://mapsneu.wien.gv.at',
	'https://maps1.wien.gv.at',
	'https://maps2.wien.gv.at',
	'https://maps3.wien.gv.at',
	'https://maps4.wien.gv.at',
	'https://cache.kartverket.no',
	'https://sgx.geodatenzentrum.de',
	'https://www.ign.es',
	'https://servicios.idee.es',
	'https://api.os.uk'
] as const;

export const CSP_CONNECT_HOST_SET = new Set<string>(CSP_CONNECT_HOSTS);

export function originFromUrl(value: string): string | null {
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
		if (!url.hostname) return null;
		return `${url.protocol}//${url.hostname}`;
	} catch {
		return null;
	}
}

export function isAllowedConnectOrigin(origin: string): boolean {
	return CSP_CONNECT_HOST_SET.has(origin);
}

export function cspConnectSrcDirective(): string {
	return [`'self'`, ...CSP_CONNECT_HOSTS].join(' ');
}
