<script lang="ts">
	import { App } from '@capacitor/app';
	import { tick, onMount } from 'svelte';
	import { debugCounters, debugLog } from '$lib/utils/debug-log';
	import { hapticLight } from '$lib/utils/haptics';
	import { nativeTap } from '$lib/utils/native-touch';
	import { isNativeApp } from '$lib/utils/platform';
	import { capturePhoto } from '$lib/utils/nativeCamera';
	import * as m from '$lib/paraglide/messages.js';

	let {
		previewUrl = '',
		photoFile = null,
		frontLabel = null,
		onfile
	}: {
		previewUrl?: string;
		photoFile?: File | null;
		frontLabel?: string | null;
		onfile?: (file: File, previewUrl: string) => void;
	} = $props();

	let inputEl: HTMLInputElement | undefined = $state();
	let frameEl: HTMLDivElement | undefined = $state();
	let picking = $state(false);
	let error = $state('');
	let pickingTimeoutId: ReturnType<typeof setTimeout> | undefined;

	const displayUrl = $derived(previewUrl);

	$effect(() => {
		debugCounters.picking = picking;
	});

	const PICKING_TIMEOUT_MS = 8000;

	function revokePreviewUrl(url: string) {
		if (url.startsWith('blob:')) {
			URL.revokeObjectURL(url);
		}
	}

	function clearPickingTimeout() {
		if (pickingTimeoutId !== undefined) {
			clearTimeout(pickingTimeoutId);
			pickingTimeoutId = undefined;
		}
	}

	function startPickingTimeout() {
		clearPickingTimeout();
		pickingTimeoutId = setTimeout(() => {
			picking = false;
			error = m.photo_interrupted();
		}, PICKING_TIMEOUT_MS);
	}

	function blurActiveField() {
		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
	}

	function restorePreviewFromFile() {
		if (!photoFile || previewUrl) {
			return;
		}
		const url = URL.createObjectURL(photoFile);
		onfile?.(photoFile, url);
	}

	async function handleFile(file: File) {
		if (previewUrl) {
			revokePreviewUrl(previewUrl);
		}
		const url = URL.createObjectURL(file);
		onfile?.(file, url);
		await tick();
		void frameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	async function handleCapture(file: File, url: string) {
		if (previewUrl) {
			revokePreviewUrl(previewUrl);
		}
		onfile?.(file, url);
		void hapticLight();
		await tick();
		void frameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function handleChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		error = '';
		void handleFile(file);
	}

	export function isPicking(): boolean {
		return picking;
	}

	export async function openCamera() {
		if (picking) return;
		debugCounters.photoOpens += 1;
		debugCounters.visitPhotoOpens += 1;
		// #region agent log
		debugLog('PhotoPreview:openCamera', 'photo open', { picking }, 'H4');
		// #endregion
		picking = true;
		error = '';
		blurActiveField();
		startPickingTimeout();

		try {
			if (isNativeApp()) {
				const result = await capturePhoto();
				if (result) {
					await handleCapture(result.file, result.previewUrl);
				} else {
					error = m.photo_not_received();
				}
				return;
			}

			inputEl?.click();
		} catch (err) {
			console.error('Photo capture failed:', err);
			error =
				err instanceof Error ? err.message : m.photo_not_received();
		} finally {
			clearPickingTimeout();
			picking = false;
			// #region agent log
			debugLog('PhotoPreview:openCamera', 'photo end', { picking }, 'H3');
			// #endregion
		}
	}

	onMount(() => {
		picking = false;
		clearPickingTimeout();

		if (!isNativeApp()) {
			return;
		}

		const listener = App.addListener('appStateChange', ({ isActive }) => {
			if (isActive) {
				picking = false;
				clearPickingTimeout();
				restorePreviewFromFile();
				// #region agent log
				debugLog('PhotoPreview:resume', 'app active after camera', { picking }, 'H52');
				// #endregion
			}
		});

		return () => {
			void listener.then((handle) => handle.remove());
		};
	});
</script>

<div class="flex flex-col gap-2" bind:this={frameEl}>
	<label class="text-sm font-medium text-forest-900" for="photo-input">{m.photo_label()}</label>

	<button
		type="button"
		use:nativeTap={{ onactivate: () => void openCamera(), label: 'photo' }}
		disabled={picking}
		class="relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-white transition active:scale-[0.99] disabled:opacity-60"
	>
		{#if displayUrl}
			<img src={displayUrl} alt="" class="h-full w-full object-cover" />
			<span
				class="absolute bottom-3 right-3 rounded-lg bg-forest-900/80 px-3 py-1.5 text-sm font-medium text-white"
			>
				{m.action_edit()}
			</span>
		{:else}
			<div class="flex flex-col items-center gap-3 px-6 py-8 text-center">
				<div
					class="flex h-14 w-14 items-center justify-center rounded-full bg-forest-800/10 text-forest-800"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="h-7 w-7"
						aria-hidden="true"
					>
						<path
							d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
						/>
						<circle cx="12" cy="13" r="4" />
					</svg>
				</div>
				<span class="text-base font-medium text-forest-900">{m.photo_take()}</span>
				<span class="text-sm text-muted">{m.photo_camera()}</span>
			</div>
		{/if}
	</button>

	{#if error}
		<p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
	{/if}

	{#if frontLabel}
		<p class="text-sm text-forest-700" role="status">{frontLabel}</p>
	{/if}

	{#if !isNativeApp()}
		<input
			bind:this={inputEl}
			id="photo-input"
			type="file"
			accept="image/*"
			capture="environment"
			class="sr-only"
			onchange={handleChange}
		/>
	{/if}
</div>
