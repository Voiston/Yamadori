<script lang="ts">
	import { resolve } from '$app/paths';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type { BackupWarning } from '$lib/utils/backupReminder';

	let {
		warning,
		ondismiss
	}: {
		warning: BackupWarning;
		ondismiss: () => void;
	} = $props();

	let copy = $derived.by(() => {
		void appearanceSettingsState.locale;
		return {
			cta: m.backup_export_cta(),
			close: m.action_close(),
			href: `${resolve('/settings')}#backup-export`
		};
	});
</script>

<div
	class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-950"
	role="status"
>
	<div class="min-w-0 flex-1">
		<p class="text-sm font-medium">{warning.message}</p>
		<p class="mt-0.5 text-xs leading-relaxed opacity-90">{warning.why}</p>
		<a
			href={copy.href}
			class="mt-1.5 inline-block text-xs font-semibold underline underline-offset-2"
		>
			{copy.cta}
		</a>
	</div>
	<button
		type="button"
		class="shrink-0 px-1 text-sm font-medium text-amber-800"
		aria-label={copy.close}
		onclick={ondismiss}
	>
		×
	</button>
</div>
