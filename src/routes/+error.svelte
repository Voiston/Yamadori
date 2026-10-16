<script lang="ts">
	import ErrorBanner from '$lib/components/ErrorBanner.svelte';
	import { appCrashCopy } from '$lib/utils/errorCopy';
</script>

<div class="flex min-h-[50vh] flex-col items-center justify-center px-4 py-10">
	<ErrorBanner copy={appCrashCopy()} class="w-full max-w-md" />
</div>
