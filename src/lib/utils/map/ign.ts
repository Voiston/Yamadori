const WMTS_BASE = 'https://data.geopf.fr/wmts';

export type IgnLayerId = 'plan' | 'ortho' | 'hillshade';

export type IgnLayerConfig = {
	layer: string;
	format: 'image/png' | 'image/jpeg';
	maxZoom: number;
	attribution: string;
	style: string;
};

const LAYERS: Record<IgnLayerId, IgnLayerConfig> = {
	plan: {
		layer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
		format: 'image/png',
		maxZoom: 16,
		attribution: '© IGN / Géoplateforme — Plan IGN',
		style: 'normal'
	},
	ortho: {
		layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
		format: 'image/jpeg',
		maxZoom: 19,
		attribution: '© IGN / Géoplateforme — Orthophotos',
		style: 'normal'
	},
	hillshade: {
		layer: 'GEOGRAPHICALGRIDSYSTEMS.SLOPES.PAC',
		format: 'image/png',
		maxZoom: 17,
		attribution: '© IGN / Géoplateforme — Relief',
		style: 'normal'
	}
};

export const CADASTRE_LAYER: IgnLayerConfig = {
	layer: 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS',
	format: 'image/png',
	maxZoom: 16,
	attribution: '© IGN — Cadastre',
	style: 'PCI vecteur'
};

function getApiKey(): string | undefined {
	const key = import.meta.env.VITE_IGN_API_KEY;
	return typeof key === 'string' && key.trim() ? key.trim() : undefined;
}

export function buildIgnLayerTileUrl(config: IgnLayerConfig): string {
	let url =
		`${WMTS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
		`&LAYER=${config.layer}&STYLE=${encodeURIComponent(config.style)}&FORMAT=${config.format}` +
		`&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;

	const apiKey = getApiKey();
	if (apiKey) {
		url += `&apikey=${encodeURIComponent(apiKey)}`;
	}

	return url;
}

export function buildIgnTileUrl(layerId: IgnLayerId): string {
	return buildIgnLayerTileUrl(LAYERS[layerId]);
}

export function getIgnLayerConfig(layerId: IgnLayerId): IgnLayerConfig {
	return LAYERS[layerId];
}

export const IGN_ATTRIBUTION = '© IGN / Géoplateforme';
