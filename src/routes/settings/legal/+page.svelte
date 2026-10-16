<script lang="ts">
	import LegalDocumentView from '$lib/components/LegalDocumentView.svelte';
	import * as m from '$lib/paraglide/messages.js';

	const sections = [
		{ title: () => m.legal_editor_title(), body: () => m.legal_editor_body() },
		{ title: () => m.legal_address_title(), body: () => m.legal_address_body() },
		{ title: () => m.legal_contact_title(), body: () => m.legal_contact_body() },
		{ title: () => m.legal_host_title(), body: () => m.legal_host_body() },
		{ title: () => m.legal_app_title(), body: () => m.legal_app_body() }
	];
</script>

<LegalDocumentView
	pageTitle={() => m.title_legal()}
	heading={() => m.legal_heading()}
	intro={() => m.legal_intro()}
	{sections}
/>
