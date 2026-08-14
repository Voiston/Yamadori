<script lang="ts">
	import type { LegalArticleId } from '$lib/constants/veto-legal';
	import * as m from '$lib/paraglide/messages.js';

	let {
		articleId,
		url,
		title = undefined,
		text = undefined,
		sourceName
	}: {
		articleId: string;
		url: string;
		title?: string;
		text?: string;
		/** Official gazette / legal DB name for the link label (BOE, Normattiva, …). */
		sourceName: string;
	} = $props();

	const frLabels = $derived.by((): Record<LegalArticleId, { title: string; text: string }> => ({
		cc_552: { title: m.veto_law_cc552_title(), text: m.veto_law_cc552_text() },
		cc_547: { title: m.veto_law_cc547_title(), text: m.veto_law_cc547_text() },
		cp_311_1: { title: m.veto_law_cp311_1_title(), text: m.veto_law_cp311_1_text() },
		cf_l331_2: { title: m.veto_law_cf_l331_2_title(), text: m.veto_law_cf_l331_2_text() },
		cf_l161_1: { title: m.veto_law_cf_l161_1_title(), text: m.veto_law_cf_l161_1_text() },
		ce_l411_1: { title: m.veto_law_ce_l411_1_title(), text: m.veto_law_ce_l411_1_text() },
		ce_l415_3: { title: m.veto_law_ce_l415_3_title(), text: m.veto_law_ce_l415_3_text() }
	}));

	const jpLabels = $derived.by(
		(): Record<string, { title: string; text: string }> => ({
			jp_minpo_206: {
				title: m.veto_law_jp_minpo_206_title(),
				text: m.veto_law_jp_minpo_206_text()
			},
			jp_minpo_207: {
				title: m.veto_law_jp_minpo_207_title(),
				text: m.veto_law_jp_minpo_207_text()
			},
			jp_keihou_235: {
				title: m.veto_law_jp_keihou_235_title(),
				text: m.veto_law_jp_keihou_235_text()
			},
			jp_shinrin: {
				title: m.veto_law_jp_shinrin_title(),
				text: m.veto_law_jp_shinrin_text()
			},
			jp_rinya: {
				title: m.veto_law_jp_rinya_title(),
				text: m.veto_law_jp_rinya_text()
			},
			jp_natural_parks: {
				title: m.veto_law_jp_natural_parks_title(),
				text: m.veto_law_jp_natural_parks_text()
			},
			jp_designated_plants: {
				title: m.veto_law_jp_designated_plants_title(),
				text: m.veto_law_jp_designated_plants_text()
			},
			jp_species_conservation: {
				title: m.veto_law_jp_species_conservation_title(),
				text: m.veto_law_jp_species_conservation_text()
			}
		})
	);

	const display = $derived.by(() => {
		const fr = frLabels[articleId as LegalArticleId];
		const jp =
			articleId.startsWith('jp_') && articleId in jpLabels ? jpLabels[articleId] : undefined;

		// Prefer JP i18n when messages exist; title/text props still override when passed.
		if (jp && !title && !text) return jp;
		if (fr && !text) return fr;
		if (title || text) {
			return {
				title: title || jp?.title || fr?.title || articleId,
				text: text || jp?.text || fr?.text || m.veto_law_generic_text()
			};
		}
		if (jp) return jp;
		if (fr) return fr;
		return {
			title: articleId,
			text: m.veto_law_generic_text()
		};
	});
</script>

<article class="space-y-1 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
	<p class="text-xs font-semibold text-amber-950">{display.title}</p>
	<p class="text-xs leading-relaxed text-amber-950/90">{display.text}</p>
	<a
		href={url}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex text-xs font-medium text-forest-800 underline decoration-forest-600/40 underline-offset-2 hover:text-forest-900"
	>
		{m.cadastre_law_link({ source: sourceName })}
	</a>
</article>
