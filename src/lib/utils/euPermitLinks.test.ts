import { describe, expect, it } from 'vitest';
import {
	getEuPermitLinks,
	resolveAtLand,
	resolveBeRegion,
	resolveChCanton,
	resolveDeLand,
	resolveEsCcaa,
	resolveItRegione,
	resolveNlProvince,
	resolvePtRegion,
	resolveSeLan,
	resolveNoStatsforvalter
} from '$lib/geo/legal/euPermitLinks';

describe('getEuPermitLinks', () => {
	it('returns zone-aware FR links (mairie first on private)', () => {
		const privateLinks = getEuPermitLinks('FR', 'private');
		expect(privateLinks[0]?.id).toBe('fr_service_public');
		expect(privateLinks[0]?.url).toBe(
			'https://lannuaire.service-public.gouv.fr/navigation/mairie'
		);
		expect(privateLinks[0]?.url).not.toContain('F34574');
		expect(privateLinks[0]?.url).not.toContain('vosdroits');
		const forestLinks = getEuPermitLinks('FR', 'state_forest');
		expect(forestLinks[0]?.id).toBe('fr_onf');
		expect(forestLinks[0]?.url).toBe(
			'https://www.onf.fr/aux-cotes-des-territoires/annuaire-communal'
		);
	});

	it('covers BE Flanders and Brussels hubs', () => {
		const links = getEuPermitLinks('BE', 'private');
		expect(links.map((l) => l.id)).toEqual(
			expect.arrayContaining(['be_spw', 'be_vlaanderen', 'be_brussels'])
		);
		expect(links.find((l) => l.id === 'be_vlaanderen')?.url).toContain('soortenbescherming');
		expect(links.find((l) => l.id === 'be_spw')?.url).toContain('biodiversite.wallonie');
		expect(links.find((l) => l.id === 'be_brussels')?.url).toContain('2012031122');
	});

	it('prioritizes BE Flanders when hint or coords say so', () => {
		expect(resolveBeRegion({ commune: 'Gent' })).toBe('flanders');
		expect(resolveBeRegion({ commune: 'Hasselt' })).toBe('flanders');
		expect(resolveBeRegion({ commune: 'Kortrijk' })).toBe('flanders');
		const links = getEuPermitLinks('BE', 'private', {
			latitude: 51.05,
			longitude: 3.72
		});
		expect(links[0]?.id).toBe('be_cadgis');
		expect(links[1]?.id).toBe('be_vlaanderen');
	});

	it('prioritizes BE Wallonie for southern coords', () => {
		expect(resolveBeRegion({ latitude: 50.4, longitude: 4.45 })).toBe('wallonie');
		expect(resolveBeRegion({ commune: 'Arlon' })).toBe('wallonie');
		expect(resolveBeRegion({ commune: 'Eupen' })).toBe('wallonie');
		const links = getEuPermitLinks('BE', 'private', {
			latitude: 50.4,
			longitude: 4.45
		});
		expect(links[0]?.id).toBe('be_cadgis');
		expect(links[1]?.id).toBe('be_spw');
	});

	it('prioritizes BE Brussels ordinance last for capital box', () => {
		const links = getEuPermitLinks('BE', 'private', {
			latitude: 50.85,
			longitude: 4.35
		});
		expect(links[0]?.id).toBe('be_cadgis');
		expect(links.at(-1)?.id).toBe('be_brussels');
	});

	it('deepens PT ICNF/DGT and injects Madeira / Azores portals', () => {
		const links = getEuPermitLinks('PT', 'state_forest');
		expect(links.find((l) => l.id === 'pt_icnf')?.url).toContain('sobreiros');
		expect(links.find((l) => l.id === 'pt_dgt')?.url).toContain('cadastro');
		expect(resolvePtRegion({ commune: 'Funchal Madeira' })).toBe('madeira');
		expect(resolvePtRegion({ latitude: 32.6669, longitude: -16.9241 })).toBe('madeira');
		expect(getEuPermitLinks('PT', 'private', { commune: 'Funchal' })[0]?.id).toBe('pt_madeira');
		expect(resolvePtRegion({ commune: 'Ponta Delgada Açores' })).toBe('azores');
		expect(resolvePtRegion({ latitude: 37.7412, longitude: -25.6756 })).toBe('azores');
		expect(getEuPermitLinks('PT', 'state_forest', { commune: 'Ponta Delgada' })[0]?.id).toBe(
			'pt_azores'
		);
		expect(resolvePtRegion({ latitude: 38.7223, longitude: -9.1393 })).toBe('mainland');
	});

	it('returns DE forest-oriented links for state forest', () => {
		const links = getEuPermitLinks('DE', 'state_forest');
		expect(links.some((l) => l.id === 'de_lander_forst')).toBe(true);
		expect(links.find((l) => l.id === 'de_bfn')?.url).toContain('schutzgebiete');
		expect(links.length).toBeGreaterThanOrEqual(2);
	});

	it('injects DE Land forst portal when NRW hinted', () => {
		expect(resolveDeLand({ stateHint: 'DE-NW' })).toBe('NW');
		const links = getEuPermitLinks('DE', 'state_forest', { stateHint: 'Nordrhein-Westfalen' });
		expect(links[0]?.id).toBe('de_forst_nw');
		expect(links.some((l) => l.id === 'de_lander_forst')).toBe(true);
	});

	it('injects DE RP forst portal when Rheinland-Pfalz hinted', () => {
		expect(resolveDeLand({ stateHint: 'DE-RP' })).toBe('RP');
		const links = getEuPermitLinks('DE', 'state_forest', { commune: 'Mainz Rheinland-Pfalz' });
		expect(links[0]?.id).toBe('de_forst_rp');
	});

	it('injects DE BY / NI / HE forst portals', () => {
		expect(resolveDeLand({ stateHint: 'DE-BY' })).toBe('BY');
		expect(resolveDeLand({ latitude: 48.1351, longitude: 11.582 })).toBe('BY');
		expect(getEuPermitLinks('DE', 'state_forest', { commune: 'München Bayern' })[0]?.id).toBe(
			'de_forst_by'
		);
		expect(resolveDeLand({ stateHint: 'Niedersachsen' })).toBe('NI');
		expect(getEuPermitLinks('DE', 'state_forest', { stateHint: 'DE-NI' })[0]?.id).toBe(
			'de_forst_ni'
		);
		expect(resolveDeLand({ commune: 'Frankfurt Hessen' })).toBe('HE');
		expect(getEuPermitLinks('DE', 'state_forest', { stateHint: 'DE-HE' })[0]?.id).toBe(
			'de_forst_he'
		);
		expect(resolveDeLand({ stateHint: 'DE-BE' })).toBe('BE');
		expect(getEuPermitLinks('DE', 'state_forest', { commune: 'Berlin' })[0]?.url).toBe(
			'https://www.berlin.de/forsten/'
		);
	});

	it('distinguishes Sachsen from Sachsen-Anhalt', () => {
		expect(resolveDeLand({ stateHint: 'Sachsen-Anhalt' })).toBe('ST');
		expect(resolveDeLand({ stateHint: 'Sachsen' })).toBe('SN');
		expect(resolveDeLand({ commune: 'Dresden' })).toBe('SN');
	});

	it('injects ES CCAA portal when commune matches', () => {
		expect(resolveEsCcaa({ commune: 'Barcelona' })).toBe('cat');
		const links = getEuPermitLinks('ES', 'private', { commune: 'Barcelona' });
		expect(links[0]?.id).toBe('es_ccaa_cat');
		expect(links.some((l) => l.id === 'es_miteco')).toBe(true);
	});

	it('uses LESRPE page for ES national species hub (not dead CCAA URL)', () => {
		const links = getEuPermitLinks('ES', 'private');
		const hub = links.find((l) => l.id === 'es_ccaa');
		expect(hub?.url).toContain('02c-lesrpe-ceesa');
		expect(hub?.url).not.toContain('comunidades-autonomas');
	});

	it('resolves additional ES CCAA (Asturias, Canarias)', () => {
		expect(resolveEsCcaa({ commune: 'Oviedo' })).toBe('ast');
		expect(resolveEsCcaa({ commune: 'Tenerife' })).toBe('cn');
		expect(getEuPermitLinks('ES', 'private', { commune: 'Santander' })[0]?.id).toBe(
			'es_ccaa_cb'
		);
	});

	it('uses deep MASE URL and Catasto for IT permits', () => {
		const links = getEuPermitLinks('IT', 'private');
		expect(links.map((l) => l.id)).toEqual(
			expect.arrayContaining(['it_mase', 'it_catasto', 'it_carabinieri_forestali'])
		);
		expect(links.find((l) => l.id === 'it_mase')?.url).toContain(
			'aree-naturali-protette-e-rete-natura-2000'
		);
		expect(links.find((l) => l.id === 'it_mase')?.url).not.toBe('https://www.mase.gov.it/');
		expect(links.find((l) => l.id === 'it_carabinieri_forestali')?.url).toContain(
			'tutela-forestale-ambientale-e-agroalimentare'
		);
		expect(links.find((l) => l.id === 'it_carabinieri_forestali')?.url).not.toContain(
			'organizzazione-per-la-tutela'
		);
	});

	it('injects IT regione portal when commune matches', () => {
		expect(resolveItRegione({ commune: 'Roma' })).toBe('laz');
		expect(resolveItRegione({ commune: 'Cosenza' })).toBe('cal');
		const links = getEuPermitLinks('IT', 'state_forest', { commune: 'Potenza' });
		expect(links[0]?.id).toBe('it_reg_bas');
		expect(getEuPermitLinks('IT', 'private', { commune: 'Firenze' })[0]?.url).toBe(
			'https://www.regione.toscana.it/ambiente'
		);
		expect(getEuPermitLinks('IT', 'private', { commune: 'Roma' })[0]?.url).toBe(
			'https://www.parchilazio.it/'
		);
		expect(getEuPermitLinks('IT', 'private', { commune: "L'Aquila" })[0]?.url).toBe(
			'https://www.regione.abruzzo.it/contenuti/ambiente'
		);
	});

	it('returns empty for US (handled by usPermitLinks)', () => {
		expect(getEuPermitLinks('US', 'national_forest')).toEqual([]);
	});

	it('returns CH BAFU biodiversite + cadastre (no shallow canton hub)', () => {
		const links = getEuPermitLinks('CH', 'private');
		expect(links.some((l) => l.id === 'ch_bafu')).toBe(true);
		expect(links.some((l) => l.id === 'ch_cadastre')).toBe(true);
		expect(links.find((l) => l.id === 'ch_bafu')?.url).toContain('biodiversite');
		expect(links.find((l) => l.id === 'ch_cantons')).toBeUndefined();
	});

	it('injects CH canton portal when commune matches', () => {
		expect(resolveChCanton({ commune: 'Genève' })).toBe('GE');
		expect(resolveChCanton({ stateHint: 'ZH' })).toBe('ZH');
		const links = getEuPermitLinks('CH', 'private', { commune: 'Zürich' });
		expect(links[0]?.id).toBe('ch_canton_zh');
		expect(getEuPermitLinks('CH', 'private', { commune: 'Bern' })[0]?.url).toBe(
			'https://www.be.ch/umwelt'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Schwyz' })[0]?.url).toBe(
			'https://www.sz.ch/umwelt'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Fribourg' })[0]?.url).toBe(
			'https://www.fr.ch/sen'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Basel-Stadt' })[0]?.url).toBe(
			'https://www.aue.bs.ch/'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Aargau' })[0]?.url).toBe(
			'https://www.ag.ch/umwelt'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'St. Gallen' })[0]?.url).toBe(
			'https://www.sg.ch/umwelt-natur/umwelt.html'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Graubünden' })[0]?.url).toBe(
			'https://www.anu.gr.ch/'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Ticino' })[0]?.url).toBe(
			'https://www4.ti.ch/dt/da/spaas/'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Zug' })[0]?.url).toBe(
			'https://zg.ch/de/baudirektion/amt-fuer-umwelt'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Glarus' })[0]?.url).toBe(
			'https://www.gl.ch/'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Appenzell Innerrhoden' })[0]?.url).toBe(
			'https://www.ai.ch/themen/natur-umwelt'
		);
		expect(getEuPermitLinks('CH', 'private', { commune: 'Jura' })[0]?.url).toBe(
			'https://www.jura.ch/fr/Autorites.html'
		);
	});

	it('returns GB NatureScot after owner-ID hubs for Scotland coords', () => {
		const links = getEuPermitLinks('GB', 'private', {
			latitude: 57.13,
			longitude: -3.72
		});
		expect(links[0]?.id).toBe('gb_local_council');
		expect(links.find((l) => l.id === 'gb_naturescot')?.url).toContain('plants-and-fungi');
		expect(links.map((l) => l.id)).toEqual(
			expect.arrayContaining(['gb_natural_england', 'gb_naturescot', 'gb_nrw', 'gb_daera'])
		);
	});

	it('returns deep GB felling / wildlife licence hubs for England', () => {
		const links = getEuPermitLinks('GB', 'state_forest', {
			latitude: 51.5,
			longitude: -0.12
		});
		expect(links[0]?.id).toBe('gb_forestry');
		expect(links.find((l) => l.id === 'gb_forestry')?.url).toContain('felling');
		expect(links.find((l) => l.id === 'gb_natural_england')?.url).toContain('wildlife-licen');
	});

	it('returns GB NRW after owner-ID hubs for Wales coords', () => {
		const links = getEuPermitLinks('GB', 'private', {
			latitude: 52.5,
			longitude: -3.8
		});
		expect(links[0]?.id).toBe('gb_local_council');
		expect(links.find((l) => l.id === 'gb_nrw')?.url).toContain('protected-species-licensing');
	});

	it('returns GB DAERA after owner-ID hubs for NI coords', () => {
		const links = getEuPermitLinks('GB', 'private', {
			latitude: 54.6,
			longitude: -5.93
		});
		expect(links[0]?.id).toBe('gb_local_council');
		expect(links.find((l) => l.id === 'gb_daera')?.url).toContain('wildlife-licensing');
	});

	it('returns deep NPWS FPO / Coillte hubs for Ireland', () => {
		const links = getEuPermitLinks('IE', 'state_forest');
		expect(links.map((l) => l.id)).toEqual(
			expect.arrayContaining(['ie_npws', 'ie_coillte', 'ie_local_authority'])
		);
		expect(links[0]?.id).toBe('ie_coillte');
		expect(links.find((l) => l.id === 'ie_npws')?.url).toContain('flora-protection-order');
		expect(links.find((l) => l.id === 'ie_coillte')?.url).toContain('/our-forests');
		expect(links.find((l) => l.id === 'ie_local_authority')?.url).toContain('/en');
		expect(getEuPermitLinks('IE', 'private')[0]?.id).toBe('ie_local_authority');
	});

	it('returns deep BMLUK Forstgesetz hubs for Austria', () => {
		const links = getEuPermitLinks('AT', 'state_forest');
		expect(links.find((l) => l.id === 'at_bmluk')?.url).toContain('bmluk');
		expect(links.find((l) => l.id === 'at_forstg')?.url).toContain('Forstgesetz');
	});

	it('injects AT Land portal for Vienna and Tirol', () => {
		expect(resolveAtLand({ commune: 'Wien' })).toBe('W');
		expect(getEuPermitLinks('AT', 'private', { commune: 'Wien' })[0]?.id).toBe('at_land_w');
		expect(resolveAtLand({ latitude: 47.2692, longitude: 11.4041 })).toBe('T');
		expect(
			getEuPermitLinks('AT', 'private', { latitude: 47.2692, longitude: 11.4041 })[0]?.id
		).toBe('at_land_t');
	});

	it('returns deep RVO Omgevingswet / flora hubs for Netherlands', () => {
		const links = getEuPermitLinks('NL', 'private');
		expect(links.find((l) => l.id === 'nl_rvo')?.url).toContain('omgevingswet-natuur');
		expect(links.find((l) => l.id === 'nl_rvo_flora')?.url).toContain('flora-en-fauna');
		expect(links.find((l) => l.id === 'nl_iplo_hout')?.url).toContain('houtopstand');
	});

	it('injects NL province portal for Amsterdam (Noord-Holland)', () => {
		expect(resolveNlProvince({ commune: 'Amsterdam' })).toBe('NH');
		expect(getEuPermitLinks('NL', 'private', { commune: 'Amsterdam' })[0]?.id).toBe('nl_prov_nh');
	});

	it('returns deep Skogsstyrelsen artskydd hubs for Sweden', () => {
		const links = getEuPermitLinks('SE', 'state_forest');
		expect(links.find((l) => l.id === 'se_skogsstyrelsen')?.url).toContain('artskydd');
		expect(links.find((l) => l.id === 'se_naturvardsverket')?.url).toContain('allemansratten');
	});

	it('injects SE län portal for Stockholm', () => {
		expect(resolveSeLan({ commune: 'Stockholm' })).toBe('AB');
		expect(getEuPermitLinks('SE', 'private', { commune: 'Stockholm' })[0]?.id).toBe('se_lan_ab');
	});

	it('returns deep MD allemannsretten hubs for Norway', () => {
		const links = getEuPermitLinks('NO', 'state_forest');
		expect(links.find((l) => l.id === 'no_miljodir')?.url).toContain('allemannsretten');
		expect(links.find((l) => l.id === 'no_landbruksdirektoratet')?.url).toContain('skogbruk');
		expect(links.find((l) => l.id === 'no_naturmangfold')?.url).toContain('2009-06-19-100');
	});

	it('injects NO Statsforvalter portal for Oslo', () => {
		expect(resolveNoStatsforvalter({ commune: 'Oslo' })).toBe('OV');
		expect(getEuPermitLinks('NO', 'private', { commune: 'Oslo' })[0]?.id).toBe('no_sf_ov');
	});

	it('returns deep Naturstyrelsen / artsfredning hubs for Denmark', () => {
		const links = getEuPermitLinks('DK', 'state_forest');
		expect(links.find((l) => l.id === 'dk_naturstyrelsen')?.url).toContain(
			'aktiviteter-og-tilladelser'
		);
		expect(links.find((l) => l.id === 'dk_miljostyrelsen')?.url).toContain('2021/521');
		expect(links.every((l) => !l.url.includes('kl.dk'))).toBe(true);
		expect(getEuPermitLinks('DK', 'private')[0]?.id).toBe('dk_kommune');
		expect(getEuPermitLinks('DK', 'private').find((l) => l.id === 'dk_kommune')?.url).toContain(
			'borger.dk'
		);
	});

	it('returns deep Metsähallitus / jokaisenoikeudet hubs for Finland', () => {
		const links = getEuPermitLinks('FI', 'state_forest');
		expect(links.find((l) => l.id === 'fi_metsahallitus')?.url).toContain('/luvat');
		expect(links.find((l) => l.id === 'fi_ymparisto')?.url).toContain('jokaisenoikeudet');
		expect(links.find((l) => l.id === 'fi_kunta')?.url).toContain('/kunnat');
		expect(getEuPermitLinks('FI', 'private')[0]?.id).toBe('fi_kunta');
	});
});
