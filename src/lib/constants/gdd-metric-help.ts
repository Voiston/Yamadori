import * as m from '$lib/paraglide/messages.js';

export function getGddMetricHelp() {
	return {
		title: m.gdd_help_title(),
		helpText: m.gdd_help_text()
	} as const;
}

export function getGdd7dMetricHelp() {
	return {
		title: m.gdd_7d_title(),
		summary: m.gdd_7d_summary(),
		intro: m.gdd_7d_intro(),
		contrast: m.gdd_7d_contrast(),
		interpretationTitle: m.gdd_7d_interpret_title(),
		interpretationLevels: [
			{
				label: m.gdd_7d_level_high(),
				text: m.gdd_7d_level_high_text()
			},
			{
				label: m.gdd_7d_level_medium(),
				text: m.gdd_7d_level_medium_text()
			},
			{
				label: m.gdd_7d_level_low(),
				text: m.gdd_7d_level_low_text()
			}
		],
		yamadoriTitle: m.gdd_7d_yamadori_title(),
		yamadoriIntro: m.gdd_7d_yamadori_intro(),
		yamadoriPoints: [m.gdd_7d_yamadori_point_1(), m.gdd_7d_yamadori_point_2()],
		warning: m.gdd_7d_warning()
	} as const;
}
