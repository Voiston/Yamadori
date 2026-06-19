<script lang="ts">
	import type { VoiceNote } from '$lib/types/tree';
	import { formatDate } from '$lib/utils/date';
	import { formatVoiceDuration } from '$lib/utils/voice';
	import { onDestroy } from 'svelte';

	let { voiceNote }: { voiceNote: VoiceNote } = $props();

	let playing = $state(false);
	let progress = $state(0);
	let audioEl: HTMLAudioElement | undefined = $state();

	const durationLabel = $derived(formatVoiceDuration(voiceNote.durationMs));

	function togglePlayback() {
		if (!audioEl) return;

		if (playing) {
			audioEl.pause();
			playing = false;
		} else {
			void audioEl.play();
			playing = true;
		}
	}

	function handleTimeUpdate() {
		if (!audioEl || voiceNote.durationMs <= 0) return;
		progress = Math.min(100, (audioEl.currentTime / (voiceNote.durationMs / 1000)) * 100);
	}

	function handleEnded() {
		playing = false;
		progress = 0;
		if (audioEl) {
			audioEl.currentTime = 0;
		}
	}

	onDestroy(() => {
		audioEl?.pause();
	});
</script>

<section class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
	<h3 class="text-sm font-medium text-forest-900">Note vocale</h3>
	<p class="mt-1 text-xs text-muted">Enregistrée le {formatDate(voiceNote.recordedAt)}</p>

	<audio
		bind:this={audioEl}
		src={voiceNote.audioBase64}
		ontimeupdate={handleTimeUpdate}
		onended={handleEnded}
		class="sr-only"
	></audio>

	<div class="mt-4 flex items-center gap-3">
		<button
			type="button"
			onclick={togglePlayback}
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-800 text-white transition active:scale-95"
			aria-label={playing ? 'Pause' : 'Lire la note vocale'}
		>
			{#if playing}
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
			{/if}
		</button>

		<div class="min-w-0 flex-1">
			<div class="h-2 overflow-hidden rounded-full bg-gray-100">
				<div
					class="h-full rounded-full bg-forest-700 transition-[width] duration-150"
					style:width="{progress}%"
				></div>
			</div>
			<p class="mt-1 font-mono text-xs tabular-nums text-muted">{durationLabel}</p>
		</div>
	</div>
</section>
