import { JP_PERMIT_SOURCE_URLS } from '$lib/geo/legal/jpSources';

/**
 * Actionable Japan permit / agency starting points (national + MOE regional hubs).
 * Not a full 47-prefecture directory — always verify locally.
 */

export type JpPermitLink = {
	id: string;
	label: string;
	url: string;
};

type MoeRegion = {
	id: string;
	label: string;
	url: string;
};

/** Seven MOE regional environment office hubs (plus Okinawa via Kyushu block). */
const MOE_REGIONAL_HUBS: Record<string, MoeRegion> = {
	hokkaido: {
		id: 'moe_hokkaido',
		label: 'MOE — Hokkaido Regional Environment Office',
		url: 'https://hokkaido.env.go.jp/'
	},
	tohoku: {
		id: 'moe_tohoku',
		label: 'MOE — Tohoku Regional Environment Office',
		url: 'https://tohoku.env.go.jp/'
	},
	kanto: {
		id: 'moe_kanto',
		label: 'MOE — Kanto Regional Environment Office',
		url: 'https://kanto.env.go.jp/'
	},
	chubu: {
		id: 'moe_chubu',
		label: 'MOE — Chubu Regional Environment Office',
		url: 'https://chubu.env.go.jp/'
	},
	kinki: {
		id: 'moe_kinki',
		label: 'MOE — Kinki Regional Environment Office',
		url: 'https://kinki.env.go.jp/'
	},
	chushikoku: {
		id: 'moe_chushikoku',
		label: 'MOE — Chugoku-Shikoku Regional Environment Office',
		url: 'https://chushikoku.env.go.jp/'
	},
	kyushu: {
		id: 'moe_kyushu',
		label: 'MOE — Kyushu Regional Environment Office',
		url: 'https://kyushu.env.go.jp/'
	}
};

/** ISO3166-2 lvl4 (JP-XX) → MOE regional block. */
const ISO_TO_REGION: Record<string, keyof typeof MOE_REGIONAL_HUBS> = {
	'JP-01': 'hokkaido',
	'JP-02': 'tohoku',
	'JP-03': 'tohoku',
	'JP-04': 'tohoku',
	'JP-05': 'tohoku',
	'JP-06': 'tohoku',
	'JP-07': 'tohoku',
	'JP-08': 'kanto',
	'JP-09': 'kanto',
	'JP-10': 'kanto',
	'JP-11': 'kanto',
	'JP-12': 'kanto',
	'JP-13': 'kanto',
	'JP-14': 'kanto',
	'JP-15': 'chubu',
	'JP-16': 'chubu',
	'JP-17': 'chubu',
	'JP-18': 'chubu',
	'JP-19': 'chubu',
	'JP-20': 'chubu',
	'JP-21': 'chubu',
	'JP-22': 'chubu',
	'JP-23': 'chubu',
	'JP-24': 'kinki',
	'JP-25': 'kinki',
	'JP-26': 'kinki',
	'JP-27': 'kinki',
	'JP-28': 'kinki',
	'JP-29': 'kinki',
	'JP-30': 'kinki',
	'JP-31': 'chushikoku',
	'JP-32': 'chushikoku',
	'JP-33': 'chushikoku',
	'JP-34': 'chushikoku',
	'JP-35': 'chushikoku',
	'JP-36': 'chushikoku',
	'JP-37': 'chushikoku',
	'JP-38': 'chushikoku',
	'JP-39': 'chushikoku',
	'JP-40': 'kyushu',
	'JP-41': 'kyushu',
	'JP-42': 'kyushu',
	'JP-43': 'kyushu',
	'JP-44': 'kyushu',
	'JP-45': 'kyushu',
	'JP-46': 'kyushu',
	'JP-47': 'kyushu'
};

const PREFECTURE_NAME_TO_ISO: Record<string, string> = {
	hokkaido: 'JP-01',
	北海道: 'JP-01',
	aomori: 'JP-02',
	青森: 'JP-02',
	青森県: 'JP-02',
	iwate: 'JP-03',
	岩手: 'JP-03',
	岩手県: 'JP-03',
	miyagi: 'JP-04',
	宮城: 'JP-04',
	宮城県: 'JP-04',
	akita: 'JP-05',
	秋田: 'JP-05',
	秋田県: 'JP-05',
	yamagata: 'JP-06',
	山形: 'JP-06',
	山形県: 'JP-06',
	fukushima: 'JP-07',
	福島: 'JP-07',
	福島県: 'JP-07',
	ibaraki: 'JP-08',
	茨城: 'JP-08',
	茨城県: 'JP-08',
	tochigi: 'JP-09',
	栃木: 'JP-09',
	栃木県: 'JP-09',
	gunma: 'JP-10',
	群馬: 'JP-10',
	群馬県: 'JP-10',
	saitama: 'JP-11',
	埼玉: 'JP-11',
	埼玉県: 'JP-11',
	chiba: 'JP-12',
	千葉: 'JP-12',
	千葉県: 'JP-12',
	tokyo: 'JP-13',
	東京: 'JP-13',
	東京都: 'JP-13',
	kanagawa: 'JP-14',
	神奈川: 'JP-14',
	神奈川県: 'JP-14',
	niigata: 'JP-15',
	新潟: 'JP-15',
	新潟県: 'JP-15',
	toyama: 'JP-16',
	富山: 'JP-16',
	富山県: 'JP-16',
	ishikawa: 'JP-17',
	石川: 'JP-17',
	石川県: 'JP-17',
	fukui: 'JP-18',
	福井: 'JP-18',
	福井県: 'JP-18',
	yamanashi: 'JP-19',
	山梨: 'JP-19',
	山梨県: 'JP-19',
	nagano: 'JP-20',
	長野: 'JP-20',
	長野県: 'JP-20',
	gifu: 'JP-21',
	岐阜: 'JP-21',
	岐阜県: 'JP-21',
	shizuoka: 'JP-22',
	静岡: 'JP-22',
	静岡県: 'JP-22',
	aichi: 'JP-23',
	愛知: 'JP-23',
	愛知県: 'JP-23',
	mie: 'JP-24',
	三重: 'JP-24',
	三重県: 'JP-24',
	shiga: 'JP-25',
	滋賀: 'JP-25',
	滋賀県: 'JP-25',
	kyoto: 'JP-26',
	京都: 'JP-26',
	京都府: 'JP-26',
	osaka: 'JP-27',
	大阪: 'JP-27',
	大阪府: 'JP-27',
	hyogo: 'JP-28',
	hyōgo: 'JP-28',
	兵庫: 'JP-28',
	兵庫県: 'JP-28',
	nara: 'JP-29',
	奈良: 'JP-29',
	奈良県: 'JP-29',
	wakayama: 'JP-30',
	和歌山: 'JP-30',
	和歌山県: 'JP-30',
	tottori: 'JP-31',
	鳥取: 'JP-31',
	鳥取県: 'JP-31',
	shimane: 'JP-32',
	島根: 'JP-32',
	島根県: 'JP-32',
	okayama: 'JP-33',
	岡山: 'JP-33',
	岡山県: 'JP-33',
	hiroshima: 'JP-34',
	広島: 'JP-34',
	広島県: 'JP-34',
	yamaguchi: 'JP-35',
	山口: 'JP-35',
	山口県: 'JP-35',
	tokushima: 'JP-36',
	徳島: 'JP-36',
	徳島県: 'JP-36',
	kagawa: 'JP-37',
	香川: 'JP-37',
	香川県: 'JP-37',
	ehime: 'JP-38',
	愛媛: 'JP-38',
	愛媛県: 'JP-38',
	kochi: 'JP-39',
	kōchi: 'JP-39',
	高知: 'JP-39',
	高知県: 'JP-39',
	fukuoka: 'JP-40',
	福岡: 'JP-40',
	福岡県: 'JP-40',
	saga: 'JP-41',
	佐賀: 'JP-41',
	佐賀県: 'JP-41',
	nagasaki: 'JP-42',
	長崎: 'JP-42',
	長崎県: 'JP-42',
	kumamoto: 'JP-43',
	熊本: 'JP-43',
	熊本県: 'JP-43',
	oita: 'JP-44',
	ōita: 'JP-44',
	大分: 'JP-44',
	大分県: 'JP-44',
	miyazaki: 'JP-45',
	宮崎: 'JP-45',
	宮崎県: 'JP-45',
	kagoshima: 'JP-46',
	鹿児島: 'JP-46',
	鹿児島県: 'JP-46',
	okinawa: 'JP-47',
	沖縄: 'JP-47',
	沖縄県: 'JP-47'
};

/**
 * Normalize prefecture name or ISO3166-2 code to `JP-XX` when known.
 */
export function resolveJpPrefecture(prefectureHint?: string | null): string | null {
	const raw = (prefectureHint || '').trim();
	if (!raw) return null;
	const upper = raw.toUpperCase();
	if (/^JP-\d{2}$/.test(upper) && ISO_TO_REGION[upper]) return upper;
	const lower = raw.toLowerCase().replace(/\s+ken$/i, '').replace(/\s+fu$/i, '').replace(/\s+to$/i, '');
	if (PREFECTURE_NAME_TO_ISO[lower]) return PREFECTURE_NAME_TO_ISO[lower];
	if (PREFECTURE_NAME_TO_ISO[raw]) return PREFECTURE_NAME_TO_ISO[raw];
	// Strip 県/府/都 suffix
	const stripped = raw.replace(/(県|府|都)$/, '');
	if (PREFECTURE_NAME_TO_ISO[stripped]) return PREFECTURE_NAME_TO_ISO[stripped];
	if (PREFECTURE_NAME_TO_ISO[stripped.toLowerCase()]) return PREFECTURE_NAME_TO_ISO[stripped.toLowerCase()];
	return null;
}

function regionalHubForPrefecture(iso: string | null): MoeRegion | null {
	if (!iso) return null;
	const regionKey = ISO_TO_REGION[iso];
	return regionKey ? MOE_REGIONAL_HUBS[regionKey] : null;
}

export function getJpPermitLinks(input: {
	zoneType: string;
	prefectureCode?: string;
}): JpPermitLink[] {
	const iso = resolveJpPrefecture(input.prefectureCode);
	const regional = regionalHubForPrefecture(iso);

	const national: JpPermitLink[] = [
		{
			id: 'jp_moe_parks',
			label: 'MOE — National parks (permits & park rules)',
			url: JP_PERMIT_SOURCE_URLS.moeNationalParks
		},
		{
			id: 'jp_designated_plants',
			label: 'MOE — Designated plants (指定植物)',
			url: JP_PERMIT_SOURCE_URLS.moeDesignatedPlants
		},
		{
			id: 'jp_endangered',
			label: 'MOE — Endangered species conservation',
			url: JP_PERMIT_SOURCE_URLS.moeEndangeredSpecies
		}
	];

	if (regional) {
		national.push({
			id: regional.id,
			label: regional.label,
			url: regional.url
		});
	} else {
		national.push({
			id: 'jp_regional_moe',
			label: 'MOE — Regional environmental offices',
			url: JP_PERMIT_SOURCE_URLS.moeRegionalOffices
		});
	}

	const forestry: JpPermitLink = {
		id: 'jp_forestry_agency',
		label: 'Forestry Agency — national forests (国有林)',
		url: JP_PERMIT_SOURCE_URLS.forestryAgency
	};

	const ownerId: JpPermitLink[] = [
		{
			id: 'jp_touki',
			label: '登記情報提供サービス — identify the landowner',
			url: JP_PERMIT_SOURCE_URLS.toukiRegistry
		},
		{
			id: 'jp_municipality',
			label: 'MIC — local government / municipality codes',
			url: JP_PERMIT_SOURCE_URLS.soumuMunicipalities
		}
	];

	switch (input.zoneType) {
		case 'national_park':
		case 'wilderness':
		case 'national_wildlife_area':
		case 'other_federal':
		case 'state_park':
		case 'state_forest':
		case 'national_forest':
		case 'local_park':
			return [...national, forestry];
		case 'crown_unverified':
		case 'private':
		default:
			// Outside mapped park/forest tenure: help identify the owner, not park permits.
			return [...ownerId, ...(regional ? [regional] : [])];
	}
}
