<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';
	import type VoiceNoteRecorder from './VoiceNoteRecorder.svelte';

	type VoiceNoteRecorderProps = ComponentProps<typeof VoiceNoteRecorder>;

	let {
		value = $bindable(null),
		...rest
	}: VoiceNoteRecorderProps = $props();

	let VoiceNoteRecorderComponent = $state<typeof VoiceNoteRecorder | null>(null);
	let loadFailed = $state(false);
	let recorderRef = $state<{
		toggleVolumeRecording: () => Promise<void>;
		isVoiceRecording: () => boolean;
	} | null>(null);

	$effect(() => {
		let cancelled = false;
		loadFailed = false;
		void import('./VoiceNoteRecorder.svelte')
			.then((module) => {
				if (!cancelled) {
					VoiceNoteRecorderComponent = module.default;
				}
			})
			.catch(() => {
				if (!cancelled) {
					loadFailed = true;
				}
			});
		return () => {
			cancelled = true;
		};
	});

	export function isVoiceRecording(): boolean {
		return recorderRef?.isVoiceRecording() ?? false;
	}

	export async function toggleVolumeRecording(): Promise<void> {
		await recorderRef?.toggleVolumeRecording();
	}
</script>

{#if VoiceNoteRecorderComponent}
	<VoiceNoteRecorderComponent bind:this={recorderRef} bind:value {...rest} />
{:else if loadFailed}
	<p class="text-sm text-muted" role="status" data-capture-tutorial="voice">
		{m.voice_note_optional()}
	</p>
{:else}
	<div
		class="flex min-h-[3rem] items-center justify-center gap-2"
		role="status"
		aria-busy="true"
		aria-label={m.voice_note()}
		data-capture-tutorial="voice"
	>
		<div
			class="h-5 w-5 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700"
		></div>
		<span class="text-sm text-muted">{m.voice_note()}</span>
	</div>
{/if}
