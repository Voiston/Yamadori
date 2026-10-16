<script lang="ts">
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { getTreeDisplayLabel, type Tree } from '$lib/types/tree';
	import { resolve } from '$app/paths';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { copyCoordinates } from '$lib/utils/clipboard';
	import { openNavigation } from '$lib/utils/navigation';
	import { onlineState } from '$lib/utils/online.svelte';
	import { shareTree, shareTreePhoto } from '$lib/utils/share';
	import { exportTreeShare } from '$lib/utils/treeShare';
	import { isNativeApp } from '$lib/utils/platform';
	import { showDetailFeedback, showErrorToast } from '$lib/stores/appToast.svelte';
	import { copyFailedCopy } from '$lib/utils/errorCopy';
	import { resolveErrorCopy, type ErrorCopy } from '$lib/utils/userFacingError';
	import * as m from '$lib/paraglide/messages.js';

	let {
		tree,
		pageUrl,
		simpleMode = false,
		onedit,
		ondelete
	}: {
		tree: Tree;
		pageUrl: string;
		simpleMode?: boolean;
		onedit?: () => void;
		ondelete?: () => void;
	} = $props();

	const hasGps = $derived(tree.latitude !== null && tree.longitude !== null);

	const compassLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return m.onboarding_compass_title().replace(/\s*\([^)]*\)$/, '');
	});

	let menuOpen = $state(false);
	let menuRoot: HTMLDivElement | undefined = $state();
	let showSendConfirm = $state(false);
	let sending = $state(false);

	function closeMenu(): void {
		menuOpen = false;
	}

	function toggleMenu(): void {
		menuOpen = !menuOpen;
	}

	function onWindowPointerDown(event: PointerEvent): void {
		if (!menuOpen || !menuRoot) return;
		const target = event.target;
		if (target instanceof Node && !menuRoot.contains(target)) {
			closeMenu();
		}
	}

	function onWindowKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && menuOpen) {
			closeMenu();
		}
	}

	async function handleNavigate() {
		if (tree.latitude === null || tree.longitude === null) return;
		openNavigation(tree.latitude, tree.longitude, getTreeDisplayLabel(tree));
	}

	async function handleShare() {
		closeMenu();
		const result = await shareTree(tree, pageUrl);
		if (result === 'shared') {
			showDetailFeedback(m.feedback_shared());
		} else if (result === 'copied') {
			showDetailFeedback(m.feedback_copied());
		} else {
			showErrorToast(copyFailedCopy());
		}
	}

	async function handleCopy() {
		closeMenu();
		if (tree.latitude === null || tree.longitude === null) return;
		const ok = await copyCoordinates(tree.latitude, tree.longitude);
		if (ok) {
			showDetailFeedback(m.feedback_coords_copied());
		} else {
			showErrorToast(copyFailedCopy());
		}
	}

	async function handleSharePhoto() {
		closeMenu();
		const result = await shareTreePhoto(tree);
		if (result === 'shared') {
			showDetailFeedback(m.feedback_photo_shared());
		} else {
			showErrorToast(copyFailedCopy());
		}
	}

	function treeShareSendFailedCopy(): ErrorCopy {
		return {
			what: m.tree_share_send_failed(),
			action: { label: m.action_retry(), kind: 'retry' },
			code: 'tree_share_send_failed'
		};
	}

	function handleSend() {
		closeMenu();
		showSendConfirm = true;
	}

	async function confirmSend() {
		if (sending) return;
		sending = true;
		try {
			const result = await exportTreeShare(tree.id);
			if (result === 'shared' || result === 'saved') {
				showDetailFeedback(m.tree_share_sent());
			} else if (result === 'downloaded') {
				showDetailFeedback(m.tree_share_downloaded());
			}
		} catch (error) {
			showErrorToast(resolveErrorCopy(error, treeShareSendFailedCopy()));
		} finally {
			sending = false;
		}
	}

	function handleEdit() {
		closeMenu();
		onedit?.();
	}

	function handleDelete() {
		closeMenu();
		ondelete?.();
	}

	const chipClass =
		'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition active:scale-95';
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeydown} />

<div class="flex items-stretch gap-2">
	{#if hasGps}
		<a
			href={resolve('/tree/[id]/compass', { id: tree.id })}
			class="{chipClass} bg-forest-900 text-white"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-4 w-4"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
				<path d="M12 8l3 8-3-2-3 2 3-8z" fill="currentColor" stroke="none" />
			</svg>
			<span class="max-w-full truncate">{compassLabel}</span>
		</a>

		<button type="button" onclick={handleNavigate} class="{chipClass} border border-gray-200 bg-white text-forest-900">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-4 w-4"
				aria-hidden="true"
			>
				<path d="M3 11l19-9-9 19-2-8-8-2z" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			<span class="max-w-full truncate">{m.tree_navigate()}</span>
		</button>

		<a
			href="{resolve('/map')}?focus={tree.id}"
			class="{chipClass} border border-gray-200 bg-white text-forest-900"
			title={!onlineState.online ? m.feedback_map_offline() : undefined}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-4 w-4"
				aria-hidden="true"
			>
				<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
				<path d="M8 2v16M16 6v16" />
			</svg>
			<span class="max-w-full truncate">{m.nav_map()}</span>
		</a>
	{/if}

	<div bind:this={menuRoot} class="relative {hasGps ? 'flex-1' : 'ml-auto'}">
		<button
			type="button"
			class="{chipClass} w-full border border-gray-200 bg-white text-forest-900 {hasGps
				? ''
				: '!flex-none min-w-[4.5rem] px-3'}"
			aria-haspopup="menu"
			aria-expanded={menuOpen}
			onclick={toggleMenu}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				class="h-4 w-4"
				aria-hidden="true"
			>
				<circle cx="5" cy="12" r="1.5" fill="currentColor" />
				<circle cx="12" cy="12" r="1.5" fill="currentColor" />
				<circle cx="19" cy="12" r="1.5" fill="currentColor" />
			</svg>
			<span class="max-w-full truncate">{m.tree_more_actions()}</span>
		</button>

		{#if menuOpen}
			<div
				class="absolute right-0 top-full z-40 mt-1 min-w-[12.5rem] overflow-hidden rounded-xl border border-gray-200 bg-white/98 py-1 shadow-lg backdrop-blur-md"
				role="menu"
				aria-label={m.tree_more_actions()}
			>
				<button
					type="button"
					role="menuitem"
					class="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-forest-900 hover:bg-forest-50"
					onclick={handleEdit}
				>
					{m.action_edit()}
				</button>
				{#if hasGps}
					<button
						type="button"
						role="menuitem"
						class="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-forest-900 hover:bg-forest-50"
						onclick={handleCopy}
					>
						{m.action_copy_gps()}
					</button>
				{/if}
				<button
					type="button"
					role="menuitem"
					class="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-forest-900 hover:bg-forest-50"
					onclick={handleShare}
				>
					{m.action_share()}
				</button>
				<button
					type="button"
					role="menuitem"
					class="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-forest-900 hover:bg-forest-50 disabled:opacity-50"
					onclick={handleSend}
					disabled={sending}
				>
					{m.tree_share_send()}
				</button>
				{#if !simpleMode && isNativeApp() && tree.photos.length > 0}
					<button
						type="button"
						role="menuitem"
						class="flex w-full items-center px-3 py-2.5 text-left text-sm font-medium text-forest-900 hover:bg-forest-50"
						onclick={handleSharePhoto}
					>
						{m.share_photo()}
					</button>
				{/if}
				<button
					type="button"
					role="menuitem"
					class="flex w-full items-center border-t border-gray-100 px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50"
					onclick={handleDelete}
				>
					{m.action_delete()}
				</button>
			</div>
		{/if}
	</div>
</div>

<ConfirmDialog
	bind:open={showSendConfirm}
	title={m.tree_share_send_confirm_title()}
	message={m.tree_share_send_confirm_message()}
	confirmLabel={m.tree_share_send()}
	variant="default"
	onconfirm={() => void confirmSend()}
/>
