<script lang="ts">
	import AppLogoImage from './AppLogoImage.svelte';

	const BRAND = 'Yamadori';
	const letters = [...BRAND];

	let { label }: { label: string } = $props();
</script>

<div
	class="flex h-full w-full flex-col items-center justify-center bg-forest-100"
	role="status"
	aria-live="polite"
	aria-label={label}
>
	<AppLogoImage class="h-20 w-20 object-contain" />
	<p class="mt-3 font-semibold text-2xl tracking-tight text-forest-900" aria-hidden="true">
		{#each letters as letter, i (i)}
			<span class="boot-letter" style="--i: {i}">{letter}</span>
		{/each}
	</p>
</div>

<style>
	@keyframes boot-letter-ola {
		0%,
		100% {
			transform: translateY(0);
		}
		40% {
			transform: translateY(-10px);
		}
		70% {
			transform: translateY(2px);
		}
	}

	.boot-letter {
		display: inline-block;
		opacity: 1;
		animation: boot-letter-ola 400ms var(--motion-ease) both;
		animation-delay: calc(var(--i) * 65ms);
	}

	@media (prefers-reduced-motion: reduce) {
		.boot-letter {
			animation: none;
			transform: none;
		}
	}
</style>
