import type { AgriData } from '$lib/types/agri';
import type { PhenologyStageId } from '$lib/types/gdd';
import type { YrsPlantInputs } from '$lib/types/yrs';

/** Stade phénologique dominant : observé terrain > estimation GDD. */
export function resolveDominantPhenologyStage(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): PhenologyStageId | null {
	if (inputs.observedPhenologyStage) return inputs.observedPhenologyStage;
	if (!data.gdd?.phenology) return null;

	const sorted = [...data.gdd.phenology.stages].sort(
		(a, b) => b.probabilityPct - a.probabilityPct
	);
	return sorted[0]?.id ?? null;
}
