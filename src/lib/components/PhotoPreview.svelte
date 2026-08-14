<script lang="ts">
	import { App } from '@capacitor/app';
	import { tick, onMount } from 'svelte';
	import { hapticLight } from '$lib/utils/haptics';
	import { nativeTap } from '$lib/utils/native-touch';
	import { isNativeApp } from '$lib/utils/platform';
	import { capturePhoto } from '$lib/utils/nativeCamera';
	import {
		beginCameraCapture,
		endCameraCapture
	} from '$lib/utils/cameraCaptureSession';
	import { encodePhotoFile, type PhotoEncoding } from '$lib/utils/photo';
	import * as m from '$lib/paraglide/messages.js';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let {
		previewUrl = '',
		photoFile = null,
		frontLabel = null,
		onfile,
		onprocessingchange,
		onbeforeopen
	}: {
		previewUrl?: string;
		photoFile?: File | null;
		frontLabel?: string | null;
		onfile?: (file: File, previewUrl: string, encoding: PhotoEncoding) => void;
		onprocessingchange?: (busy: boolean) => void;
		/** Return false to cancel opening the camera (e.g. show a permission prompt first). */
		onbeforeopen?: () => boolean | Promise<boolean>;
	} = $props();

	let inputEl: HTMLInputElement | undefined = $state();
	let frameEl: HTMLDivElement | undefined = $state();
	let picking = $state(false);
	let processingPhoto = $state(false);
	let error = $state('');
	let pickingTimeoutId: ReturnType<typeof setTimeout> | undefined;

	const displayUrl = $derived(previewUrl);
	const photoBusy = $derived(picking || processingPhoto);
	const photoButtonLabel = $derived(
		displayUrl ? `${m.action_edit()} — ${m.photo_label()}` : m.photo_take()
	);
	const previewAlt = $derived(displayUrl ? m.photo_label() : '');

	const PICKING_TIMEOUT_MS = 8000;

	function setProcessing(busy: boolean) {
		processingPhoto = busy;
		onprocessingchange?.(busy);
	}

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
			setProcessing(false);
			endCameraCapture();
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
		onfile?.(photoFile, url, { full: '', thumb: '' });
	}

	async function showPreparedPhoto(file: File) {
		if (previewUrl) {
			revokePreviewUrl(previewUrl);
		}

		setProcessing(true);
		try {
			const encoded = await encodePhotoFile(file);
			const url = URL.createObjectURL(encoded.previewBlob);
			onfile?.(encoded.previewFile, url, { full: encoded.full, thumb: encoded.thumb });
			void hapticLight();
			await tick();
			void frameEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} catch (err) {
			console.error('Photo preview prepare failed:', err);
			error = err instanceof Error ? err.message : m.photo_not_received();
		} finally {
			setProcessing(false);
			endCameraCapture();
		}
	}

	async function handleFile(file: File) {
		beginCameraCapture();
		await showPreparedPhoto(file);
	}

	async function handleCapture(file: File, nativePreviewUrl: string) {
		revokePreviewUrl(nativePreviewUrl);
		await showPreparedPhoto(file);
	}

	function handleChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		error = '';
		void handleFile(file);
	}

	export function isPicking(): boolean {
		return photoBusy;
	}

	export function isProcessingPhoto(): boolean {
		return processingPhoto;
	}

	export async function openCamera(options?: { bypassBeforeOpen?: boolean }) {
		if (photoBusy) return;

		if (!options?.bypassBeforeOpen && onbeforeopen) {
			const allowed = await onbeforeopen();
			if (!allowed) return;
		}

		picking = true;
		error = '';
		blurActiveField();
		beginCameraCapture();
		startPickingTimeout();

		try {
			if (isNativeApp()) {
				const result = await capturePhoto();
				if (result) {
					await handleCapture(result.file, result.previewUrl);
				} else {
					error = m.photo_not_received();
					endCameraCapture();
				}
				return;
			}

			inputEl?.click();
			return;
		} catch (err) {
			console.error('Photo capture failed:', err);
			error = err instanceof Error ? err.message : m.photo_not_received();
			endCameraCapture();
		} finally {
			clearPickingTimeout();
			picking = false;
		}
	}

	onMount(() => {
		picking = false;
		setProcessing(false);
		clearPickingTimeout();

		if (!isNativeApp()) {
			return;
		}

		const listener = App.addListener('appStateChange', ({ isActive }) => {
			if (isActive) {
				picking = false;
				clearPickingTimeout();
				restorePreviewFromFile();
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
		data-capture-tutorial="photo"
		use:nativeTap={{ onactivate: () => void openCamera(), label: 'photo' }}
		disabled={photoBusy}
		aria-label={photoButtonLabel}
		class="relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-white transition active:scale-[0.99] disabled:opacity-60"
	>
		{#if processingPhoto}
			<div class="flex flex-col items-center gap-3 px-6 py-8 text-center">
				<Skeleton class="h-16 w-full max-w-[12rem] rounded-xl" decorative />
				<span class="text-sm text-muted" role="status" aria-live="polite">{m.action_saving()}</span>
			</div>
		{:else if displayUrl}
			<img
				src={displayUrl}
				alt={previewAlt}
				class="h-full w-full object-cover"
				decoding="async"
				loading="lazy"
			/>
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
