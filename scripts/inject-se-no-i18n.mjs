/**
 * Inject SE/NO geo capability + privacy mentions into all message locales.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const banners = {
	fr: {
		se: 'Suède : couverture partielle (Allemansrätten ≠ déraciner un arbre vivant sans accord du propriétaire ; carte OpenTopo — Lantmäteriet sous compte ; cadastre = commune via géocodage ; zones EEA).',
		no: 'Norvège : couverture partielle (allemannsretten ≠ déraciner un arbre vivant sans accord du propriétaire ; carte Kartverket ; cadastre matrikkel disponible ; annuaire via géocodage ; zones EEA).'
	},
	en: {
		se: 'Sweden: partial coverage (Allemansrätten ≠ uprooting a living tree without the landowner’s consent; OpenTopo map — Lantmäteriet needs an account; cadastre = municipality via geocoding; EEA protected areas).',
		no: 'Norway: partial coverage (allemannsretten ≠ uprooting a living tree without the landowner’s consent; Kartverket map; matrikkel cadastre available; municipal directory via geocoding; EEA protected areas).'
	},
	de: {
		se: 'Schweden: teilweise Abdeckung (Allemansrätten ≠ Ausgraben eines lebenden Baumes ohne Eigentümererlaubnis; OpenTopo-Karte — Lantmäteriet braucht Konto; Kataster = Gemeinde via Geokodierung; EEA-Schutzgebiete).',
		no: 'Norwegen: teilweise Abdeckung (Allemannsretten ≠ Ausgraben eines lebenden Baumes ohne Eigentümererlaubnis; Kartverket-Karte; Matrikkel-Kataster verfügbar; Gemeindeverzeichnis via Geokodierung; EEA-Schutzgebiete).'
	},
	es: {
		se: 'Suecia: cobertura parcial (Allemansrätten ≠ arrancar un árbol vivo sin consentimiento del propietario; mapa OpenTopo — Lantmäteriet requiere cuenta; catastro = municipio vía geocodificación; zonas EEA).',
		no: 'Noruega: cobertura parcial (allemannsretten ≠ arrancar un árbol vivo sin consentimiento del propietario; mapa Kartverket; catastro matrikkel disponible; directorio vía geocodificación; zonas EEA).'
	},
	it: {
		se: 'Svezia: copertura parziale (Allemansrätten ≠ sradicare un albero vivo senza consenso del proprietario; mappa OpenTopo — Lantmäteriet richiede account; catasto = comune via geocoding; aree EEA).',
		no: 'Norvegia: copertura parziale (allemannsretten ≠ sradicare un albero vivo senza consenso del proprietario; mappa Kartverket; catasto matrikkel disponibile; elenco via geocoding; aree EEA).'
	},
	nl: {
		se: 'Zweden: gedeeltelijke dekking (Allemansrätten ≠ een levende boom uitgraven zonder toestemming van de eigenaar; OpenTopo-kaart — Lantmäteriet vereist account; kadaster = gemeente via geocodering; EEA-gebieden).',
		no: 'Noorwegen: gedeeltelijke dekking (allemannsretten ≠ een levende boom uitgraven zonder toestemming van de eigenaar; Kartverket-kaart; matrikkel-kadaster beschikbaar; gemeentegids via geocodering; EEA-gebieden).'
	}
};

const privacyNeedle = 'PDOK BRT (NL)';
const privacyReplace = {
	fr: 'PDOK BRT (NL) / OpenTopo (SE) / Kartverket (NO)',
	en: 'PDOK BRT (NL) / OpenTopo (SE) / Kartverket (NO)',
	de: 'PDOK BRT (NL) / OpenTopo (SE) / Kartverket (NO)',
	es: 'PDOK BRT (NL) / OpenTopo (SE) / Kartverket (NO)',
	it: 'PDOK BRT (NL) / OpenTopo (SE) / Kartverket (NO)',
	nl: 'PDOK BRT (NL) / OpenTopo (SE) / Kartverket (NO)'
};

const thirdNeedle = 'PDOK BRT NL';
const thirdReplace = 'PDOK BRT NL, OpenTopo SE, Kartverket NO';
const cadNeedle = 'BRK NL';
const cadReplace = 'BRK NL, kommun SE, matrikkel NO';

for (const loc of Object.keys(banners)) {
	const path = `messages/${loc}.json`;
	const data = JSON.parse(readFileSync(path, 'utf8'));
	data.geo_capability_se_partial = banners[loc].se;
	data.geo_capability_no_partial = banners[loc].no;
	if (typeof data.privacy_pillar_network_body === 'string') {
		data.privacy_pillar_network_body = data.privacy_pillar_network_body.replace(
			privacyNeedle,
			privacyReplace[loc]
		);
	}
	if (typeof data.privacy_pillar_third_parties_body === 'string') {
		data.privacy_pillar_third_parties_body = data.privacy_pillar_third_parties_body
			.replace(thirdNeedle, thirdReplace)
			.replace(cadNeedle, cadReplace);
	}
	writeFileSync(path, JSON.stringify(data, null, '\t') + '\n');
	console.log('updated', loc);
}
