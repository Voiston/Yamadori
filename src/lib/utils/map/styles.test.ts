import { describe, expect, it } from 'vitest';
import { createIgnMapStyle, createMapStyle } from './styles';

const BASEMAP_SOURCE_IDS = ['ign-plan', 'ign-ortho', 'ign-hillshade', 'ign-cadastre'] as const;
const BASEMAP_LAYER_IDS = [
	'ign-plan-layer',
	'ign-ortho-layer',
	'ign-hillshade-layer',
	'ign-cadastre-layer'
] as const;

describe('createMapStyle', () => {
	it('keeps stable source/layer ids across every supported country', () => {
		for (const country of [
			'FR',
			'ES',
			'IT',
			'DE',
			'GB',
			'CH',
			'AT',
			'BE',
			'NL',
			'SE',
			'NO',
			null
		] as const) {
			const style = createMapStyle(country);
			for (const sourceId of BASEMAP_SOURCE_IDS) {
				expect(style.sources[sourceId]).toBeDefined();
			}
			const layerIds = style.layers.map((layer) => layer.id);
			for (const layerId of BASEMAP_LAYER_IDS) {
				expect(layerIds).toContain(layerId);
			}
		}
	});

	it('defaults to the international fallback when no country is given', () => {
		const withoutCountry = createMapStyle();
		const withNull = createMapStyle(null);
		expect(withoutCountry.sources['ign-plan']).toEqual(withNull.sources['ign-plan']);
	});

	it('createIgnMapStyle stays equivalent to createMapStyle("FR")', () => {
		const legacy = createIgnMapStyle();
		const explicit = createMapStyle('FR');
		expect(legacy.sources['ign-plan']).toEqual(explicit.sources['ign-plan']);
		expect(legacy.sources['ign-cadastre']).toEqual(explicit.sources['ign-cadastre']);
	});
});
