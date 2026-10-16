import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const docsDir = resolve(repoRoot, 'docs');

const CONTACT_EMAIL = 'david.voisard2@gmail.com';
const APP_ID = 'fr.yamadori.scouting';
const PUBLISHER_NAME = 'David Voisard';

const localeMeta = {
	fr: { lang: 'fr', label: 'Français', langSwitchLabel: 'Langue' },
	en: { lang: 'en', label: 'English', langSwitchLabel: 'Language' },
	de: { lang: 'de', label: 'Deutsch', langSwitchLabel: 'Sprache' },
	es: { lang: 'es', label: 'Español', langSwitchLabel: 'Idioma' },
	it: { lang: 'it', label: 'Italiano', langSwitchLabel: 'Lingua' },
	nl: { lang: 'nl', label: 'Nederlands', langSwitchLabel: 'Taal' },
	sv: { lang: 'sv', label: 'Svenska', langSwitchLabel: 'Språk' },
	nb: { lang: 'nb', label: 'Norsk', langSwitchLabel: 'Språk' },
	pt: { lang: 'pt', label: 'Português', langSwitchLabel: 'Idioma' },
	da: { lang: 'da', label: 'Dansk', langSwitchLabel: 'Sprog' },
	fi: { lang: 'fi', label: 'Suomi', langSwitchLabel: 'Kieli' }
};

const DATE_LOCALES = {
	fr: 'fr-FR',
	en: 'en-GB',
	de: 'de-DE',
	es: 'es-ES',
	it: 'it-IT',
	nl: 'nl-NL',
	sv: 'sv-SE',
	nb: 'nb-NO',
	pt: 'pt-PT',
	da: 'da-DK',
	fi: 'fi-FI'
};

const DOC_STEMS = {
	privacy: 'privacy',
	legal: 'mentions-legales',
	terms: 'cgu',
	sale: 'cgv'
};

const privacySections = [
	{
		titleKey: 'privacy_section_device',
		pillars: [
			['privacy_pillar_local_title', 'privacy_pillar_local_body'],
			['privacy_pillar_offline_title', 'privacy_pillar_offline_body'],
			['privacy_pillar_backup_title', 'privacy_pillar_backup_body'],
			['privacy_pillar_honest_title', 'privacy_pillar_honest_body'],
			['privacy_pillar_permissions_title', 'privacy_pillar_permissions_body']
		]
	},
	{
		titleKey: 'privacy_section_online',
		pillars: [
			['privacy_pillar_network_title', 'privacy_pillar_network_body'],
			['privacy_pillar_third_parties_title', 'privacy_pillar_third_parties_body'],
			['privacy_pillar_no_tracking_title', 'privacy_pillar_no_tracking_body']
		]
	},
	{
		titleKey: 'privacy_section_control',
		pillars: [
			['privacy_pillar_share_title', 'privacy_pillar_share_body'],
			['privacy_pillar_gps_title', 'privacy_pillar_gps_body'],
			['privacy_pillar_api_controls_title', 'privacy_pillar_api_controls_body']
		]
	}
];

const inventoryRows = [
	['privacy_data_location_label', 'privacy_data_location_body'],
	['privacy_data_photos_label', 'privacy_data_photos_body'],
	['privacy_data_voice_label', 'privacy_data_voice_body'],
	['privacy_data_weather_label', 'privacy_data_weather_body'],
	['privacy_data_map_label', 'privacy_data_map_body'],
	['privacy_data_cadastre_label', 'privacy_data_cadastre_body'],
	['privacy_data_purchase_label', 'privacy_data_purchase_body'],
	['privacy_data_ip_label', 'privacy_data_ip_body']
];

const gdprCards = [
	['privacy_controller_title', 'privacy_controller_body'],
	['privacy_legal_basis_title', 'privacy_legal_basis_body'],
	['privacy_retention_title', 'privacy_retention_body'],
	['privacy_rights_title', 'privacy_rights_body'],
	['privacy_minors_title', 'privacy_minors_body'],
	['privacy_outside_eu_title', 'privacy_outside_eu_body'],
	['privacy_california_title', 'privacy_california_body'],
	['privacy_transfers_title', 'privacy_transfers_body'],
	['privacy_iap_title', 'privacy_iap_body'],
	['privacy_changes_title', 'privacy_changes_body']
];

const legalCards = [
	['legal_editor_title', 'legal_editor_body'],
	['legal_address_title', 'legal_address_body'],
	['legal_contact_title', 'legal_contact_body'],
	['legal_host_title', 'legal_host_body'],
	['legal_app_title', 'legal_app_body']
];

const termsCards = [
	['terms_object_title', 'terms_object_body'],
	['terms_access_title', 'terms_access_body'],
	['terms_minors_title', 'terms_minors_body'],
	['terms_field_title', 'terms_field_body'],
	['terms_gps_title', 'terms_gps_body'],
	['terms_ip_title', 'terms_ip_body'],
	['terms_use_title', 'terms_use_body'],
	['terms_liability_title', 'terms_liability_body'],
	['terms_us_title', 'terms_us_body'],
	['terms_changes_title', 'terms_changes_body']
];

const saleCards = [
	['sale_seller_title', 'sale_seller_body'],
	['sale_product_title', 'sale_product_body'],
	['sale_price_title', 'sale_price_body'],
	['sale_payment_title', 'sale_payment_body'],
	['sale_withdrawal_title', 'sale_withdrawal_body'],
	['sale_outside_eu_title', 'sale_outside_eu_body'],
	['sale_refund_title', 'sale_refund_body'],
	['sale_support_title', 'sale_support_body'],
	['sale_law_title', 'sale_law_body']
];

const SHARED_CSS = `:root {
			color-scheme: light;
			--forest-900: #1a2e1a;
			--forest-800: #2d4a2d;
			--muted: #5c6b5c;
			--bg: #f4f7f4;
			--card: #ffffff;
			--border: #d8e0d8;
		}
		* { box-sizing: border-box; }
		body {
			margin: 0;
			font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
			background: var(--bg);
			color: var(--forest-900);
			line-height: 1.55;
		}
		main { max-width: 42rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
		header { margin-bottom: 1.5rem; }
		h1 { margin: 0 0 0.75rem; font-size: 1.5rem; line-height: 1.25; }
		h2 { margin: 0 0 0.5rem; font-size: 1.125rem; }
		h3 {
			margin: 0 0 0.75rem;
			font-size: 0.75rem;
			font-weight: 600;
			letter-spacing: 0.06em;
			text-transform: uppercase;
			color: var(--muted);
		}
		h4 { margin: 0; font-size: 0.95rem; }
		p { margin: 0.5rem 0 0; }
		.meta { font-size: 0.875rem; color: var(--muted); }
		.meta p { margin: 0.25rem 0; }
		.lang-switch, .doc-nav { margin-bottom: 1rem; font-size: 0.875rem; }
		.lang-switch a, .doc-nav a {
			color: var(--forest-800);
			font-weight: 600;
			text-decoration: none;
		}
		.lang-switch a:hover, .doc-nav a:hover { text-decoration: underline; }
		.lang-switch [aria-current="page"], .doc-nav [aria-current="page"] {
			font-weight: 700;
			color: var(--forest-900);
		}
		.intro { font-size: 0.95rem; }
		.section, .inventory, .legal {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			margin-top: 1.5rem;
		}
		.card {
			background: var(--card);
			border: 1px solid var(--border);
			border-radius: 0.75rem;
			padding: 0.875rem 1rem;
		}
		.card p { color: var(--muted); font-size: 0.9rem; }
		footer { margin-top: 2rem; text-align: center; font-size: 0.75rem; color: var(--muted); }
		a { color: var(--forest-800); }`;

function docFilename(kind, localeKey) {
	const stem = DOC_STEMS[kind];
	return localeKey === 'fr' ? `${stem}.html` : `${stem}-${localeKey}.html`;
}

function escapeHtml(value) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function msg(messages, key, params = {}) {
	let text = messages[key] ?? key;
	for (const [name, value] of Object.entries(params)) {
		text = text.replaceAll(`{${name}}`, value);
	}
	return text;
}

function formatDate(localeKey) {
	return new Intl.DateTimeFormat(DATE_LOCALES[localeKey] ?? 'en-GB', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(new Date());
}

function renderCard(title, body) {
	return `<article class="card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(body)}</p></article>`;
}

function renderLangSwitch(kind, currentKey) {
	const current = localeMeta[currentKey];
	const links = Object.keys(localeMeta)
		.map((key) => {
			const meta = localeMeta[key];
			if (key === currentKey) {
				return `<span aria-current="page">${escapeHtml(meta.label)}</span>`;
			}
			return `<a href="${docFilename(kind, key)}">${escapeHtml(meta.label)}</a>`;
		})
		.join(' · ');
	return `<div class="lang-switch">${escapeHtml(current.langSwitchLabel)} : ${links}</div>`;
}

function renderDocNav(kind, localeKey, messages) {
	const items = [
		['privacy', 'legal_nav_privacy'],
		['legal', 'legal_nav_notice'],
		['terms', 'legal_nav_terms'],
		['sale', 'legal_nav_sale']
	];
	const links = items
		.map(([docKind, key]) => {
			const label = escapeHtml(msg(messages, key));
			if (docKind === kind) {
				return `<span aria-current="page">${label}</span>`;
			}
			return `<a href="${docFilename(docKind, localeKey)}">${label}</a>`;
		})
		.join(' · ');
	return `<nav class="doc-nav">${links}</nav>`;
}

function renderMeta(messages, version, localeKey) {
	const updated = formatDate(localeKey);
	return `<div class="meta">
				<p><strong>${escapeHtml(msg(messages, 'privacy_docs_app_label'))} :</strong> Yamadori Scouting (${escapeHtml(APP_ID)})</p>
				<p><strong>${escapeHtml(msg(messages, 'privacy_docs_publisher_label'))} :</strong> ${escapeHtml(PUBLISHER_NAME)} — <a href="mailto:${CONTACT_EMAIL}">${escapeHtml(CONTACT_EMAIL)}</a></p>
				<p><strong>${escapeHtml(msg(messages, 'privacy_docs_updated_label'))} :</strong> ${escapeHtml(updated)}</p>
				<p><strong>${escapeHtml(msg(messages, 'privacy_docs_version_label'))} :</strong> ${escapeHtml(version)}</p>
			</div>`;
}

function wrapPage({ localeKey, kind, title, heading, intro, body, footer, messages, version }) {
	const meta = localeMeta[localeKey];
	return `<!doctype html>
<html lang="${meta.lang}">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(title)}</title>
	<style>
		${SHARED_CSS}
	</style>
</head>
<body>
	<main>
		${renderLangSwitch(kind, localeKey)}
		${renderDocNav(kind, localeKey, messages)}
		<header>
			<h1>${escapeHtml(heading)}</h1>
			${renderMeta(messages, version, localeKey)}
		</header>
		${intro ? `<p class="intro">${escapeHtml(intro)}</p>` : ''}
		${kind === 'terms' || kind === 'sale' ? `<p class="intro">${escapeHtml(msg(messages, 'legal_aid_disclaimer'))}</p>` : ''}
		${body}
		<footer>${escapeHtml(footer)}</footer>
	</main>
</body>
</html>
`;
}

function renderPrivacy(localeKey, messages, version) {
	const gdprHtml = gdprCards
		.map(([titleKey, bodyKey]) => renderCard(msg(messages, titleKey), msg(messages, bodyKey)))
		.join('\n');
	const sectionHtml = privacySections
		.map((section) => {
			const pillars = section.pillars
				.map(([titleKey, bodyKey]) =>
					renderCard(msg(messages, titleKey), msg(messages, bodyKey))
				)
				.join('\n');
			return `<section class="section"><h3>${escapeHtml(msg(messages, section.titleKey))}</h3>${pillars}</section>`;
		})
		.join('\n');
	const inventoryHtml = inventoryRows
		.map(([labelKey, bodyKey]) => renderCard(msg(messages, labelKey), msg(messages, bodyKey)))
		.join('\n');
	const body = `<section class="legal">${gdprHtml}</section>
		<section>
			<h2>${escapeHtml(msg(messages, 'privacy_heading'))}</h2>
			<p class="intro">${escapeHtml(msg(messages, 'privacy_intro'))}</p>
			<p class="intro">${escapeHtml(msg(messages, 'legal_aid_disclaimer'))}</p>
		</section>
		${sectionHtml}
		<section class="inventory">
			<div>
				<h2>${escapeHtml(msg(messages, 'privacy_inventory_heading'))}</h2>
				<p class="intro">${escapeHtml(msg(messages, 'privacy_inventory_intro'))}</p>
			</div>
			${inventoryHtml}
		</section>`;
	return wrapPage({
		localeKey,
		kind: 'privacy',
		title: msg(messages, 'title_privacy'),
		heading: msg(messages, 'title_privacy'),
		intro: '',
		body,
		footer: msg(messages, 'privacy_outro', { version }),
		messages,
		version
	});
}

function renderCardDoc(kind, localeKey, messages, version, headingKey, introKey, cards, titleKey) {
	const cardsHtml = cards
		.map(([titleCard, bodyKey]) => {
			let body = msg(messages, bodyKey);
			if (kind === 'terms' && bodyKey === 'terms_object_body') {
				body = `${msg(messages, 'legal_aid_disclaimer')} ${body}`;
			}
			return renderCard(msg(messages, titleCard), body);
		})
		.join('\n');
	return wrapPage({
		localeKey,
		kind,
		title: msg(messages, titleKey),
		heading: msg(messages, headingKey),
		intro: msg(messages, introKey),
		body: `<section class="legal">${cardsHtml}</section>`,
		footer: msg(messages, 'privacy_outro', { version }),
		messages,
		version
	});
}

function renderIndex() {
	return `<!doctype html>
<html lang="fr">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>Yamadori Scouting — Informations légales</title>
	<style>
		${SHARED_CSS}
	</style>
</head>
<body>
	<main>
		<header>
			<h1>Yamadori Scouting</h1>
			<p class="intro">Informations légales — éditeur David Voisard.</p>
		</header>
		<nav class="doc-nav">
			<a href="privacy.html">Politique de confidentialité</a> ·
			<a href="mentions-legales.html">Mentions légales</a> ·
			<a href="cgu.html">CGU</a> ·
			<a href="cgv.html">CGV</a>
		</nav>
	</main>
</body>
</html>
`;
}

function loadMessages(locale) {
	return JSON.parse(
		readFileSync(resolve(repoRoot, `messages/${locale}.json`), 'utf8').replace(/^\uFEFF/, '')
	);
}

const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
mkdirSync(docsDir, { recursive: true });

const outputs = [['index.html', renderIndex()]];

for (const localeKey of Object.keys(localeMeta)) {
	const messages = loadMessages(localeKey);
	const version = pkg.version;
	outputs.push([docFilename('privacy', localeKey), renderPrivacy(localeKey, messages, version)]);
	outputs.push([
		docFilename('legal', localeKey),
		renderCardDoc(
			'legal',
			localeKey,
			messages,
			version,
			'legal_heading',
			'legal_intro',
			legalCards,
			'title_legal'
		)
	]);
	outputs.push([
		docFilename('terms', localeKey),
		renderCardDoc(
			'terms',
			localeKey,
			messages,
			version,
			'terms_heading',
			'terms_intro',
			termsCards,
			'title_terms'
		)
	]);
	outputs.push([
		docFilename('sale', localeKey),
		renderCardDoc(
			'sale',
			localeKey,
			messages,
			version,
			'sale_heading',
			'sale_intro',
			saleCards,
			'title_sale'
		)
	]);
}

for (const [name, html] of outputs) {
	writeFileSync(resolve(docsDir, name), html, 'utf8');
	console.log(`generate-privacy-docs: ${name}`);
}
