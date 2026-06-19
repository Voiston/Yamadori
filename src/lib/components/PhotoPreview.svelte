<script lang="ts">
	let {
		preview = $bindable(''),
		frontLabel = null,
		onfile
	}: {
		preview?: string;
		frontLabel?: string | null;
		onfile?: (file: File) => void;
	} = $props();

	let inputEl: HTMLInputElement | undefined = $state();

	function handleChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		preview = URL.createObjectURL(file);
		onfile?.(file);
	}

	function openCamera() {
		inputEl?.click();
	}
</script>

<div class="flex flex-col gap-2">
	<label class="text-sm font-medium text-forest-900" for="photo-input">Photo</label>

	<button
		type="button"
		onclick={openCamera}
		class="relative flex min-h-48 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-white transition active:scale-[0.99]"
	>
		{#if preview}
			<img src={preview} alt="" class="h-full w-full object-cover" />
			<span
				class="absolute bottom-3 right-3 rounded-lg bg-forest-900/80 px-3 py-1.5 text-sm font-medium text-white"
			>
				Changer
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
				<span class="text-base font-medium text-forest-900">Prendre une photo</span>
				<span class="text-sm text-muted">Cadrez le front de l'arbre face à vous</span>
			</div>
		{/if}
	</button>

	{#if frontLabel}
		<p class="text-sm text-forest-700" role="status">{frontLabel}</p>
	{/if}

	<input
		bind:this={inputEl}
		id="photo-input"
		type="file"
		accept="image/*"
		capture="environment"
		class="sr-only"
		onchange={handleChange}
	/>
</div>
