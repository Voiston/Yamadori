<script lang="ts">
	import { App } from '@capacitor/app';
	import { onMount } from 'svelte';
	import { hapticLight } from '$lib/utils/haptics';
	import { nativeTap } from '$lib/utils/native-touch';
	import { isNativeApp } from '$lib/utils/platform';
	import { capturePhoto } from '$lib/utils/nativeCamera';
	import {
		beginCameraCapture,
		endCameraCapture
	} from '$lib/utils/cameraCaptureSession';
	import { encodePhotoFile, type PhotoEncoding } from '$lib/utils/photo';
	import { MAX_VISIT_PHOTOS } from '$lib/types/tree';
	import * as m from '$lib/paraglide/messages.js';
	import Skeleton from '$lib/components/Skeleton.svelte';

	export type MultiPhotoSlot = {
		previewUrl: string;
		file: File | null;
		encoding: PhotoEncoding | null;
		/** Existing saved data URL when editing a visit */
		existingFull?: string;
		existingThumb?: string;
	};

	let {
		slots = $bindable([]),
		frontLabel = null,
		onchange,
		onprocessingchange,
		onbeforeopen
	}: {
		slots?: MultiPhotoSlot[];
		frontLabel?: string | null;
		onchange?: (slots: MultiPhotoSlot[]) => void;
		onprocessingchange?: (busy: boolean) => void;
		/** Return false to cancel opening the camera (e.g. show a permission prompt first). */
		onbeforeopen?: () => boolean | Promise<boolean>;
	} = $props();

	let cameraInputEl: HTMLInputElement | undefined = $state();
	let picking = $state(false);
	let processingPhoto = $state(false);
	let error = $state('');
	/** Slot index being replaced, or null when adding a new slot. */
	let pendingSlotIndex: number | null = $state(null);
	let pickingTimeoutId: ReturnType<typeof setTimeout> | undefined;

	const photoBusy = $derived(picking || processingPhoto);
	const canAddMore = $derived(slots.length < MAX_VISIT_PHOTOS);
	const photoButtonLabel = $derived(m.photo_take());

	const PICKING_TIMEOUT_MS = 8000;
	const LONG_PRESS_MS = 350;
	/** Only abort long-press wait for a clear vertical scroll intent. */
	const VERTICAL_SCROLL_CANCEL_PX = 36;
	const POINTER_LISTENER_OPTS: AddEventListenerOptions = { passive: false };
	const SCROLL_LOCK_CLASS = 'yamadori-photo-dragging';

	// Drag-to-reorder state. Tracked by slot object identity so indices can
	// freely shift underneath a live drag without losing the dragged item.
	let draggingSlot: MultiPhotoSlot | null = $state(null);
	let overIndex: number | null = $state(null);
	let dragOffsetX = $state(0);
	let dragOffsetY = $state(0);
	let stripEl: HTMLDivElement | undefined = $state();
	/** Index currently under pointer during long-press wait / drag. */
	let pressingIndex: number | null = $state(null);

	let dragCandidateIndex: number | null = null;
	let activePointerId: number | null = null;
	let dragStartX = 0;
	let dragStartY = 0;
	/** Last known pointer X during an active drag (used to recompute drop target). */
	let lastPointerX = 0;
	let longPressTimer: ReturnType<typeof setTimeout> | undefined;
	let orphanGestureTimer: ReturnType<typeof setTimeout> | undefined;
	/** Stable column wrappers (no transform) keyed by slot identity. */
	const colElByKey = new Map<MultiPhotoSlot, HTMLElement>();
	/** Frozen column bounds for the active drag — never read transformed thumbs. */
	let dragColumnBounds: { left: number; right: number }[] | null = null;

	const draggingIndex = $derived(draggingSlot ? slots.indexOf(draggingSlot) : null);

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
			pendingSlotIndex = null;
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

	function imageSrcFor(slot: MultiPhotoSlot): string {
		return slot.previewUrl || slot.existingFull || slot.existingThumb || '';
	}

	function hintFor(index: number): string {
		if (index === 0) return m.photo_hint_overview();
		if (index === 1) return m.photo_hint_nebari();
		return m.photo_hint_detail();
	}

	function emitChange() {
		onchange?.(slots);
	}

	async function requestOpenAllowed(): Promise<boolean> {
		if (!onbeforeopen) return true;
		return onbeforeopen();
	}

	async function applySlotFromFile(file: File, index: number | null) {
		setProcessing(true);
		try {
			const encoded = await encodePhotoFile(file);
			const url = URL.createObjectURL(encoded.previewBlob);
			const slot: MultiPhotoSlot = {
				previewUrl: url,
				file: encoded.previewFile,
				encoding: { full: encoded.full, thumb: encoded.thumb }
			};

			if (index === null) {
				if (slots.length >= MAX_VISIT_PHOTOS) {
					revokePreviewUrl(url);
					return;
				}
				slots = [...slots, slot];
			} else {
				const previous = slots[index];
				if (previous) {
					revokePreviewUrl(previous.previewUrl);
				}
				slots = slots.map((existing, i) => (i === index ? slot : existing));
			}

			emitChange();
			void hapticLight();
		} catch (err) {
			console.error('Photo preview prepare failed:', err);
			error = err instanceof Error ? err.message : m.photo_not_received();
		} finally {
			setProcessing(false);
			endCameraCapture();
			pendingSlotIndex = null;
		}
	}

	async function captureForSlot(index: number | null, options?: { bypassBeforeOpen?: boolean }) {
		if (photoBusy) return;
		if (index === null && !canAddMore) return;

		if (!options?.bypassBeforeOpen) {
			const allowed = await requestOpenAllowed();
			if (!allowed) return;
		}

		picking = true;
		error = '';
		blurActiveField();
		pendingSlotIndex = index;
		beginCameraCapture();
		startPickingTimeout();

		try {
			if (isNativeApp()) {
				const result = await capturePhoto();
				if (result) {
					revokePreviewUrl(result.previewUrl);
					await applySlotFromFile(result.file, index);
				} else {
					error = m.photo_not_received();
					endCameraCapture();
					pendingSlotIndex = null;
				}
				return;
			}

			cameraInputEl?.click();
		} catch (err) {
			console.error('Photo capture failed:', err);
			error = err instanceof Error ? err.message : m.photo_not_received();
			endCameraCapture();
			pendingSlotIndex = null;
		} finally {
			clearPickingTimeout();
			picking = false;
		}
	}

	function handleCameraInputChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		const index = pendingSlotIndex;
		input.value = '';
		if (!file) {
			pendingSlotIndex = null;
			return;
		}
		error = '';
		beginCameraCapture();
		void applySlotFromFile(file, index);
	}

	function removeSlot(index: number) {
		if (photoBusy) return;
		const slot = slots[index];
		if (slot) {
			revokePreviewUrl(slot.previewUrl);
		}
		slots = slots.filter((_, i) => i !== index);
		emitChange();
	}

	function swapSlots(from: number, to: number) {
		if (from === to || from < 0 || to < 0 || from >= slots.length || to >= slots.length) return;
		const next = slots.slice();
		const tmp = next[from]!;
		next[from] = next[to]!;
		next[to] = tmp;
		slots = next;
	}

	/** Svelte action: column wrapper without transform — used for stable hit-test bounds. */
	function registerColEl(node: HTMLElement, slot: MultiPhotoSlot) {
		colElByKey.set(slot, node);
		return {
			update(nextSlot: MultiPhotoSlot) {
				if (nextSlot !== slot) {
					colElByKey.delete(slot);
					slot = nextSlot;
					colElByKey.set(slot, node);
				}
			},
			destroy() {
				colElByKey.delete(slot);
			}
		};
	}

	function snapshotColumnBounds(): { left: number; right: number }[] {
		return slots.map((slot) => {
			const el = colElByKey.get(slot);
			if (!el) return { left: 0, right: 0 };
			const rect = el.getBoundingClientRect();
			return { left: rect.left, right: rect.right };
		});
	}

	function clearDragHitState() {
		dragColumnBounds = null;
	}

	function cancelLongPress() {
		if (longPressTimer !== undefined) {
			clearTimeout(longPressTimer);
			longPressTimer = undefined;
		}
	}

	function cancelOrphanGestureTimer() {
		if (orphanGestureTimer !== undefined) {
			clearTimeout(orphanGestureTimer);
			orphanGestureTimer = undefined;
		}
	}

	function armOrphanGestureTimer() {
		cancelOrphanGestureTimer();
		// If Android cancelled the pointer and never sends touchend, unlock scroll.
		orphanGestureTimer = setTimeout(() => {
			orphanGestureTimer = undefined;
			if (activePointerId === null) return;
			endPointerInteraction(true);
		}, 1600);
	}

	function cleanupPointerListeners() {
		window.removeEventListener('pointermove', handleWindowPointerMove);
		window.removeEventListener('pointerup', handleWindowPointerUp);
		window.removeEventListener('pointercancel', handleWindowPointerCancel);
		window.removeEventListener('touchend', handleWindowTouchEnd);
		window.removeEventListener('touchcancel', handleWindowTouchCancel);
	}

	function lockParentScroll() {
		document.documentElement.classList.add(SCROLL_LOCK_CLASS);
	}

	function unlockParentScroll() {
		document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
	}

	function findOverIndex(clientX: number): number | null {
		const bounds = dragColumnBounds;
		if (!bounds || bounds.length === 0) return null;
		const n = bounds.length;
		if (n === 1) return 0;

		// Voronoi / midpoint bands so every X maps to a column (no dead gaps).
		for (let i = 0; i < n; i++) {
			const prev = bounds[i - 1];
			const cur = bounds[i]!;
			const next = bounds[i + 1];
			const start = prev ? (prev.right + cur.left) / 2 : bounds[0]!.left;
			const end = next ? (cur.right + next.left) / 2 : bounds[n - 1]!.right;
			const atEnd = i === n - 1 ? clientX <= end : clientX < end;
			if (clientX >= start && atEnd) return i;
		}

		// Outside strip: nearest column by center.
		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < n; i++) {
			const b = bounds[i]!;
			const center = (b.left + b.right) / 2;
			const dist = Math.abs(clientX - center);
			if (dist < bestDist) {
				bestDist = dist;
				best = i;
			}
		}
		return best;
	}

	function clampDragOffset(dx: number, dy: number): { x: number; y: number } {
		const dampenedY = dy * 0.35;
		const maxY = 48;
		if (!stripEl) {
			return { x: dx, y: Math.max(-maxY, Math.min(maxY, dampenedY)) };
		}
		const maxX = stripEl.getBoundingClientRect().width + 24;
		return {
			x: Math.max(-maxX, Math.min(maxX, dx)),
			y: Math.max(-maxY, Math.min(maxY, dampenedY))
		};
	}

	function isVerticalScrollIntent(dx: number, dy: number): boolean {
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);
		return absDy > VERTICAL_SCROLL_CANCEL_PX && absDy > absDx * 1.5;
	}

	function abortPressForScroll() {
		cancelLongPress();
		cancelOrphanGestureTimer();
		cleanupPointerListeners();
		unlockParentScroll();
		clearDragHitState();
		dragCandidateIndex = null;
		activePointerId = null;
		pressingIndex = null;
		dragOffsetX = 0;
		dragOffsetY = 0;
	}

	function startDrag() {
		longPressTimer = undefined;
		if (dragCandidateIndex === null) return;
		const slot = slots[dragCandidateIndex];
		if (!slot) return;
		dragColumnBounds = snapshotColumnBounds();
		draggingSlot = slot;
		overIndex = dragCandidateIndex;
		void hapticLight();
	}

	function handleThumbPointerDown(event: PointerEvent, index: number) {
		if (photoBusy) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		// Keep the gesture on our handlers; parent scroll must not steal it mid-drag.
		if (event.cancelable) event.preventDefault();
		cancelLongPress();
		dragCandidateIndex = index;
		activePointerId = event.pointerId;
		dragStartX = event.clientX;
		dragStartY = event.clientY;
		lastPointerX = event.clientX;
		dragOffsetX = 0;
		dragOffsetY = 0;
		pressingIndex = index;
		lockParentScroll();

		// Do not setPointerCapture — on Android WebView it often triggers pointercancel
		// when the scroll container competes. Window listeners drive the gesture.
		window.addEventListener('pointermove', handleWindowPointerMove, POINTER_LISTENER_OPTS);
		window.addEventListener('pointerup', handleWindowPointerUp, POINTER_LISTENER_OPTS);
		window.addEventListener('pointercancel', handleWindowPointerCancel, POINTER_LISTENER_OPTS);
		// touchend is the reliable lift signal when pointercancel ate pointerup.
		window.addEventListener('touchend', handleWindowTouchEnd, POINTER_LISTENER_OPTS);
		window.addEventListener('touchcancel', handleWindowTouchCancel, POINTER_LISTENER_OPTS);
		longPressTimer = setTimeout(startDrag, LONG_PRESS_MS);
	}

	function handleWindowPointerMove(event: PointerEvent) {
		if (event.pointerId !== activePointerId) return;
		cancelOrphanGestureTimer();

		const dx = event.clientX - dragStartX;
		const dy = event.clientY - dragStartY;

		if (draggingSlot === null) {
			// Small wobble while holding is fine; only yield for clear vertical scroll.
			if (isVerticalScrollIntent(dx, dy)) {
				abortPressForScroll();
			} else if (event.cancelable) {
				event.preventDefault();
			}
			return;
		}

		if (event.cancelable) event.preventDefault();

		lastPointerX = event.clientX;
		const clamped = clampDragOffset(dx, dy);
		dragOffsetX = clamped.x;
		dragOffsetY = clamped.y;

		// Do not mutate slots while dragging — live DOM reorder remounts nodes on mobile.
		const nextIndex = findOverIndex(event.clientX);
		if (nextIndex !== null && nextIndex !== overIndex) {
			overIndex = nextIndex;
			void hapticLight();
		}
	}

	function endPointerInteraction(cancelled: boolean, dropClientX?: number) {
		cancelLongPress();
		cancelOrphanGestureTimer();
		cleanupPointerListeners();
		unlockParentScroll();

		const wasDragging = draggingSlot !== null;
		const fromIndex = draggingSlot ? slots.indexOf(draggingSlot) : -1;
		// Prefer the lift position so a late/missing pointermove cannot keep the origin index.
		const dropX = dropClientX ?? lastPointerX;
		const toIndex = wasDragging ? findOverIndex(dropX) : overIndex;
		const tapIndex = dragCandidateIndex;

		draggingSlot = null;
		overIndex = null;
		dragCandidateIndex = null;
		activePointerId = null;
		pressingIndex = null;
		dragOffsetX = 0;
		dragOffsetY = 0;
		clearDragHitState();

		if (wasDragging) {
			if (fromIndex >= 0 && toIndex !== null && toIndex !== fromIndex) {
				swapSlots(fromIndex, toIndex);
				emitChange();
				void hapticLight();
			} else if (!cancelled) {
				emitChange();
			}
			return;
		}

		if (!cancelled && tapIndex !== null && !photoBusy) {
			void captureForSlot(tapIndex);
		}
	}

	function handleWindowPointerUp(event: PointerEvent) {
		if (event.pointerId !== activePointerId) return;
		endPointerInteraction(false, event.clientX);
	}

	function handleWindowPointerCancel(event: PointerEvent) {
		if (event.pointerId !== activePointerId) return;
		// Ignore spurious cancel while pressing/dragging — Android WebView often
		// fires this when scroll tries to steal the gesture. Wait for pointerup/touchend.
		if (draggingSlot !== null || pressingIndex !== null) {
			armOrphanGestureTimer();
			return;
		}
		endPointerInteraction(true);
	}

	function handleWindowTouchEnd(event: TouchEvent) {
		if (activePointerId === null) return;
		if (event.cancelable) event.preventDefault();
		const touch = event.changedTouches[0];
		endPointerInteraction(false, touch?.clientX);
	}

	function handleWindowTouchCancel(_event: TouchEvent) {
		if (activePointerId === null) return;
		// Same as pointercancel: do not drop the photo on a spurious OS cancel.
		if (draggingSlot !== null || pressingIndex !== null) {
			armOrphanGestureTimer();
			return;
		}
		endPointerInteraction(true);
	}

	function thumbButtonClass(index: number): string {
		const isDragging = draggingIndex === index;
		const isOver = overIndex === index && draggingIndex !== null && draggingIndex !== index;
		const isPressing = pressingIndex === index;
		return [
			'multi-photo-thumb relative aspect-square w-full select-none overflow-hidden rounded-xl border-2 bg-white disabled:opacity-60',
			isOver
				? 'border-forest-700 ring-4 ring-forest-600/50 shadow-md'
				: 'border-gray-200',
			isDragging
				? 'z-20 cursor-grabbing opacity-80 shadow-lg'
				: isPressing
					? 'cursor-grabbing'
					: 'cursor-grab transition active:scale-[0.99]'
		].join(' ');
	}

	function thumbButtonStyle(index: number): string {
		if (draggingIndex !== index) return '';
		return `transform: translate(${dragOffsetX}px, ${dragOffsetY}px) scale(1.04)`;
	}

	export function isPicking(): boolean {
		return photoBusy;
	}

	export function isProcessingPhoto(): boolean {
		return processingPhoto;
	}

	export async function openCamera(options?: { bypassBeforeOpen?: boolean }) {
		if (photoBusy || !canAddMore) return;
		await captureForSlot(null, options);
	}

	onMount(() => {
		picking = false;
		setProcessing(false);
		clearPickingTimeout();

		if (!isNativeApp()) {
			return () => {
				cancelLongPress();
				cancelOrphanGestureTimer();
				cleanupPointerListeners();
				clearDragHitState();
				unlockParentScroll();
			};
		}

		const listener = App.addListener('appStateChange', ({ isActive }) => {
			if (isActive) {
				picking = false;
				clearPickingTimeout();
			}
		});

		return () => {
			void listener.then((handle) => handle.remove());
			cancelLongPress();
			cancelOrphanGestureTimer();
			cleanupPointerListeners();
			clearDragHitState();
			unlockParentScroll();
		};
	});
</script>

<div class="flex flex-col gap-2">
	<span class="text-sm font-medium text-forest-900">{m.photo_label()}</span>

	{#if slots.length === 0}
		<button
			type="button"
			data-capture-tutorial="photo"
			use:nativeTap={{ onactivate: () => void captureForSlot(null), label: 'photo' }}
			disabled={photoBusy}
			aria-label={photoButtonLabel}
			class="relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-white transition active:scale-[0.99] disabled:opacity-60"
		>
			{#if processingPhoto}
				<div class="flex flex-col items-center gap-3 px-6 py-8 text-center">
					<Skeleton class="h-16 w-full max-w-[12rem] rounded-xl" decorative />
					<span class="text-sm text-muted" role="status" aria-live="polite"
						>{m.action_saving()}</span
					>
				</div>
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
	{:else}
		<div class="multi-photo-strip flex w-full items-start gap-2 sm:gap-3" bind:this={stripEl}>
			{#each slots as slot, index (slot)}
				<div
					class="multi-photo-col flex min-w-0 flex-1 flex-col gap-1.5"
					use:registerColEl={slot}
				>
					<div class="relative w-full">
						<button
							type="button"
							onpointerdown={(event) => handleThumbPointerDown(event, index)}
							disabled={photoBusy}
							aria-label={`${m.action_edit()} — ${hintFor(index)}`}
							aria-roledescription={m.photo_drag_reorder()}
							class={thumbButtonClass(index)}
							style={thumbButtonStyle(index)}
						>
							{#if processingPhoto && pendingSlotIndex === index}
								<div class="flex h-full w-full items-center justify-center">
									<Skeleton class="h-full w-full" decorative />
								</div>
							{:else}
								<img
									src={imageSrcFor(slot)}
									alt=""
									class="h-full w-full object-cover"
									decoding="async"
									loading="lazy"
									draggable="false"
								/>
							{/if}
						</button>
						<button
							type="button"
							onclick={() => removeSlot(index)}
							disabled={photoBusy || draggingIndex !== null}
							aria-label={m.photo_remove()}
							class="absolute top-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-white/90 text-red-600 shadow-sm backdrop-blur-sm transition disabled:opacity-30 {draggingIndex !== null
								? 'pointer-events-none'
								: ''}"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								class="h-3.5 w-3.5"
								aria-hidden="true"
							>
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						</button>
					</div>
					<span class="text-center text-xs text-forest-700 sm:text-sm">{hintFor(index)}</span>
				</div>
			{/each}

			{#if canAddMore}
				<div class="flex min-w-0 flex-1 flex-col gap-1.5">
					<button
						type="button"
						use:nativeTap={{ onactivate: () => void captureForSlot(null), label: 'photo-add' }}
						disabled={photoBusy}
						aria-label={m.photo_add()}
						class="relative flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white transition active:scale-[0.99] disabled:opacity-60"
					>
						{#if processingPhoto && pendingSlotIndex === null}
							<Skeleton class="h-full w-full rounded-xl" decorative />
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								class="h-7 w-7 text-forest-800"
								aria-hidden="true"
							>
								<path d="M12 5v14M5 12h14" />
							</svg>
						{/if}
					</button>
					<span class="text-center text-xs text-forest-700 sm:text-sm">{m.photo_add()}</span>
				</div>
			{/if}
		</div>
	{/if}

	{#if error}
		<p class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
	{/if}

	{#if frontLabel}
		<p class="text-sm text-forest-700" role="status">{frontLabel}</p>
	{/if}

	{#if !isNativeApp()}
		<input
			bind:this={cameraInputEl}
			type="file"
			accept="image/*"
			capture="environment"
			class="sr-only"
			onchange={handleCameraInputChange}
		/>
	{/if}
</div>
