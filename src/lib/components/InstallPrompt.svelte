<script lang="ts">
	import { installState, promptInstall } from '$lib/utils/pwa-install.svelte';

	let installing = $state(false);
	let dismissed = $state(false);

	const showBanner = $derived(
		!dismissed &&
			!installState.isInstalled &&
			(installState.canInstall || installState.isIos)
	);

	async function handleInstall() {
		installing = true;
		try {
			const accepted = await promptInstall();
			if (!accepted) dismissed = true;
		} finally {
			installing = false;
		}
	}
</script>

{#if showBanner}
	<div
		class="border-b border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-900"
		role="region"
		aria-label="Installation de l'application"
	>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
			<div class="min-w-0">
				<p class="font-medium">Installer Yamadori</p>
				{#if installState.isIos}
					<p class="mt-0.5 text-xs text-forest-700">
						Safari → partager
						<span aria-hidden="true">□↑</span>
						→ « Sur l'écran d'accueil »
					</p>
				{:else}
					<p class="mt-0.5 text-xs text-forest-700">
						Accès rapide hors-ligne depuis l'écran d'accueil.
					</p>
				{/if}
			</div>
			<div class="flex shrink-0 gap-2">
				{#if installState.canInstall}
					<button
						type="button"
						class="rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
						disabled={installing}
						onclick={handleInstall}
					>
						{installing ? 'Installation…' : 'Installer'}
					</button>
				{/if}
				<button
					type="button"
					class="rounded-lg border border-forest-300 px-3 py-1.5 text-xs font-medium text-forest-800"
					onclick={() => (dismissed = true)}
				>
					Plus tard
				</button>
			</div>
		</div>
	</div>
{/if}
