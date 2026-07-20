import type { CountryCode } from '$lib/geo/countries';
import type { LegalArticleGroup, LegalArticleRef, LegalContentPack } from '$lib/geo/legal/types';
import { frLegalPack } from '$lib/geo/legal/fr';
import { esLegalPack } from '$lib/geo/legal/es';
import { itLegalPack } from '$lib/geo/legal/it';
import { deLegalPack } from '$lib/geo/legal/de';
import { gbLegalPack } from '$lib/geo/legal/gb';
import { chLegalPack } from '$lib/geo/legal/ch';
import { atLegalPack } from '$lib/geo/legal/at';
import { beLegalPack } from '$lib/geo/legal/be';
import { nlLegalPack } from '$lib/geo/legal/nl';
import { noLegalPack } from '$lib/geo/legal/no';
import { seLegalPack } from '$lib/geo/legal/se';
import { usLegalPack } from '$lib/geo/legal/us';
import { caLegalPack } from '$lib/geo/legal/ca';
import { nzLegalPack } from '$lib/geo/legal/nz';
import { ptLegalPack } from '$lib/geo/legal/pt';

const LEGAL_PACKS: Record<CountryCode, LegalContentPack> = {
	FR: frLegalPack,
	ES: esLegalPack,
	IT: itLegalPack,
	DE: deLegalPack,
	GB: gbLegalPack,
	CH: chLegalPack,
	AT: atLegalPack,
	BE: beLegalPack,
	NL: nlLegalPack,
	SE: seLegalPack,
	NO: noLegalPack,
	US: usLegalPack,
	CA: caLegalPack,
	NZ: nzLegalPack,
	PT: ptLegalPack
};

/** Country-aware legal content pack; defaults to FR when the country can't be resolved. */
export function getLegalContentPack(country: CountryCode | null): LegalContentPack {
	return LEGAL_PACKS[country ?? 'FR'];
}

export function articlesForGroup(pack: LegalContentPack, group: LegalArticleGroup): LegalArticleRef[] {
	return pack.articles.filter((article) => article.group === group);
}

export type { LegalArticleGroup, LegalArticleRef, LegalContentPack } from '$lib/geo/legal/types';
