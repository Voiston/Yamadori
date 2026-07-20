<script lang="ts">
	let {
		title,
		description,
		disabledConsequence,
		provider,
		checked,
		onchange
	}: {
		title: string;
		description: string;
		disabledConsequence: string;
		provider: string;
		checked: boolean;
		onchange: (enabled: boolean) => void;
	} = $props();
</script>

<label
	class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:border-forest-200"
>
	<input
		type="checkbox"
		class="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
		{checked}
		onchange={(event) => onchange(event.currentTarget.checked)}
	/>
	<span class="min-w-0 flex-1 text-sm">
		<span class="flex flex-wrap items-center gap-2">
			<span class="font-medium text-forest-900">{title}</span>
			<span class="rounded-full bg-forest-50 px-2 py-0.5 text-xs font-medium text-forest-700">
				{provider}
			</span>
		</span>
		<span class="mt-0.5 block text-muted">{description}</span>
		<span class="mt-1.5 block border-l-2 border-amber-200 pl-3 text-muted">{disabledConsequence}</span>
	</span>
</label>
