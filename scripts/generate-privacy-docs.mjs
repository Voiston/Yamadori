import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const docsDir = resolve(repoRoot, 'docs');

const CONTACT_EMAIL = 'david.voisard2@gmail.com';
const APP_ID = 'fr.yamadori.scouting';

const sections = [
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
	['privacy_data_cadastre_label', 'privacy_data_cadastre_body']
];

const locales = {
	fr: {
		lang: 'fr',
		filename: 'privacy.html',
		altFilename: 'privacy-en.html',
		altLabel: 'English',
		pageTitle: 'Politique de confidentialité — Yamadori Scouting',
		policyTitle: 'Politique de confidentialité',
		appLabel: 'Application',
		publisherLabel: 'Éditeur / contact',
		updatedLabel: 'Dernière mise à jour',
		versionLabel: 'Version de l’application',
		inAppTitle: 'Achats in-app',
		inAppBody:
			'Yamadori Pro est un achat unique géré par Google Play Billing. Les transactions sont traitées par Google ; Yamadori ne collecte ni ne stocke vos coordonnées bancaires. Seul un jeton d’achat est conservé localement sur l’appareil pour activer les fonctionnalités Pro.',
		gdprTitle: 'Vos droits',
		gdprBody:
			'Yamadori ne crée pas de compte utilisateur et ne transmet pas vos repérages à un serveur éditeur. Vous pouvez consulter, modifier et supprimer vos données directement dans l’application (arbres, photos, notes vocales, caches). Pour toute question : contactez-nous à l’adresse ci-dessus.',
		changesTitle: 'Modifications',
		changesBody:
			'Cette politique peut être mise à jour lors de nouvelles versions de l’application. La date de dernière mise à jour figure en tête de page.',
		langSwitchLabel: 'Langue'
	},
	en: {
		lang: 'en',
		filename: 'privacy-en.html',
		altFilename: 'privacy.html',
		altLabel: 'Français',
		pageTitle: 'Privacy Policy — Yamadori Scouting',
		policyTitle: 'Privacy Policy',
		appLabel: 'Application',
		publisherLabel: 'Publisher / contact',
		updatedLabel: 'Last updated',
		versionLabel: 'App version',
		inAppTitle: 'In-app purchases',
		inAppBody:
			'Yamadori Pro is a one-time purchase handled by Google Play Billing. Transactions are processed by Google; Yamadori does not collect or store your payment details. Only a purchase token is kept locally on the device to enable Pro features.',
		gdprTitle: 'Your rights',
		gdprBody:
			'Yamadori does not create user accounts and does not send your scouting data to a publisher server. You can view, edit and delete your data directly in the app (trees, photos, voice notes, caches). For any question, contact us at the address above.',
		changesTitle: 'Changes',
		changesBody:
			'This policy may be updated with new app releases. The last updated date is shown at the top of this page.',
		langSwitchLabel: 'Language'
	}
};

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

function formatDate(locale) {
	return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(new Date());
}

function renderCard(title, body) {
	return `<article class="card"><h4>${escapeHtml(title)}</h4><p>${escapeHtml(body)}</p></article>`;
}

function renderPage(localeKey, messages, version) {
	const locale = locales[localeKey];
	const updated = formatDate(locale.lang);

	const sectionHtml = sections
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
		.map(([labelKey, bodyKey]) =>
			renderCard(msg(messages, labelKey), msg(messages, bodyKey))
		)
		.join('\n');

	return `<!doctype html>
<html lang="${locale.lang}">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<title>${escapeHtml(locale.pageTitle)}</title>
	<style>
		:root {
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
		main {
			max-width: 42rem;
			margin: 0 auto;
			padding: 1.5rem 1rem 3rem;
		}
		header {
			margin-bottom: 1.5rem;
		}
		h1 {
			margin: 0 0 0.75rem;
			font-size: 1.5rem;
			line-height: 1.25;
		}
		h2 {
			margin: 0 0 0.5rem;
			font-size: 1.125rem;
		}
		h3 {
			margin: 0 0 0.75rem;
			font-size: 0.75rem;
			font-weight: 600;
			letter-spacing: 0.06em;
			text-transform: uppercase;
			color: var(--muted);
		}
		h4 {
			margin: 0;
			font-size: 0.95rem;
		}
		p {
			margin: 0.5rem 0 0;
		}
		.meta {
			font-size: 0.875rem;
			color: var(--muted);
		}
		.meta p { margin: 0.25rem 0; }
		.lang-switch {
			margin-bottom: 1rem;
			font-size: 0.875rem;
		}
		.lang-switch a {
			color: var(--forest-800);
			font-weight: 600;
			text-decoration: none;
		}
		.lang-switch a:hover { text-decoration: underline; }
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
		.card p {
			color: var(--muted);
			font-size: 0.9rem;
		}
		footer {
			margin-top: 2rem;
			text-align: center;
			font-size: 0.75rem;
			color: var(--muted);
		}
		a { color: var(--forest-800); }
	</style>
</head>
<body>
	<main>
		<div class="lang-switch">${escapeHtml(locale.langSwitchLabel)} : <a href="${locale.altFilename}">${escapeHtml(locale.altLabel)}</a></div>
		<header>
			<h1>${escapeHtml(locale.policyTitle)}</h1>
			<div class="meta">
				<p><strong>${escapeHtml(locale.appLabel)} :</strong> Yamadori Scouting (${escapeHtml(APP_ID)})</p>
				<p><strong>${escapeHtml(locale.publisherLabel)} :</strong> <a href="mailto:${CONTACT_EMAIL}">${escapeHtml(CONTACT_EMAIL)}</a></p>
				<p><strong>${escapeHtml(locale.updatedLabel)} :</strong> ${escapeHtml(updated)}</p>
				<p><strong>${escapeHtml(locale.versionLabel)} :</strong> ${escapeHtml(version)}</p>
			</div>
		</header>

		<section class="legal">
			${renderCard(locale.inAppTitle, locale.inAppBody)}
			${renderCard(locale.gdprTitle, locale.gdprBody)}
			${renderCard(locale.changesTitle, locale.changesBody)}
		</section>

		<section>
			<h2>${escapeHtml(msg(messages, 'privacy_heading'))}</h2>
			<p class="intro">${escapeHtml(msg(messages, 'privacy_intro'))}</p>
		</section>

		${sectionHtml}

		<section class="inventory">
			<div>
				<h2>${escapeHtml(msg(messages, 'privacy_inventory_heading'))}</h2>
				<p class="intro">${escapeHtml(msg(messages, 'privacy_inventory_intro'))}</p>
			</div>
			${inventoryHtml}
		</section>

		<footer>${escapeHtml(msg(messages, 'privacy_outro', { version }))}</footer>
	</main>
</body>
</html>
`;
}

function renderIndex() {
	return `<!doctype html>
<html lang="fr">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta http-equiv="refresh" content="0; url=privacy.html" />
	<title>Politique de confidentialité — Yamadori Scouting</title>
	<link rel="canonical" href="privacy.html" />
</head>
<body>
	<p><a href="privacy.html">Politique de confidentialité — Yamadori Scouting</a></p>
</body>
</html>
`;
}

const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
const fr = JSON.parse(readFileSync(resolve(repoRoot, 'messages/fr.json'), 'utf8'));
const en = JSON.parse(readFileSync(resolve(repoRoot, 'messages/en.json'), 'utf8'));

mkdirSync(docsDir, { recursive: true });

const outputs = [
	['privacy.html', renderPage('fr', fr, pkg.version)],
	['privacy-en.html', renderPage('en', en, pkg.version)],
	['index.html', renderIndex()]
];

for (const [name, html] of outputs) {
	const path = resolve(docsDir, name);
	writeFileSync(path, html, 'utf8');
	console.log(`generate-privacy-docs: ${name}`);
}
