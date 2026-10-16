<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { getTreeDisplayLabel } from '$lib/types/tree';
	import {
		cancelIncomingTreeShare,
		confirmIncomingTreeShare,
		incomingTreeShareState
	} from '$lib/utils/archive/incomingTreeShare.svelte';
	import { countTreeSharePhotos } from '$lib/utils/treeShare';
	import { portal, APP_SHELL_PORTAL_TARGET } from '$lib/utils/portal';
	import { modalFocus } from '$lib/utils/modalFocus';
	import { sheetBackdrop, sheetPanel } from '$lib/utils/motion';
	import * as m from '$lib/paraglide/messages.js';

	const copy = $derived.by(() => {
		void appearanceSettingsState.locale;
		return {
			title: m.tree_share_receive_title(),
			cancel: m.action_cancel(),
			add: m.tree_share_add(),
			unknownPlace: m.tree_share_place_unknown(),
			mediaWarning: m.tree_share_media_warning(),
			inspecting: m.tree_share_inspecting(),
			inspectingHint: m.tree_share_inspecting_hint(),
			saving: m.action_saving()
		};
	});

	const inspecting = $derived(incomingTreeShareState.status === 'inspecting');
	const open = $derived(incomingTreeShareState.status === 'tree-share');

	const tree = $derived(incomingTreeShareState.archive?.trees[0] ?? null);

	const label = $derived.by(() => {
		void appearanceSettingsState.locale;
		return tree ? getTreeDisplayLabel(tree) : '';
	});

	const place = $derived(tree?.locationLabel?.trim() || copy.unknownPlace);

	const photoCount = $derived(tree ? countTreeSharePhotos(tree) : 0);

	const photoCountLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.tree_share_photos({ count: String(photoCount) });
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open && !incomingTreeShareState.adding) {
			void cancelIncomingTreeShare();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget && !incomingTreeShareState.adding) {
			void cancelIncomingTreeShare();
		}
	}
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if inspecting}
	<div
		use:portal={APP_SHELL_PORTAL_TARGET}
		data-yamadori-portal
		class="fixed inset-0 z-[120] flex items-center justify-center p-4"
		role="status"
		aria-live="polite"
		aria-busy="true"
	>
		<div class="absolute inset-0 bg-forest-900/40" role="presentation"></div>
		<div class="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
			<div class="flex flex-col items-center gap-3 text-center">
				<span
					class="h-5 w-5 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700"
					aria-hidden="true"
				></span>
				<p class="text-base font-medium text-forest-900">{copy.inspecting}</p>
				<p class="text-sm text-muted">{copy.inspectingHint}</p>
			</div>
		</div>
	</div>
{/if}

{#if open && tree}
	<div
		use:portal={APP_SHELL_PORTAL_TARGET}
		data-yamadori-portal
		class="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center"
		role="presentation"
	>
		<div
			class="absolute inset-0 bg-forest-900/40"
			role="presentation"
			transition:sheetBackdrop
			onclick={handleBackdropClick}
		></div>
		<div
			class="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="tree-share-title"
			aria-describedby="tree-share-message"
			transition:sheetPanel
			use:modalFocus={true}
		>
			<div class="sheet-grabber sm:hidden" aria-hidden="true"></div>
			<h2 id="tree-share-title" class="text-lg font-semibold text-forest-900">
				{copy.title}
			</h2>
			<div id="tree-share-message" class="mt-2 space-y-2 text-base text-muted">
				<p class="font-medium text-forest-900">{label}</p>
				<p>{place}</p>
				<p>{photoCountLabel}</p>
				<p class="text-sm text-amber-800">{copy.mediaWarning}</p>
			</div>

			<div class="mt-6 flex gap-3">
				<button
					type="button"
					onclick={() => void cancelIncomingTreeShare()}
					class="btn-secondary flex-1"
					disabled={incomingTreeShareState.adding}
				>
					{copy.cancel}
				</button>
				<button
					type="button"
					onclick={() => void confirmIncomingTreeShare()}
					class="btn-primary flex-1 gap-2"
					disabled={incomingTreeShareState.adding}
					aria-busy={incomingTreeShareState.adding}
				>
					{#if incomingTreeShareState.adding}
						<span
							class="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
							aria-hidden="true"
						></span>
						{copy.saving}
					{:else}
						{copy.add}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
