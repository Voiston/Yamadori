<script lang="ts">
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		value = $bindable(''),
		id,
		label,
		autocomplete = 'current-password',
		disabled = false,
		inputClass = 'text-sm'
	}: {
		value?: string;
		id?: string;
		label?: string;
		autocomplete?: string;
		disabled?: boolean;
		inputClass?: string;
	} = $props();

	let visible = $state(false);

	let toggleLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		return visible ? m.action_hide_password() : m.action_show_password();
	});
</script>

<div class="block">
	{#if label}
		<label class="text-sm font-medium text-forest-800" for={id}>{label}</label>
	{/if}
	<div class="relative {label ? 'mt-1.5' : ''}">
		<input
			{id}
			type={visible ? 'text' : 'password'}
			{autocomplete}
			bind:value
			{disabled}
			class="w-full rounded-xl border border-gray-200 py-2.5 pr-11 pl-3 text-forest-900 {inputClass}"
		/>
		<button
			type="button"
			onclick={() => {
				visible = !visible;
			}}
			{disabled}
			class="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition hover:text-forest-800 disabled:opacity-50"
			aria-label={toggleLabel}
			aria-pressed={visible}
		>
			{#if visible}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-5 w-5"
					aria-hidden="true"
				>
					<path
						d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
					/>
					<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
					<path d="M1 1l22 22" />
					<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-5 w-5"
					aria-hidden="true"
				>
					<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			{/if}
		</button>
	</div>
</div>
