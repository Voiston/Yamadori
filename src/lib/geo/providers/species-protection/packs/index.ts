import type { CountryCode } from '$lib/geo/countries';
import type { SpeciesProtectionPack } from '$lib/geo/providers/species-protection/types';
import { frSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/fr';
import {
	atSpeciesProtectionPack,
	beSpeciesProtectionPack,
	chSpeciesProtectionPack,
	deSpeciesProtectionPack,
	esSpeciesProtectionPack,
	gbSpeciesProtectionPack,
	itSpeciesProtectionPack,
	nlSpeciesProtectionPack,
	noSpeciesProtectionPack,
	ptSpeciesProtectionPack,
	ieSpeciesProtectionPack,
	dkSpeciesProtectionPack,
	fiSpeciesProtectionPack,
	seSpeciesProtectionPack
} from '$lib/geo/providers/species-protection/packs/intl';
import { usSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/us';
import { caSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/ca';
import { nzSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/nz';
import { auSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/au';
import { jpSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/jp';

const PACKS: Record<CountryCode, SpeciesProtectionPack> = {
	FR: frSpeciesProtectionPack,
	ES: esSpeciesProtectionPack,
	IT: itSpeciesProtectionPack,
	DE: deSpeciesProtectionPack,
	GB: gbSpeciesProtectionPack,
	CH: chSpeciesProtectionPack,
	AT: atSpeciesProtectionPack,
	BE: beSpeciesProtectionPack,
	NL: nlSpeciesProtectionPack,
	SE: seSpeciesProtectionPack,
	NO: noSpeciesProtectionPack,
	US: usSpeciesProtectionPack,
	CA: caSpeciesProtectionPack,
	NZ: nzSpeciesProtectionPack,
	PT: ptSpeciesProtectionPack,
	IE: ieSpeciesProtectionPack,
	DK: dkSpeciesProtectionPack,
	FI: fiSpeciesProtectionPack,
	AU: auSpeciesProtectionPack,
	JP: jpSpeciesProtectionPack
};

export function getSpeciesProtectionPack(country: CountryCode | null): SpeciesProtectionPack | null {
	if (!country) return null;
	return PACKS[country] ?? null;
}
