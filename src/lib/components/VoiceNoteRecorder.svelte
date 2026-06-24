<script lang="ts">
	import type { VoiceNote } from '$lib/types/tree';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import {
		MAX_DURATION_MS,
		MIN_DURATION_MS,
		VoiceRecorderSession,
		createVoiceNoteFromBlob,
		formatVoiceDuration,
		getVoiceRecordingErrorMessage,
		isVoiceRecordingPermissionError,
		isVoiceRecordingSupported
	} from '$lib/utils/voice';
	import { hapticLight, hapticSuccess } from '$lib/utils/haptics';
	import { nativeTap } from '$lib/utils/native-touch';
	import { isNativeApp } from '$lib/utils/platform';
	import * as m from '$lib/paraglide/messages.js';
	import { onDestroy } from 'svelte';



	let {

		disabled = false,

		compact = false,

		value = $bindable(null),

		sessionActive = $bindable(false),

		onchange

	}: {

		disabled?: boolean;

		compact?: boolean;

		value?: VoiceNote | null;

		sessionActive?: boolean;

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



	const unsupportedMessage = $derived.by(() => {

		void appearanceSettingsState.locale;

		return isNativeApp() ? m.voice_unsupported_device() : m.voice_unsupported_browser();

	});



	$effect(() => {

		sessionActive = recorderState === 'recording' || previewPlaying;

	});



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



	async function handleStart(): Promise<boolean> {

		if (disabled || recorderState === 'recording') return false;



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

			return true;

		} catch (err) {

			session = null;

			if (isVoiceRecordingPermissionError(err)) {

				recorderState = 'permission_denied';

			} else {

				recorderState = 'idle';

			}

			hint = getVoiceRecordingErrorMessage(err);

			return false;

		}

	}



	async function handleStop(): Promise<boolean> {

		if (recorderState !== 'recording' || !session) return false;



		clearTimer();

		const currentSession = session;

		session = null;



		try {

			const { blob, durationMs, mimeType } = await currentSession.stop();



			if (durationMs < MIN_DURATION_MS) {

				recorderState = 'idle';

				setValue(null);

				hint = m.voice_empty();

				return false;

			}



			const note = await createVoiceNoteFromBlob(blob, durationMs, mimeType);

			setValue(note);

			recorderState = 'recorded';

			elapsedMs = durationMs;

			return true;

		} catch (err) {

			recorderState = 'idle';

			hint = err instanceof Error ? err.message : m.voice_stop_error();

			return false;

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



	export function isVoiceRecording(): boolean {

		return recorderState === 'recording';

	}



	export async function toggleVolumeRecording(): Promise<void> {

		if (disabled) {

			return;

		}



		if (recorderState === 'recording') {

			const saved = await handleStop();

			if (saved) {

				void hapticSuccess();

			}

			return;

		}



		if (recorderState === 'unsupported') {

			return;

		}



		const started = await handleStart();

		if (started) {

			void hapticLight();

		}

	}



	onDestroy(() => {

		clearTimer();

		session?.cancel();

		stopPreview();

	});

</script>



<div class="flex flex-col gap-2">

	<p class="text-sm font-medium text-forest-900">{m.voice_note_optional()}</p>

	{#if !compact}

		<p class="text-xs text-muted">{m.voice_hint()}</p>

	{/if}



	{#if recorderState === 'unsupported'}

		<p class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">

			{unsupportedMessage}

		</p>

	{:else if recorderState === 'permission_denied'}

		<p class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">

			{hint}

		</p>

		<button

			type="button"

			use:nativeTap={{ onactivate: () => void handleStart(), label: 'voice-retry' }}

			{disabled}

			class="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-forest-900 transition active:scale-[0.98] disabled:opacity-50"

		>

			{m.action_retry()}

		</button>

	{:else if recorderState === 'recording'}

		<div

			class="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 {compact

				? 'p-4'

				: 'gap-4 p-6'}"

			role="status"

			aria-live="polite"

		>

			<div class="flex items-center gap-2">

				<span class="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" aria-hidden="true"></span>

				<span class="text-xs font-medium text-red-800">{m.voice_recording()}</span>

			</div>

			<p

				class="font-mono font-semibold tabular-nums text-red-900 {compact

					? 'text-2xl'

					: 'text-3xl'}"

			>

				{elapsedLabel}

			</p>

			<button

				type="button"

				use:nativeTap={{ onactivate: () => void handleStop(), label: 'voice-stop' }}

				class="flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-red-700 font-semibold text-white transition active:scale-[0.98] {compact

					? 'h-12 text-base'

					: 'h-16 text-lg'}"

			>

				<svg

					xmlns="http://www.w3.org/2000/svg"

					viewBox="0 0 24 24"

					fill="currentColor"

					class="{compact ? 'h-5 w-5' : 'h-6 w-6'}"

					aria-hidden="true"

				>

					<rect x="6" y="6" width="12" height="12" rx="1" />

				</svg>

				Stop

			</button>

		</div>

	{:else if recorderState === 'recorded' && value}

		<div class="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3">

			<div class="flex items-center justify-between gap-3">

				<p class="text-xs font-medium text-forest-900">

					{m.tree_voice_saved()} · {formatVoiceDuration(value.durationMs)}

				</p>

				<button

					type="button"

					onclick={handleDelete}

					{disabled}

					class="text-sm font-medium text-red-700 transition active:scale-[0.98] disabled:opacity-50"

				>

					{m.action_delete()}

				</button>

			</div>

			<button

				type="button"

				onclick={togglePreview}

				{disabled}

				class="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-forest-50 font-medium text-forest-900 transition active:scale-[0.98] disabled:opacity-50 {compact

					? 'h-10 text-sm'

					: 'h-12 text-base'}"

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

					{m.voice_pause()}

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

					{m.voice_play()}

				{/if}

			</button>

		</div>

	{:else}

		<button

			type="button"

			use:nativeTap={{ onactivate: () => void handleStart(), label: 'voice-start' }}

			{disabled}

			class="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-800 font-semibold text-white transition active:scale-[0.98] disabled:opacity-50 {compact

				? 'h-12 text-base'

				: 'h-20 gap-3 text-lg'}"

		>

			<svg

				xmlns="http://www.w3.org/2000/svg"

				viewBox="0 0 24 24"

				fill="none"

				stroke="currentColor"

				stroke-width="2"

				class="{compact ? 'h-5 w-5' : 'h-8 w-8'}"

				aria-hidden="true"

			>

				<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />

				<path d="M19 10v2a7 7 0 0 1-14 0v-2" />

				<line x1="12" y1="19" x2="12" y2="22" />

			</svg>

			{m.action_save()}

		</button>

	{/if}



	{#if hint && recorderState !== 'permission_denied'}

		<p class="text-sm text-amber-800" role="status">{hint}</p>

	{/if}

</div>

