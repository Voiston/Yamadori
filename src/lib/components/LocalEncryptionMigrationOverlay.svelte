<script lang="ts">
	import { securitySettingsState } from '$lib/stores/securitySettings.svelte';
	import * as m from '$lib/paraglide/messages.js';
</script>

{#if securitySettingsState.migrationPending}
	{@const migrationPercent = Math.round(securitySettingsState.migrationProgress)}
	{@const migrationLabel = m.settings_local_encryption_migrating({ percent: migrationPercent })}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6"
		role="dialog"
		aria-modal="true"
		aria-busy="true"
		aria-label={migrationLabel}
	>
		<div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
			<p class="text-sm font-medium tabular-nums text-forest-900">{migrationLabel}</p>
			<p class="mt-2 text-xs text-muted">{m.settings_local_encryption_migration_wait()}</p>
			<div
				class="mt-4 h-2 overflow-hidden rounded-full bg-gray-100"
				role="progressbar"
				aria-valuenow={migrationPercent}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={migrationLabel}
			>
				<div
					class="h-full rounded-full bg-forest-700 transition-[width] duration-150"
					style:width="{migrationPercent}%"
				></div>
			</div>
		</div>
	</div>
{/if}
