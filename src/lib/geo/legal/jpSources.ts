/**
 * Japan legal sources matrix — article → official URL → UI claim → what we do NOT claim.
 *
 * HUMAN REVIEW GATE: `JP_LEGAL_HUMAN_REVIEW.status` must stay `pending_human_review`
 * until a Japanese-law-literate reviewer signs off. Do not market this pack as
 * “béton / production-legal” while status is pending.
 *
 * This is an aid for field ethics checklists — not legal advice.
 */

export type JpLegalSourceRow = {
	/** Stable article id used in `legal/jp.ts` / i18n. */
	id: string;
	group: 'property' | 'forest' | 'environment';
	/** Law / instrument (JP + EN short name). */
	instrument: string;
	/** Concrete provision when known. */
	provision: string;
	/** Canonical official URL (japaneselawtranslation, e-Gov, or MOE). */
	url: string;
	/** One-line claim shown in the app (must stay conservative). */
	uiClaim: string;
	/** Explicit non-claims — reviewers check these first. */
	doesNotClaim: string;
};

/**
 * Flip to `{ status: 'reviewed', reviewedAt: ISO, reviewer: '…' }` only after human sign-off.
 * Automated tests assert that pending packs expose this flag.
 */
export const JP_LEGAL_HUMAN_REVIEW = {
	status: 'pending_human_review' as const,
	reviewedAt: null as string | null,
	reviewer: null as string | null,
	notes:
		'National-layer sources only. Prefectural ordinances, park-specific 指定植物 lists, and site permits are out of scope until reviewed.'
};

const JLT_LAWS = 'https://www.japaneselawtranslation.go.jp/en/laws';

export const JP_LEGAL_SOURCES: readonly JpLegalSourceRow[] = [
	{
		id: 'jp_minpo_206',
		group: 'property',
		instrument: '民法 (Civil Code)',
		provision: 'Article 206 — Ownership',
		url: `${JLT_LAWS}/view/3494/en`,
		uiClaim:
			'Ownership includes the right to use, profit from, and dispose of a thing within the limits of laws and regulations.',
		doesNotClaim: 'Does not authorize collecting plants on land you do not own.'
	},
	{
		id: 'jp_minpo_207',
		group: 'property',
		instrument: '民法 (Civil Code)',
		provision: 'Article 207 — Ownership of land',
		url: `${JLT_LAWS}/view/3494/en`,
		uiClaim:
			'Ownership of land extends to above and below the surface within legal limits — trees and soil on the land belong to the landowner.',
		doesNotClaim: 'Does not replace trespass / local land-entry rules.'
	},
	{
		id: 'jp_keihou_235',
		group: 'property',
		instrument: '刑法 (Penal Code)',
		provision: 'Article 235 — Theft',
		url: `${JLT_LAWS}/view/1960/en`,
		uiClaim:
			'Taking another person’s property can constitute theft. Uprooting a tree without a lawful title is treated as taking property.',
		doesNotClaim: 'Does not list every related offence (damage to property, forest offences, etc.).'
	},
	{
		id: 'jp_shinrin',
		group: 'forest',
		instrument: '森林法 (Forest Act)',
		provision: 'Forest management / felling control framework',
		url: 'https://laws.e-gov.go.jp/document?lawid=326AC0000000249',
		uiClaim:
			'Forest operations (including felling) are regulated. National and privately managed forests are not a free-for-all for transplanting trees.',
		doesNotClaim:
			'Does not map every national-forest stand or equate 森林法 with a yamadori permit.'
	},
	{
		id: 'jp_rinya',
		group: 'forest',
		instrument: '林野庁 / national forests (Forestry Agency)',
		provision: 'National forest management & use rules',
		url: 'https://www.rinya.maff.go.jp/j/kokuyu_rinya/',
		uiClaim:
			'Activities in national forests require the competent Forestry Agency / forest office authority. Collecting trees is not assumed lawful.',
		doesNotClaim: 'Does not replace contacting the local forest office for a specific stand.'
	},
	{
		id: 'jp_natural_parks',
		group: 'environment',
		instrument: '自然公園法 (Natural Parks Act)',
		provision: 'Special areas / special protection zones — restricted acts incl. plants',
		url: `${JLT_LAWS}/view/3060/en`,
		uiClaim:
			'In special areas of national / quasi-national parks, listed acts (including collecting or damaging designated plants, and other restricted acts) require permission from the Minister of the Environment or the prefectural governor.',
		doesNotClaim:
			'Does not mean “outside a national park = free to collect”. Prefectural parks and private land still apply.'
	},
	{
		id: 'jp_designated_plants',
		group: 'environment',
		instrument: '環境省 — 指定植物 (designated plants in parks)',
		provision: 'MOE designated-plant protection in national / quasi-national parks',
		url: 'https://www.env.go.jp/nature/np/plant_prot/index.html',
		uiClaim:
			'Alpine and other plants designated by the Minister of the Environment may not be collected or damaged in park special areas without permission. Lists are park-/designation-specific and revised over time.',
		doesNotClaim: 'Does not embed the full 指定植物 catalogue per park.'
	},
	{
		id: 'jp_species_conservation',
		group: 'environment',
		instrument: '種の保存法 (Act on Conservation of Endangered Species of Wild Fauna and Flora)',
		provision: 'Article 9 — prohibition on capture/collection of nationally rare species',
		url: `${JLT_LAWS}/view/4236/en`,
		uiClaim:
			'Collecting, capturing, killing, or damaging live individuals of nationally rare species is prohibited except under limited statutory exceptions / Minister permission.',
		doesNotClaim:
			'Does not exhaust prefectural red lists or every locally protected taxon.'
	}
];

export const JP_PERMIT_SOURCE_URLS = {
	moeNationalParks: 'https://www.env.go.jp/nature/nationalparks/',
	moeDesignatedPlants: 'https://www.env.go.jp/nature/np/plant_prot/index.html',
	moeEndangeredSpecies: 'https://www.env.go.jp/nature/kisho/',
	moeRegionalOffices: 'https://www.env.go.jp/region/',
	forestryAgency: 'https://www.rinya.maff.go.jp/j/kokuyu_rinya/',
	/** Registry information service — identify registered landowner (有料). */
	toukiRegistry: 'https://www1.touki.or.jp/',
	/** MIC local-government code / municipality directory starting point. */
	soumuMunicipalities: 'https://www.soumu.go.jp/denshijiti/code.html',
	/** Starting point to find prefectural nature-conservation desks. */
	prefNatureSearchHint: 'https://www.env.go.jp/region/'
} as const;
