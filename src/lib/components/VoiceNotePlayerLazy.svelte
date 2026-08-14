<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type VoiceNotePlayer from './VoiceNotePlayer.svelte';

	let props: ComponentProps<typeof VoiceNotePlayer> = $props();

	let VoiceNotePlayerComponent = $state<typeof VoiceNotePlayer | null>(null);

	$effect(() => {
		let cancelled = false;
		void import('./VoiceNotePlayer.svelte').then((module) => {
			if (!cancelled) {
				VoiceNotePlayerComponent = module.default;
			}
		});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if VoiceNotePlayerComponent}
	<VoiceNotePlayerComponent {...props} />
{:else}
	<div class="flex min-h-[3rem] items-center justify-center" role="status" aria-busy="true">
		<div
			class="h-6 w-6 animate-spin rounded-full border-2 border-forest-300 border-t-forest-700"
		></div>
	</div>
{/if}
