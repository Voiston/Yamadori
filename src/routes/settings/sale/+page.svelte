<script lang="ts">
	import LegalDocumentView from '$lib/components/LegalDocumentView.svelte';
	import * as m from '$lib/paraglide/messages.js';

	const sections = [
		{ title: () => m.sale_seller_title(), body: () => m.sale_seller_body() },
		{ title: () => m.sale_product_title(), body: () => m.sale_product_body() },
		{ title: () => m.sale_price_title(), body: () => m.sale_price_body() },
		{ title: () => m.sale_payment_title(), body: () => m.sale_payment_body() },
		{ title: () => m.sale_withdrawal_title(), body: () => m.sale_withdrawal_body() },
		{ title: () => m.sale_outside_eu_title(), body: () => m.sale_outside_eu_body() },
		{ title: () => m.sale_refund_title(), body: () => m.sale_refund_body() },
		{ title: () => m.sale_support_title(), body: () => m.sale_support_body() },
		{ title: () => m.sale_law_title(), body: () => m.sale_law_body() }
	];
</script>

<LegalDocumentView
	pageTitle={() => m.title_sale()}
	heading={() => m.sale_heading()}
	intro={() => m.sale_intro()}
	disclaimer={() => m.legal_aid_disclaimer()}
	{sections}
/>
