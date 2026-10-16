<script lang="ts">
	import LegalDocumentView from '$lib/components/LegalDocumentView.svelte';
	import * as m from '$lib/paraglide/messages.js';

	const sections = [
		{
			title: () => m.terms_object_title(),
			body: () => `${m.legal_aid_disclaimer()} ${m.terms_object_body()}`
		},
		{ title: () => m.terms_access_title(), body: () => m.terms_access_body() },
		{ title: () => m.terms_minors_title(), body: () => m.terms_minors_body() },
		{ title: () => m.terms_field_title(), body: () => m.terms_field_body() },
		{ title: () => m.terms_gps_title(), body: () => m.terms_gps_body() },
		{ title: () => m.terms_ip_title(), body: () => m.terms_ip_body() },
		{ title: () => m.terms_use_title(), body: () => m.terms_use_body() },
		{ title: () => m.terms_liability_title(), body: () => m.terms_liability_body() },
		{ title: () => m.terms_us_title(), body: () => m.terms_us_body() },
		{ title: () => m.terms_changes_title(), body: () => m.terms_changes_body() }
	];
</script>

<LegalDocumentView
	pageTitle={() => m.title_terms()}
	heading={() => m.terms_heading()}
	intro={() => m.terms_intro()}
	disclaimer={() => m.legal_aid_disclaimer()}
	{sections}
/>
