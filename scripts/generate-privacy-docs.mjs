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

/** Locale metadata for static privacy HTML pages. */
const locales = {
	fr: {
		lang: 'fr',
		filename: 'privacy.html',
		label: 'Français',
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
		label: 'English',
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
	},
	de: {
		lang: 'de',
		filename: 'privacy-de.html',
		label: 'Deutsch',
		pageTitle: 'Datenschutzerklärung — Yamadori Scouting',
		policyTitle: 'Datenschutzerklärung',
		appLabel: 'Anwendung',
		publisherLabel: 'Herausgeber / Kontakt',
		updatedLabel: 'Zuletzt aktualisiert',
		versionLabel: 'App-Version',
		inAppTitle: 'In-App-Käufe',
		inAppBody:
			'Yamadori Pro ist ein Einmalkauf über Google Play Billing. Transaktionen werden von Google verarbeitet; Yamadori speichert keine Zahlungsdaten. Nur ein Kauf-Token bleibt lokal auf dem Gerät, um Pro-Funktionen freizuschalten.',
		gdprTitle: 'Ihre Rechte',
		gdprBody:
			'Yamadori erstellt kein Benutzerkonto und sendet Ihre Funddaten nicht an einen Herausgeber-Server. Sie können Ihre Daten direkt in der App einsehen, ändern und löschen (Bäume, Fotos, Sprachnotizen, Caches). Bei Fragen kontaktieren Sie uns unter der oben genannten Adresse.',
		changesTitle: 'Änderungen',
		changesBody:
			'Diese Richtlinie kann bei neuen App-Versionen aktualisiert werden. Das Datum der letzten Aktualisierung steht oben auf dieser Seite.',
		langSwitchLabel: 'Sprache'
	},
	es: {
		lang: 'es',
		filename: 'privacy-es.html',
		label: 'Español',
		pageTitle: 'Política de privacidad — Yamadori Scouting',
		policyTitle: 'Política de privacidad',
		appLabel: 'Aplicación',
		publisherLabel: 'Editor / contacto',
		updatedLabel: 'Última actualización',
		versionLabel: 'Versión de la aplicación',
		inAppTitle: 'Compras in-app',
		inAppBody:
			'Yamadori Pro es una compra única gestionada por Google Play Billing. Las transacciones las procesa Google; Yamadori no recoge ni almacena sus datos de pago. Solo se guarda localmente un token de compra para activar las funciones Pro.',
		gdprTitle: 'Sus derechos',
		gdprBody:
			'Yamadori no crea cuentas de usuario ni envía sus datos de exploración a un servidor del editor. Puede consultar, modificar y eliminar sus datos directamente en la aplicación (árboles, fotos, notas de voz, cachés). Para cualquier pregunta, contacte con nosotros en la dirección anterior.',
		changesTitle: 'Modificaciones',
		changesBody:
			'Esta política puede actualizarse con nuevas versiones de la aplicación. La fecha de la última actualización aparece al inicio de esta página.',
		langSwitchLabel: 'Idioma'
	},
	it: {
		lang: 'it',
		filename: 'privacy-it.html',
		label: 'Italiano',
		pageTitle: 'Informativa sulla privacy — Yamadori Scouting',
		policyTitle: 'Informativa sulla privacy',
		appLabel: 'Applicazione',
		publisherLabel: 'Editore / contatto',
		updatedLabel: 'Ultimo aggiornamento',
		versionLabel: 'Versione dell’app',
		inAppTitle: 'Acquisti in-app',
		inAppBody:
			'Yamadori Pro è un acquisto una tantum gestito da Google Play Billing. Le transazioni sono elaborate da Google; Yamadori non raccoglie né conserva i dati di pagamento. Solo un token di acquisto resta sul dispositivo per attivare le funzioni Pro.',
		gdprTitle: 'I tuoi diritti',
		gdprBody:
			'Yamadori non crea account utente e non invia i tuoi dati di scouting a un server dell’editore. Puoi consultare, modificare ed eliminare i dati direttamente nell’app (alberi, foto, note vocali, cache). Per domande, contattaci all’indirizzo sopra.',
		changesTitle: 'Modifiche',
		changesBody:
			'Questa informativa può essere aggiornata con le nuove versioni dell’app. La data dell’ultimo aggiornamento è in cima a questa pagina.',
		langSwitchLabel: 'Lingua'
	},
	nl: {
		lang: 'nl',
		filename: 'privacy-nl.html',
		label: 'Nederlands',
		pageTitle: 'Privacybeleid — Yamadori Scouting',
		policyTitle: 'Privacybeleid',
		appLabel: 'Applicatie',
		publisherLabel: 'Uitgever / contact',
		updatedLabel: 'Laatst bijgewerkt',
		versionLabel: 'App-versie',
		inAppTitle: 'In-app-aankopen',
		inAppBody:
			'Yamadori Pro is een eenmalige aankoop via Google Play Billing. Transacties worden door Google verwerkt; Yamadori verzamelt of bewaart geen betaalgegevens. Alleen een aankooptoken blijft lokaal op het apparaat om Pro-functies te activeren.',
		gdprTitle: 'Uw rechten',
		gdprBody:
			'Yamadori maakt geen gebruikersaccounts en stuurt uw inventarisatiegegevens niet naar een server van de uitgever. U kunt uw gegevens rechtstreeks in de app bekijken, wijzigen en verwijderen (bomen, foto’s, spraaknotities, caches). Voor vragen: neem contact op via het adres hierboven.',
		changesTitle: 'Wijzigingen',
		changesBody:
			'Dit beleid kan worden bijgewerkt bij nieuwe app-versies. De datum van de laatste update staat bovenaan deze pagina.',
		langSwitchLabel: 'Taal'
	},
	sv: {
		lang: 'sv',
		filename: 'privacy-sv.html',
		label: 'Svenska',
		pageTitle: 'Integritetspolicy — Yamadori Scouting',
		policyTitle: 'Integritetspolicy',
		appLabel: 'Applikation',
		publisherLabel: 'Utgivare / kontakt',
		updatedLabel: 'Senast uppdaterad',
		versionLabel: 'Appversion',
		inAppTitle: 'Köp i appen',
		inAppBody:
			'Yamadori Pro är ett engångsköp via Google Play Billing. Transaktioner hanteras av Google; Yamadori samlar inte in eller lagrar dina betalningsuppgifter. Endast en köptoken sparas lokalt på enheten för att aktivera Pro-funktioner.',
		gdprTitle: 'Dina rättigheter',
		gdprBody:
			'Yamadori skapar inga användarkonton och skickar inte dina inventeringsdata till en utgivarserver. Du kan visa, ändra och radera dina data direkt i appen (träd, foton, röstanteckningar, cache). Vid frågor: kontakta oss på adressen ovan.',
		changesTitle: 'Ändringar',
		changesBody:
			'Denna policy kan uppdateras vid nya appversioner. Datum för senaste uppdatering står överst på sidan.',
		langSwitchLabel: 'Språk'
	},
	nb: {
		lang: 'nb',
		filename: 'privacy-nb.html',
		label: 'Norsk',
		pageTitle: 'Personvernerklæring — Yamadori Scouting',
		policyTitle: 'Personvernerklæring',
		appLabel: 'Applikasjon',
		publisherLabel: 'Utgiver / kontakt',
		updatedLabel: 'Sist oppdatert',
		versionLabel: 'App-versjon',
		inAppTitle: 'Kjøp i appen',
		inAppBody:
			'Yamadori Pro er et engangskjøp via Google Play Billing. Transaksjoner behandles av Google; Yamadori samler ikke inn eller lagrer betalingsopplysninger. Kun et kjøpstoken lagres lokalt på enheten for å aktivere Pro-funksjoner.',
		gdprTitle: 'Dine rettigheter',
		gdprBody:
			'Yamadori oppretter ikke brukerkontoer og sender ikke inventeringsdataene dine til en utgiverserver. Du kan se, endre og slette dataene dine direkte i appen (trær, bilder, taleopptak, hurtigbuffer). For spørsmål: kontakt oss på adressen ovenfor.',
		changesTitle: 'Endringer',
		changesBody:
			'Denne erklæringen kan oppdateres ved nye appversjoner. Dato for siste oppdatering står øverst på siden.',
		langSwitchLabel: 'Språk'
	}
};

const DATE_LOCALES = {
	fr: 'fr-FR',
	en: 'en-GB',
	de: 'de-DE',
	es: 'es-ES',
	it: 'it-IT',
	nl: 'nl-NL',
	sv: 'sv-SE',
	nb: 'nb-NO'
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

function renderLangSwitch(currentKey) {
	const current = locales[currentKey];
	const links = Object.entries(locales)
		.map(([key, meta]) => {
			if (key === currentKey) {
				return `<span aria-current="page">${escapeHtml(meta.label)}</span>`;
			}
			return `<a href="${meta.filename}">${escapeHtml(meta.label)}</a>`;
		})
		.join(' · ');
	return `<div class="lang-switch">${escapeHtml(current.langSwitchLabel)} : ${links}</div>`;
}

function renderPage(localeKey, messages, version) {
	const locale = locales[localeKey];
	const updated = formatDate(localeKey);

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
		.lang-switch [aria-current="page"] {
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
		${renderLangSwitch(localeKey)}
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
function loadMessages(locale) {
	return JSON.parse(
		readFileSync(resolve(repoRoot, `messages/${locale}.json`), 'utf8').replace(/^\uFEFF/, '')
	);
}
const messageBundles = {
	fr: loadMessages('fr'),
	en: loadMessages('en'),
	de: loadMessages('de'),
	es: loadMessages('es'),
	it: loadMessages('it'),
	nl: loadMessages('nl'),
	sv: loadMessages('sv'),
	nb: loadMessages('nb')
};

mkdirSync(docsDir, { recursive: true });

const outputs = [
	...Object.keys(locales).map((localeKey) => [
		locales[localeKey].filename,
		renderPage(localeKey, messageBundles[localeKey], pkg.version)
	]),
	['index.html', renderIndex()]
];

for (const [name, html] of outputs) {
	const path = resolve(docsDir, name);
	writeFileSync(path, html, 'utf8');
	console.log(`generate-privacy-docs: ${name}`);
}
