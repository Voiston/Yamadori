<script lang="ts">
	import type { VoiceNote } from '$lib/types/tree';
	import {
		MAX_DURATION_MS,
		MIN_DURATION_MS,
		VoiceRecorderSession,
		createVoiceNoteFromBlob,
		formatVoiceDuration,
		isVoiceRecordingSupported
	} from '$lib/utils/voice';
	import { onDestroy } from 'svelte';

	let {
		disabled = false,
		value = $bindable(null),
		onchange
	}: {
		disabled?: boolean;
		value?: VoiceNote | null;
		onchange?: (note: VoiceNote | null) => void;
	} = $props();

	type RecorderState = 'idle' | 'recording' | 'recorded' | 'unsupported' | 'permission_denied';

	let recorderState = $state<RecorderState>(
		isVoiceRecordingSupported() ? 'idle' : 'unsupported'
	);
	let elapsedMs = $state(0);
	let hint = $state('');
	let previewPlaying = $state(false);

	let session: VoiceRecorderSession | null = null;
	let timerId: ReturnType<typeof setInterval> | undefined;
	let previewAudio: HTMLAudioElement | null = null;
	let recordingStartedAt = 0;

	const elapsedLabel = $derived(formatVoiceDuration(elapsedMs));

	function setValue(note: VoiceNote | null) {
		value = note;
		onchange?.(note);
	}

	function clearTimer() {
		if (timerId) {
			clearInterval(timerId);
			timerId = undefined;
		}
	}

	function stopPreview() {
		if (previewAudio) {
			previewAudio.pause();
			previewAudio.currentTime = 0;
		}
		previewPlaying = false;
	}

	async function handleStart() {
		if (disabled || recorderState === 'recording') return;

		hint = '';
		stopPreview();
		session?.cancel();

		try {
			session = new VoiceRecorderSession();
			await session.start();
			recorderState = 'recording';
			recordingStartedAt = Date.now();
			elapsedMs = 0;

			clearTimer();
			timerId = setInterval(() => {
				elapsedMs = Date.now() - recordingStartedAt;
				if (elapsedMs >= MAX_DURATION_MS) {
					void handleStop();
				}
			}, 200);
		} catch (err) {
			session = null;
			if (err instanceof DOMException && err.name === 'NotAllowedError') {
				recorderState = 'permission_denied';
				hint = 'Accès au micro refusé. Autorisez le micro dans les réglages du navigateur.';
			} else {
				recorderState = 'idle';
				hint = err instanceof Error ? err.message : 'Impossible de démarrer l\'enregistrement';
			}
		}
	}

	async function handleStop() {
		if (recorderState !== 'recording' || !session) return;

		clearTimer();
		const currentSession = session;
		session = null;

		try {
			const { blob, durationMs, mimeType } = await currentSession.stop();

			if (durationMs < MIN_DURATION_MS) {
				recorderState = 'idle';
				setValue(null);
				hint = 'Enregistrement trop court';
				return;
			}

			const note = await createVoiceNoteFromBlob(blob, durationMs, mimeType);
			setValue(note);
			recorderState = 'recorded';
			elapsedMs = durationMs;
		} catch (err) {
			recorderState = 'idle';
			hint = err instanceof Error ? err.message : 'Erreur à l\'arrêt de l\'enregistrement';
		}
	}

	function handleDelete() {
		stopPreview();
		setValue(null);
		recorderState = isVoiceRecordingSupported() ? 'idle' : 'unsupported';
		hint = '';
		elapsedMs = 0;
	}

	function togglePreview() {
		if (!value?.audioBase64) return;

		if (!previewAudio) {
			previewAudio = new Audio(value.audioBase64);
			previewAudio.onended = () => {
				previewPlaying = false;
			};
		} else if (previewAudio.src !== value.audioBase64) {
			previewAudio.src = value.audioBase64;
		}

		if (previewPlaying) {
			previewAudio.pause();
			previewPlaying = false;
		} else {
			void previewAudio.play();
			previewPlaying = true;
		}
	}

	onDestroy(() => {
		clearTimer();
		session?.cancel();
		stopPreview();
	});
</script>

<div class="flex flex-col gap-3">
	<p class="text-sm font-medium text-forest-900">Note vocale (optionnel)</p>
	<p class="text-xs text-muted">Appuyez sur Enregistrer, parlez, puis Stop (max 30 s)</p>

	{#if recorderState === 'unsupported'}
		<p class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
			Micro non supporté sur ce navigateur.
		</p>
	{:else if recorderState === 'permission_denied'}
		<p class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
			{hint}
		</p>
		<button
			type="button"
			onclick={handleStart}
			{disabled}
			class="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-base font-semibold text-forest-900 transition active:scale-[0.98] disabled:opacity-50"
		>
			Réessayer
		</button>
	{:else if recorderState === 'recording'}
		<div
			class="flex flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-6"
			role="status"
			aria-live="polite"
		>
			<div class="flex items-center gap-2">
				<span class="h-3 w-3 animate-pulse rounded-full bg-red-600" aria-hidden="true"></span>
				<span class="text-sm font-medium text-red-800">Enregistrement en cours</span>
			</div>
			<p class="font-mono text-3xl font-semibold tabular-nums text-red-900">{elapsedLabel}</p>
			<button
				type="button"
				onclick={handleStop}
				class="flex h-16 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-red-700 text-lg font-semibold text-white transition active:scale-[0.98]"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="h-6 w-6"
					aria-hidden="true"
				>
					<rect x="6" y="6" width="12" height="12" rx="1" />
				</svg>
				Stop
			</button>
		</div>
	{:else if recorderState === 'recorded' && value}
		<div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
			<div class="flex items-center justify-between gap-3">
				<p class="text-sm font-medium text-forest-900">
					Note enregistrée · {formatVoiceDuration(value.durationMs)}
				</p>
				<button
					type="button"
					onclick={handleDelete}
					{disabled}
					class="text-sm font-medium text-red-700 transition active:scale-[0.98] disabled:opacity-50"
				>
					Supprimer
				</button>
			</div>
			<button
				type="button"
				onclick={togglePreview}
				{disabled}
				class="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-forest-50 text-base font-medium text-forest-900 transition active:scale-[0.98] disabled:opacity-50"
			>
				{#if previewPlaying}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="h-5 w-5"
						aria-hidden="true"
					>
						<rect x="6" y="5" width="4" height="14" rx="1" />
						<rect x="14" y="5" width="4" height="14" rx="1" />
					</svg>
					Pause
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="h-5 w-5"
						aria-hidden="true"
					>
						<path d="M8 5v14l11-7z" />
					</svg>
					Écouter
				{/if}
			</button>
		</div>
	{:else}
		<button
			type="button"
			onclick={handleStart}
			{disabled}
			class="flex h-20 w-full items-center justify-center gap-3 rounded-xl bg-forest-800 text-lg font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="h-8 w-8"
				aria-hidden="true"
			>
				<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
				<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
				<line x1="12" y1="19" x2="12" y2="22" />
			</svg>
			Enregistrer
		</button>
	{/if}

	{#if hint && recorderState !== 'permission_denied'}
		<p class="text-sm text-amber-800" role="status">{hint}</p>
	{/if}
</div>
