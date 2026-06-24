<script lang="ts">

	import { afterNavigate } from '$app/navigation';

	import CaptureForm from '$lib/components/CaptureForm.svelte';

	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';

	import * as m from '$lib/paraglide/messages.js';

	import { isNativeApp } from '$lib/utils/platform';



	const CAPTURE_ENTRY_KEY = 'yamadori-capture-entry';



	function bumpCaptureEntry(): number {

		if (!isNativeApp()) {

			return 1;

		}

		const entry = Number(sessionStorage.getItem(CAPTURE_ENTRY_KEY) ?? 0) + 1;

		sessionStorage.setItem(CAPTURE_ENTRY_KEY, String(entry));

		return entry;

	}



	let formKey = $state(bumpCaptureEntry());

	let skipNextCaptureNavigateBump = true;



	afterNavigate(({ to }) => {

		if (!isNativeApp() || !to?.url.pathname.endsWith('/capture')) {

			return;

		}

		if (skipNextCaptureNavigateBump) {

			skipNextCaptureNavigateBump = false;

			return;

		}

		formKey = bumpCaptureEntry();

	});



	let pageTitle = $derived.by(() => {

		void appearanceSettingsState.locale;

		return m.title_capture();

	});

</script>



<svelte:head>

	<title>{pageTitle}</title>

</svelte:head>



{#key formKey}

	<CaptureForm />

{/key}

