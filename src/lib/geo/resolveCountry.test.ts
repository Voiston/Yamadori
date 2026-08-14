import { describe, expect, it } from 'vitest';
import { hasCadastreProvider, resolveCountry } from './resolveCountry';

describe('resolveCountry', () => {
	it('resolves Paris to FR', () => {
		expect(resolveCountry(48.8566, 2.3522)).toBe('FR');
	});

	it('resolves Madrid to ES', () => {
		expect(resolveCountry(40.4168, -3.7038)).toBe('ES');
	});

	it('resolves Rome to IT', () => {
		expect(resolveCountry(41.9028, 12.4964)).toBe('IT');
	});

	it('resolves Berlin to DE', () => {
		expect(resolveCountry(52.52, 13.405)).toBe('DE');
	});

	it('resolves London to GB', () => {
		expect(resolveCountry(51.5074, -0.1278)).toBe('GB');
	});

	it('resolves Zurich to CH (over FR/DE/IT overlap)', () => {
		expect(resolveCountry(47.3769, 8.5417)).toBe('CH');
	});

	it('resolves Geneva to CH', () => {
		expect(resolveCountry(46.2044, 6.1432)).toBe('CH');
	});

	it('resolves Lugano to CH', () => {
		expect(resolveCountry(46.0037, 8.9511)).toBe('CH');
	});

	it('resolves Lyon to FR (outside CH bbox center preference)', () => {
		expect(resolveCountry(45.764, 4.8357)).toBe('FR');
	});

	it('resolves Milan to IT', () => {
		expect(resolveCountry(45.4642, 9.19)).toBe('IT');
	});

	it('resolves Stuttgart to DE', () => {
		expect(resolveCountry(48.7758, 9.1829)).toBe('DE');
	});

	it('resolves Vienna to AT', () => {
		expect(resolveCountry(48.2082, 16.3738)).toBe('AT');
	});

	it('resolves Innsbruck to AT (over DE/IT/CH overlap)', () => {
		expect(resolveCountry(47.2692, 11.4041)).toBe('AT');
	});

	it('resolves Graz to AT', () => {
		expect(resolveCountry(47.0707, 15.4395)).toBe('AT');
	});

	it('resolves Munich to DE (outside AT priority)', () => {
		expect(resolveCountry(48.1351, 11.582)).toBe('DE');
	});

	it('resolves Brussels to BE (over FR/DE overlap)', () => {
		expect(resolveCountry(50.8503, 4.3517)).toBe('BE');
	});

	it('resolves Antwerp to BE', () => {
		expect(resolveCountry(51.2194, 4.4025)).toBe('BE');
	});

	it('resolves Liège to BE', () => {
		expect(resolveCountry(50.6326, 5.5797)).toBe('BE');
	});

	it('resolves Lille to FR (outside BE priority)', () => {
		expect(resolveCountry(50.6292, 3.0573)).toBe('FR');
	});

	it('resolves Aachen to DE (outside BE priority)', () => {
		expect(resolveCountry(50.7753, 6.0839)).toBe('DE');
	});

	it('resolves Luxembourg City outside BE (FR bbox overlap only)', () => {
		expect(resolveCountry(49.6116, 6.1319)).not.toBe('BE');
	});

	it('resolves Amsterdam to NL', () => {
		expect(resolveCountry(52.3676, 4.9041)).toBe('NL');
	});

	it('resolves Rotterdam to NL', () => {
		expect(resolveCountry(51.9225, 4.4792)).toBe('NL');
	});

	it('resolves Maastricht to NL (over BE overlap)', () => {
		expect(resolveCountry(50.8514, 5.691)).toBe('NL');
	});

	it('resolves Eindhoven to NL (over BE overlap)', () => {
		expect(resolveCountry(51.4416, 5.4697)).toBe('NL');
	});

	it('keeps Antwerp as BE (over NL overlap)', () => {
		expect(resolveCountry(51.2194, 4.4025)).toBe('BE');
	});

	it('resolves Stockholm to SE', () => {
		expect(resolveCountry(59.3293, 18.0686)).toBe('SE');
	});

	it('resolves Gothenburg to SE', () => {
		expect(resolveCountry(57.7089, 11.9746)).toBe('SE');
	});

	it('resolves Oslo to NO', () => {
		expect(resolveCountry(59.9139, 10.7522)).toBe('NO');
	});

	it('resolves Bergen to NO', () => {
		expect(resolveCountry(60.3913, 5.3221)).toBe('NO');
	});

	it('resolves Malmö to SE (over DE bbox)', () => {
		expect(resolveCountry(55.605, 13.0038)).toBe('SE');
	});

	it('does not resolve Copenhagen as SE', () => {
		expect(resolveCountry(55.6761, 12.5683)).not.toBe('SE');
	});

	it('resolves New York to US', () => {
		expect(resolveCountry(40.7128, -74.006)).toBe('US');
	});

	it('resolves Dublin to IE', () => {
		expect(resolveCountry(53.3498, -6.2603)).toBe('IE');
	});

	it('resolves Cork to IE', () => {
		expect(resolveCountry(51.8985, -8.4756)).toBe('IE');
	});

	it('resolves Galway to IE', () => {
		expect(resolveCountry(53.2707, -9.0568)).toBe('IE');
	});

	it('resolves Donegal town to IE (not NI)', () => {
		expect(resolveCountry(54.6538, -8.1096)).toBe('IE');
	});

	it('resolves Belfast to GB (Northern Ireland)', () => {
		expect(resolveCountry(54.5973, -5.9301)).toBe('GB');
	});

	it('resolves Derry to GB (Northern Ireland)', () => {
		expect(resolveCountry(54.9966, -7.3086)).toBe('GB');
	});

	it('resolves Manchester to GB', () => {
		expect(resolveCountry(53.4808, -2.2426)).toBe('GB');
	});

	it('resolves Copenhagen to DK', () => {
		expect(resolveCountry(55.6761, 12.5683)).toBe('DK');
	});

	it('resolves Aarhus to DK', () => {
		expect(resolveCountry(56.1629, 10.2039)).toBe('DK');
	});

	it('resolves Odense to DK', () => {
		expect(resolveCountry(55.4038, 10.4024)).toBe('DK');
	});

	it('resolves Bornholm to DK', () => {
		expect(resolveCountry(55.1604, 14.8667)).toBe('DK');
	});

	it('resolves Malmö to SE (east of Øresund)', () => {
		expect(resolveCountry(55.605, 13.0038)).toBe('SE');
	});

	it('resolves Hamburg to DE', () => {
		expect(resolveCountry(53.5511, 9.9937)).toBe('DE');
	});

	it('resolves Helsinki to FI', () => {
		expect(resolveCountry(60.1699, 24.9384)).toBe('FI');
	});

	it('resolves Turku to FI (over SE bbox)', () => {
		expect(resolveCountry(60.4518, 22.2666)).toBe('FI');
	});

	it('resolves Tampere to FI (over SE bbox)', () => {
		expect(resolveCountry(61.4978, 23.761)).toBe('FI');
	});

	it('resolves Oulu to FI', () => {
		expect(resolveCountry(65.0121, 25.4651)).toBe('FI');
	});

	it('resolves Mariehamn (Åland) to FI', () => {
		expect(resolveCountry(60.1, 19.94)).toBe('FI');
	});

	it('resolves Umeå to SE (west of Bothnia)', () => {
		expect(resolveCountry(63.8258, 20.263)).toBe('SE');
	});

	it('resolves Tromsø to NO', () => {
		expect(resolveCountry(69.6492, 18.9553)).toBe('NO');
	});
});

describe('hasCadastreProvider', () => {
	it('is true for supported countries including SE and NO', () => {
		expect(hasCadastreProvider('FR')).toBe(true);
		expect(hasCadastreProvider('ES')).toBe(true);
		expect(hasCadastreProvider('IT')).toBe(true);
		expect(hasCadastreProvider('DE')).toBe(true);
		expect(hasCadastreProvider('GB')).toBe(true);
		expect(hasCadastreProvider('CH')).toBe(true);
		expect(hasCadastreProvider('AT')).toBe(true);
		expect(hasCadastreProvider('BE')).toBe(true);
		expect(hasCadastreProvider('NL')).toBe(true);
		expect(hasCadastreProvider('SE')).toBe(true);
		expect(hasCadastreProvider('NO')).toBe(true);
		expect(hasCadastreProvider('IE')).toBe(true);
		expect(hasCadastreProvider('DK')).toBe(true);
		expect(hasCadastreProvider('FI')).toBe(true);
	});

	it('is false for null', () => {
		expect(hasCadastreProvider(null)).toBe(false);
	});
});
