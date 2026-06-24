/** @typedef {{ fr: string; en: string; de: string; it: string; es: string }} LocaleEntry */

/** @type {Record<string, LocaleEntry>} */
const catalog = {};

/**
 * @param {string} key
 * @param {string} fr
 * @param {string} en
 * @param {string} de
 * @param {string} it
 * @param {string} es
 */
function t(key, fr, en, de, it, es) {
	catalog[key] = { fr, en, de, it, es };
}

/**
 * @param {string} prefix
 * @param {Array<{ key: string; fr: string; en: string; de: string; it: string; es: string }>} rows
 */
function batch(prefix, rows) {
	for (const row of rows) {
		t(`${prefix}_${row.key}`, row.fr, row.en, row.de, row.it, row.es);
	}
}

// ── Navigation ──────────────────────────────────────────────────────────────
t('nav_list', 'Liste', 'List', 'Liste', 'Lista', 'Lista');
t('nav_map', 'Carte', 'Map', 'Karte', 'Mappa', 'Mapa');
t('nav_add', 'Ajouter', 'Add', 'Hinzufügen', 'Aggiungi', 'Añadir');
t('nav_settings', 'Réglages', 'Settings', 'Einstellungen', 'Impostazioni', 'Ajustes');
t('nav_main', 'Navigation principale', 'Main navigation', 'Hauptnavigation', 'Navigazione principale', 'Navegación principal');
t('nav_back_to_list', 'Retour à la liste', 'Back to list', 'Zurück zur Liste', 'Torna alla lista', 'Volver a la lista');

// ── Page titles ─────────────────────────────────────────────────────────────
t('title_list', 'Liste — Yamadori Scouting', 'List — Yamadori Scouting', 'Liste — Yamadori Scouting', 'Lista — Yamadori Scouting', 'Lista — Yamadori Scouting');
t('title_map', 'Carte — Yamadori Scouting', 'Map — Yamadori Scouting', 'Karte — Yamadori Scouting', 'Mappa — Yamadori Scouting', 'Mapa — Yamadori Scouting');
t('title_settings', 'Réglages — Yamadori Scouting', 'Settings — Yamadori Scouting', 'Einstellungen — Yamadori Scouting', 'Impostazioni — Yamadori Scouting', 'Ajustes — Yamadori Scouting');
t('title_capture', 'Nouveau repérage', 'New scouting entry', 'Neue Sichtung', 'Nuovo rilevamento', 'Nuevo registro');
t('title_parking', 'Point de départ', 'Starting point', 'Startpunkt', 'Punto di partenza', 'Punto de partida');
t('title_detail', 'Détail', 'Detail', 'Detail', 'Dettaglio', 'Detalle');

// ── List / empty states ─────────────────────────────────────────────────────
t('list_no_results', 'Aucun résultat', 'No results', 'Keine Ergebnisse', 'Nessun risultato', 'Sin resultados');
t('list_no_favorites', 'Aucun favori', 'No favorites', 'Keine Favoriten', 'Nessun preferito', 'Sin favoritos');
t('list_no_trees', 'Aucun arbre enregistré', 'No trees recorded', 'Keine Bäume erfasst', 'Nessun albero registrato', 'Ningún árbol registrado');
t('list_no_favorites_for_query', 'Aucun favori pour « {query} »', 'No favorites for "{query}"', 'Keine Favoriten für „{query}"', 'Nessun preferito per «{query}»', 'Sin favoritos para «{query}»');
t('list_no_results_for_query', 'Aucun résultat pour « {query} »', 'No results for "{query}"', 'Keine Ergebnisse für „{query}"', 'Nessun risultato per «{query}»', 'Sin resultados para «{query}»');
t('list_favorites_hint', 'Marquez des arbres en favori depuis leur fiche détail.', 'Mark trees as favorites from their detail page.', 'Markieren Sie Bäume auf der Detailseite als Favoriten.', 'Segna gli alberi come preferiti dalla scheda dettaglio.', 'Marca árboles como favoritos desde su ficha de detalle.');
t('list_empty_hint', 'Commencez votre repérage en ajoutant votre premier yamadori.', 'Start scouting by adding your first yamadori.', 'Beginnen Sie mit Ihrer ersten Yamadori-Sichtung.', 'Inizia il rilevamento aggiungendo il tuo primo yamadori.', 'Empieza el registro añadiendo tu primer yamadori.');
t('list_sort_distance_active', 'Tri par distance depuis votre position actuelle.', 'Sorted by distance from your current position.', 'Sortiert nach Entfernung von Ihrer aktuellen Position.', 'Ordinato per distanza dalla posizione attuale.', 'Ordenado por distancia desde tu posición actual.');
t('list_gps_searching', 'Recherche de votre position GPS…', 'Searching for your GPS position…', 'GPS-Position wird gesucht…', 'Ricerca della posizione GPS…', 'Buscando tu posición GPS…');

// ── Filter / search / sort ──────────────────────────────────────────────────
t('filter_all', 'Tous', 'All', 'Alle', 'Tutti', 'Todos');
t('filter_favorites', 'Favoris', 'Favorites', 'Favoriten', 'Preferiti', 'Favoritos');
t('filter_group_label', 'Filtrer la liste', 'Filter list', 'Liste filtern', 'Filtra elenco', 'Filtrar lista');
t('search_placeholder', 'Filtrer par espèce…', 'Filter by species…', 'Nach Art filtern…', 'Filtra per specie…', 'Filtrar por especie…');
t('sort_label', 'Trier par', 'Sort by', 'Sortieren nach', 'Ordina per', 'Ordenar por');

batch('sort', [
	{ key: 'date_desc', fr: 'Date (récent)', en: 'Date (newest)', de: 'Datum (neueste)', it: 'Data (recente)', es: 'Fecha (reciente)' },
	{ key: 'date_asc', fr: 'Date (ancien)', en: 'Date (oldest)', de: 'Datum (älteste)', it: 'Data (più vecchia)', es: 'Fecha (antigua)' },
	{ key: 'distance_asc', fr: 'Distance (proche)', en: 'Distance (near)', de: 'Entfernung (nah)', it: 'Distanza (vicino)', es: 'Distancia (cerca)' },
	{ key: 'distance_desc', fr: 'Distance (loin)', en: 'Distance (far)', de: 'Entfernung (fern)', it: 'Distanza (lontano)', es: 'Distancia (lejos)' },
	{ key: 'potential_desc', fr: 'Potentiel (élevé)', en: 'Potential (high)', de: 'Potenzial (hoch)', it: 'Potenziale (alto)', es: 'Potencial (alto)' },
	{ key: 'potential_asc', fr: 'Potentiel (faible)', en: 'Potential (low)', de: 'Potenzial (niedrig)', it: 'Potenziale (basso)', es: 'Potencial (bajo)' },
	{ key: 'size_class', fr: 'Taille', en: 'Size', de: 'Größe', it: 'Dimensione', es: 'Tamaño' },
	{ key: 'caliber', fr: 'Calibre', en: 'Caliber', de: 'Kaliber', it: 'Calibro', es: 'Calibre' },
	{ key: 'trunk_diameter', fr: 'Diamètre tronc', en: 'Trunk diameter', de: 'Stammdurchmesser', it: 'Diametro tronco', es: 'Diámetro del tronco' },
	{ key: 'species', fr: 'Espèce (A–Z)', en: 'Species (A–Z)', de: 'Art (A–Z)', it: 'Specie (A–Z)', es: 'Especie (A–Z)' },
	{ key: 'altitude_desc', fr: 'Altitude (haute)', en: 'Altitude (high)', de: 'Höhe (hoch)', it: 'Altitudine (alta)', es: 'Altitud (alta)' },
	{ key: 'altitude_asc', fr: 'Altitude (basse)', en: 'Altitude (low)', de: 'Höhe (niedrig)', it: 'Altitudine (bassa)', es: 'Altitud (baja)' }
]);

// ── Common actions ──────────────────────────────────────────────────────────
t('action_save', 'Enregistrer', 'Save', 'Speichern', 'Salva', 'Guardar');
t('action_saving', 'Enregistrement…', 'Saving…', 'Speichern…', 'Salvataggio…', 'Guardando…');
t('action_cancel', 'Annuler', 'Cancel', 'Abbrechen', 'Annulla', 'Cancelar');
t('action_confirm', 'Confirmer', 'Confirm', 'Bestätigen', 'Conferma', 'Confirmar');
t('action_delete', 'Supprimer', 'Delete', 'Löschen', 'Elimina', 'Eliminar');
t('action_edit', 'Modifier', 'Edit', 'Bearbeiten', 'Modifica', 'Editar');
t('action_close', 'Fermer', 'Close', 'Schließen', 'Chiudi', 'Cerrar');
t('action_retry', 'Réessayer', 'Retry', 'Erneut versuchen', 'Riprova', 'Reintentar');
t('action_share', 'Partager', 'Share', 'Teilen', 'Condividi', 'Compartir');
t('action_view', 'Voir', 'View', 'Ansehen', 'Vedi', 'Ver');
t('action_merge', 'Fusionner', 'Merge', 'Zusammenführen', 'Unisci', 'Fusionar');
t('action_replace', 'Remplacer', 'Replace', 'Ersetzen', 'Sostituisci', 'Reemplazar');
t('action_ignore', 'Ignorer', 'Ignore', 'Ignorieren', 'Ignora', 'Ignorar');
t('action_export', 'Exporter (partager)', 'Export (share)', 'Exportieren (teilen)', 'Esporta (condividi)', 'Exportar (compartir)');
t('action_exporting', 'Export…', 'Exporting…', 'Export…', 'Esportazione…', 'Exportando…');
t('action_import', 'Importer (fusionner)', 'Import (merge)', 'Importieren (zusammenführen)', 'Importa (unisci)', 'Importar (fusionar)');
t('action_importing', 'Import…', 'Importing…', 'Import…', 'Importazione…', 'Importando…');
t('action_clearing', 'Vidage…', 'Clearing…', 'Leeren…', 'Svuotamento…', 'Vaciando…');

// ── Confirm dialog ──────────────────────────────────────────────────────────
t('confirm_default_message', 'Êtes-vous sûr ?', 'Are you sure?', 'Sind Sie sicher?', 'Sei sicuro?', '¿Estás seguro?');
t('confirm_save_anyway', 'Enregistrer quand même', 'Save anyway', 'Trotzdem speichern', 'Salva comunque', 'Guardar de todos modos');

// ── Tree types / labels ─────────────────────────────────────────────────────
t('tree_species_unset', 'Espèce non renseignée', 'Species not specified', 'Art nicht angegeben', 'Specie non indicata', 'Especie no indicada');
t('tree_initial_visit_note', 'Découverte et premier repérage', 'Discovery and first scouting', 'Entdeckung und erste Sichtung', 'Scoperta e primo rilevamento', 'Descubrimiento y primer registro');
t('tree_view_detail', 'Voir le détail de {label}', 'View details of {label}', 'Details von {label} anzeigen', 'Vedi dettaglio di {label}', 'Ver detalle de {label}');
t('tree_favorite', 'Favori', 'Favorite', 'Favorit', 'Preferito', 'Favorito');
t('tree_delete_message', "Cette action est irréversible. L'arbre et sa photo seront définitivement supprimés.", 'This action is irreversible. The tree and its photo will be permanently deleted.', 'Diese Aktion ist unwiderruflich. Der Baum und sein Foto werden dauerhaft gelöscht.', "Questa azione è irreversibile. L'albero e la sua foto saranno eliminati definitivamente.", 'Esta acción es irreversible. El árbol y su foto se eliminarán definitivamente.');
t('tree_saved', 'Modifications enregistrées', 'Changes saved', 'Änderungen gespeichert', 'Modifiche salvate', 'Cambios guardados');
t('tree_voice_saved', 'Note vocale enregistrée', 'Voice note saved', 'Sprachnotiz gespeichert', 'Nota vocale salvata', 'Nota de voz guardada');
t('tree_no_visits', 'Aucune visite enregistrée.', 'No visits recorded.', 'Keine Besuche erfasst.', 'Nessuna visita registrata.', 'Ninguna visita registrada.');
t('tree_visit_photo_alt', 'Photo de visite', 'Visit photo', 'Besuchsfoto', 'Foto della visita', 'Foto de visita');
t('tree_climate_unavailable', 'Données climatiques non disponibles', 'Climate data unavailable', 'Klimadaten nicht verfügbar', 'Dati climatici non disponibili', 'Datos climáticos no disponibles');

// ── Assessment options ──────────────────────────────────────────────────────
batch('nebari', [
	{ key: 'plat_rayonnant', fr: 'Plat / Rayonnant', en: 'Flat / Radiating', de: 'Flach / Strahlend', it: 'Piatto / Radiante', es: 'Plano / Radiante' },
	{ key: 'unilateral_asymetrique', fr: 'Unilatéral / Asymétrique', en: 'Unilateral / Asymmetric', de: 'Unilateral / Asymmetrisch', it: 'Unilaterale / Asimmetrico', es: 'Unilateral / Asimétrico' },
	{ key: 'enroche_fissure', fr: 'Enroché / Fissure', en: 'Rock-grown / Crack', de: 'In Fels / Spalte', it: 'Su roccia / Fessura', es: 'Sobre roca / Grieta' }
]);
batch('bark', [
	{ key: 'lisse_jeune', fr: 'Lisse / Jeune', en: 'Smooth / Young', de: 'Glatt / Jung', it: 'Liscia / Giovane', es: 'Lisa / Joven' },
	{ key: 'ecaillee_mature', fr: 'Écaillée / Mature', en: 'Scaly / Mature', de: 'Schuppig / Reif', it: 'Squamosa / Matura', es: 'Escamosa / Madura' },
	{ key: 'cretelee_profonde', fr: 'Crételée / Profonde', en: 'Deeply furrowed', de: 'Tief gefurcht', it: 'Profondamente crespata', es: 'Profundamente surcada' }
]);
batch('deadwood', [
	{ key: 'aucun', fr: 'Aucun', en: 'None', de: 'Keins', it: 'Nessuno', es: 'Ninguno' },
	{ key: 'jin', fr: 'Jin (branches)', en: 'Jin (branches)', de: 'Jin (Äste)', it: 'Jin (rami)', es: 'Jin (ramas)' },
	{ key: 'shari', fr: 'Shari (tronc)', en: 'Shari (trunk)', de: 'Shari (Stamm)', it: 'Shari (tronco)', es: 'Shari (tronco)' },
	{ key: 'sabamiki', fr: 'Sabamiki (creux)', en: 'Sabamiki (hollow)', de: 'Sabamiki (Höhlung)', it: 'Sabamiki (cavità)', es: 'Sabamiki (hueco)' }
]);
batch('size', [
	{ key: 'shohin', fr: 'Shohin (<25 cm)', en: 'Shohin (<25 cm)', de: 'Shohin (<25 cm)', it: 'Shohin (<25 cm)', es: 'Shohin (<25 cm)' },
	{ key: 'chuhin', fr: 'Chūhin (25–45 cm)', en: 'Chūhin (25–45 cm)', de: 'Chūhin (25–45 cm)', it: 'Chūhin (25–45 cm)', es: 'Chūhin (25–45 cm)' },
	{ key: 'dai', fr: 'Dai (>45 cm)', en: 'Dai (>45 cm)', de: 'Dai (>45 cm)', it: 'Dai (>45 cm)', es: 'Dai (>45 cm)' }
]);
batch('caliber', [
	{ key: 'fronde', fr: 'Frondé', en: 'Frond', de: 'Frond', it: 'Fronda', es: 'Fronda' },
	{ key: 'poignet', fr: 'Poignet', en: 'Wrist', de: 'Handgelenk', it: 'Polso', es: 'Muñeca' },
	{ key: 'canette', fr: 'Canette', en: 'Can', de: 'Dose', it: 'Lattina', es: 'Lata' },
	{ key: 'cuisse', fr: 'Cuisse', en: 'Thigh', de: 'Oberschenkel', it: 'Coscia', es: 'Muslo' }
]);
batch('cernage', [
	{ key: 'not_started', fr: 'Non commencé', en: 'Not started', de: 'Nicht begonnen', it: 'Non iniziato', es: 'No iniciado' },
	{ key: 'partial', fr: 'Partiel', en: 'Partial', de: 'Teilweise', it: 'Parziale', es: 'Parcial' },
	{ key: 'advanced', fr: 'Avancé', en: 'Advanced', de: 'Fortgeschritten', it: 'Avanzato', es: 'Avanzado' },
	{ key: 'completed', fr: 'Terminé', en: 'Completed', de: 'Abgeschlossen', it: 'Completato', es: 'Completado' }
]);
batch('phenology', [
	{ key: 'dormance', fr: 'Dormance', en: 'Dormancy', de: 'Ruhephase', it: 'Dormienza', es: 'Latencia' },
	{ key: 'bourgeon_gonfle', fr: 'Bourgeons gonflés', en: 'Swollen buds', de: 'Geschwollene Knospen', it: 'Gemme gonfie', es: 'Yemas hinchadas' },
	{ key: 'debourrement', fr: 'Débourrement', en: 'Bud break', de: 'Austrieb', it: 'Germogliamento', es: 'Brotación' },
	{ key: 'feuillaison', fr: 'Feuillaison', en: 'Leaf-out', de: 'Blattaustrieb', it: 'Fogliatura', es: 'Hojeado' },
	{ key: 'croissance_active', fr: 'Croissance active', en: 'Active growth', de: 'Aktives Wachstum', it: 'Crescita attiva', es: 'Crecimiento activo' }
]);

// ── Environment exposure ────────────────────────────────────────────────────
batch('exposure', [
	{ key: 'open', fr: 'Plein ciel / ouvert', en: 'Open sky / exposed', de: 'Offener Himmel / exponiert', it: 'Cielo aperto / esposto', es: 'Cielo abierto / expuesto' },
	{ key: 'edge', fr: 'Lisière / clairière', en: 'Forest edge / clearing', de: 'Waldrand / Lichtung', it: 'Margine / radura', es: 'Linde / claro' },
	{ key: 'forest_dense', fr: 'Sous-bois dense', en: 'Dense understory', de: 'Dichter Unterwuchs', it: 'Sottobosco denso', es: 'Sotobosque denso' }
]);
t('exposure_short_open', 'Ouvert', 'Open', 'Offen', 'Aperto', 'Abierto');
t('exposure_short_edge', 'Lisière', 'Edge', 'Rand', 'Margine', 'Linde');
t('exposure_short_forest', 'Sous-bois', 'Understory', 'Unterholz', 'Sottobosco', 'Sotobosque');
t('exposure_hint_open', 'Exposition forte → stress hydrique rapide possible', 'High exposure → rapid water stress possible', 'Starke Exposition → schneller Wasserstress möglich', 'Esposizione forte → possibile stress idrico rapido', 'Exposición fuerte → posible estrés hídrico rápido');
t('exposure_hint_edge', 'Conditions équilibrées, microclimat modéré', 'Balanced conditions, moderate microclimate', 'Ausgewogene Bedingungen, moderates Mikroklima', 'Condizioni equilibrate, microclima moderato', 'Condiciones equilibradas, microclima moderado');
t('exposure_hint_forest', 'Microclimat protégé, sol et air réchauffent plus lentement', 'Protected microclimate, soil and air warm more slowly', 'Geschütztes Mikroklima, Boden und Luft erwärmen sich langsamer', 'Microclima protetto, suolo e aria si riscaldano più lentamente', 'Microclima protegido, suelo y aire se calientan más lentamente');
t('exposure_label', 'Exposition', 'Exposure', 'Exposition', 'Esposizione', 'Exposición');

// ── Assessment panel ────────────────────────────────────────────────────────
t('assessment_title', 'Notation bonsaï', 'Bonsai rating', 'Bonsai-Bewertung', 'Valutazione bonsai', 'Valoración bonsái');
t('assessment_evaluate', 'Évaluer le potentiel yamadori', 'Assess yamadori potential', 'Yamadori-Potenzial bewerten', 'Valuta il potenziale yamadori', 'Evaluar el potencial yamadori');
t('assessment_nebari', 'Nébari (racines)', 'Nebari (roots)', 'Nebari (Wurzeln)', 'Nebari (radici)', 'Nebari (raíces)');
t('assessment_trunk_diameter', 'Diamètre de tronc (cm)', 'Trunk diameter (cm)', 'Stammdurchmesser (cm)', 'Diametro tronco (cm)', 'Diámetro del tronco (cm)');
t('assessment_bark', 'Écorce (maturité)', 'Bark (maturity)', 'Rinde (Reife)', 'Corteccia (maturità)', 'Corteza (madurez)');
t('assessment_deadwood', 'Bois mort naturel', 'Natural deadwood', 'Natürliches Totholz', 'Legno morto naturale', 'Madera muerta natural');
t('assessment_size', 'Classification de taille', 'Size classification', 'Größenklassifikation', 'Classificazione dimensione', 'Clasificación de tamaño');
t('assessment_caliber', 'Calibre estimé', 'Estimated caliber', 'Geschätztes Kaliber', 'Calibro stimato', 'Calibre estimado');
t('assessment_phenology', 'Phénologie observée (terrain)', 'Observed phenology (field)', 'Beobachtete Phänologie (Feld)', 'Fenologia osservata (campo)', 'Fenología observada (campo)');
t('assessment_phenology_hint', "Optionnel — remplace l'estimation GDD pour le score YRS si renseigné.", 'Optional — overrides GDD estimate for YRS score when set.', 'Optional — ersetzt GDD-Schätzung für YRS-Score wenn gesetzt.', 'Opzionale — sostituisce la stima GDD per il punteggio YRS se indicata.', 'Opcional — reemplaza la estimación GDD para el puntaje YRS si se indica.');
t('assessment_cernage', 'Cernage racinaire', 'Root ring preparation', 'Wurzelring-Vorbereitung', 'Preparazione radicale', 'Preparación radicular');
t('assessment_potential', 'Potentiel bonsaï', 'Bonsai potential', 'Bonsai-Potenzial', 'Potenziale bonsai', 'Potencial bonsái');

// ── GDD config labels ───────────────────────────────────────────────────────
batch('gdd_category', [
	{ key: 'montagnarde', fr: 'montagnarde', en: 'mountain', de: 'alpin', it: 'montana', es: 'montaña' },
	{ key: 'foret', fr: 'forêt', en: 'forest', de: 'Wald', it: 'foresta', es: 'bosque' },
	{ key: 'standard', fr: 'standard', en: 'standard', de: 'Standard', it: 'standard', es: 'estándar' }
]);
batch('gdd_zone', [
	{ key: 'late_dormancy', fr: 'Dormance tardive', en: 'Late dormancy', de: 'Späte Ruhephase', it: 'Dormienza tardiva', es: 'Latencia tardía' },
	{ key: 'early_awakening', fr: 'Réveil précoce', en: 'Early awakening', de: 'Frühes Erwachen', it: 'Risveglio precoce', es: 'Despertar temprano' },
	{ key: 'favorable_window', fr: 'Fenêtre yamadori favorable', en: 'Favorable yamadori window', de: 'Günstiges Yamadori-Fenster', it: 'Finestra yamadori favorevole', es: 'Ventana yamadori favorable' },
	{ key: 'advanced_budbreak', fr: 'Débourrement avancé', en: 'Advanced bud break', de: 'Fortgeschrittener Austrieb', it: 'Germogliamento avanzato', es: 'Brotación avanzada' },
	{ key: 'late_season', fr: 'Saison avancée', en: 'Late season', de: 'Späte Saison', it: 'Stagione avanzata', es: 'Temporada avanzada' }
]);
t('gdd_indeterminate', 'Indéterminé', 'Undetermined', 'Unbestimmt', 'Indeterminato', 'Indeterminado');
t('gdd_transition', 'Transition {from} → {to}', 'Transition {from} → {to}', 'Übergang {from} → {to}', 'Transizione {from} → {to}', 'Transición {from} → {to}');
t('gdd_probabilistic_disclaimer', 'estimation probabiliste', 'probabilistic estimate', 'probabilistische Schätzung', 'stima probabilistica', 'estimación probabilística');
t('gdd_evergreen_reason', 'Modèle adapté aux feuillus — espèce persistante', 'Deciduous model — evergreen species', 'Laubbaum-Modell — immergrüne Art', 'Modello per latifoglie — specie sempreverde', 'Modelo para caducifolias — especie perenne');

// ── GDD metric help ─────────────────────────────────────────────────────────
t('gdd_help_title', 'Phénologie thermique (GDD)', 'Thermal phenology (GDD)', 'Thermische Phänologie (GDD)', 'Fenologia termica (GDD)', 'Fenología térmica (GDD)');
t('gdd_help_text', "Le cumul de degrés-jours (GDD) mesure la chaleur accumulée depuis le 1er janvier. Chaque jour, on additionne la température moyenne au-dessus d'un seuil de base (adapté à l'espèce ou au biotope). La zone saisonnière indique la fenêtre yamadori (150–400 °c.j). Le libellé de transition résume l'estimation phénologique — utilisez-le comme repère, pas comme certitude.", 'Growing degree days (GDD) measure heat accumulated since January 1. Each day, mean temperature above a base threshold (adapted to species or biotope) is summed. The seasonal zone indicates the yamadori window (150–400 °d). The transition label summarizes phenology — use it as a guide, not certainty.', 'Gradtagsummen (GDD) messen die seit dem 1. Januar akkumulierte Wärme. Täglich wird die mittlere Temperatur über einer Basisschwelle summiert. Die Saisonzone zeigt das Yamadori-Fenster (150–400 °d).', 'I gradi-giorno (GDD) misurano il calore accumulato dal 1° gennaio. Ogni giorno si somma la temperatura media sopra una soglia base. La zona stagionale indica la finestra yamadori (150–400 °g.g.).', 'Los grados-día (GDD) miden el calor acumulado desde el 1 de enero. Cada día se suma la temperatura media por encima de un umbral base. La zona estacional indica la ventana yamadori (150–400 °d.d.).');
t('gdd_7d_title', 'GDD sur 7 jours', 'GDD over 7 days', 'GDD über 7 Tage', 'GDD su 7 giorni', 'GDD en 7 días');
t('gdd_7d_summary', 'Vitesse actuelle de progression saisonnière.', 'Current seasonal progression rate.', 'Aktuelle saisonale Fortschrittsrate.', 'Velocità attuale di progressione stagionale.', 'Velocidad actual de progresión estacional.');
t('gdd_7d_intro', 'Le GDD sur 7 jours (Growing Degree Days) représente la quantité de chaleur utile accumulée au cours de la dernière semaine.', '7-day GDD represents useful heat accumulated over the past week.', '7-Tage-GDD ist die in der letzten Woche akkumulierte Nutzwärme.', 'Il GDD su 7 giorni rappresenta il calore utile accumulato nell\'ultima settimana.', 'El GDD de 7 días representa el calor útil acumulado en la última semana.');
t('gdd_7d_contrast', 'Contrairement au GDD cumulé, qui indique où en est la saison dans son ensemble, le GDD 7 jours mesure la vitesse actuelle de progression de la saison.', 'Unlike cumulative GDD (overall season progress), 7-day GDD measures current seasonal progression speed.', 'Im Gegensatz zum kumulierten GDD misst 7-Tage-GDD die aktuelle Fortschrittsgeschwindigkeit.', 'A differenza del GDD cumulato, il GDD 7 giorni misura la velocità attuale di progressione.', 'A diferencia del GDD acumulado, el GDD de 7 días mide la velocidad actual de progresión.');
t('gdd_7d_interpret_title', "Comment l'interpréter ?", 'How to interpret it?', 'Wie interpretieren?', 'Come interpretarlo?', '¿Cómo interpretarlo?');
t('gdd_7d_level_high', 'Valeur élevée', 'High value', 'Hoher Wert', 'Valore elevato', 'Valor alto');
t('gdd_7d_level_high_text', 'réchauffement rapide, activité biologique en accélération.', 'rapid warming, accelerating biological activity.', 'schnelle Erwärmung, beschleunigte biologische Aktivität.', 'riscaldamento rapido, attività biologica in accelerazione.', 'calentamiento rápido, actividad biológica acelerándose.');
t('gdd_7d_level_medium', 'Valeur moyenne', 'Medium value', 'Mittlerer Wert', 'Valore medio', 'Valor medio');
t('gdd_7d_level_medium_text', 'progression saisonnière normale.', 'normal seasonal progression.', 'normale saisonale Progression.', 'progressione stagionale normale.', 'progresión estacional normal.');
t('gdd_7d_level_low', 'Valeur faible', 'Low value', 'Niedriger Wert', 'Valore basso', 'Valor bajo');
t('gdd_7d_level_low_text', "période fraîche ou ralentissement temporaire de l'activité végétale.", 'cool period or temporary slowdown in plant activity.', 'kühle Periode oder vorübergehende Verlangsamung.', 'periodo fresco o rallentamento temporaneo dell\'attività vegetale.', 'periodo frío o ralentización temporal de la actividad vegetal.');
t('gdd_7d_yamadori_title', 'Intérêt pour le yamadori', 'Interest for yamadori', 'Relevanz für Yamadori', 'Interesse per lo yamadori', 'Interés para yamadori');
t('gdd_7d_yamadori_intro', 'Le GDD 7 jours aide à détecter les changements récents des conditions climatiques :', '7-day GDD helps detect recent climate changes:', '7-Tage-GDD hilft, kürzliche Klimaänderungen zu erkennen:', 'Il GDD 7 giorni aiuta a rilevare cambiamenti climatici recenti:', 'El GDD de 7 días ayuda a detectar cambios climáticos recientes:');
t('gdd_7d_yamadori_point_1', "Un GDD cumulé favorable associé à un GDD 7 jours élevé suggère que les conditions deviennent de plus en plus propices à l'activité racinaire et au débourrement.", 'Favorable cumulative GDD with high 7-day GDD suggests increasingly favorable root activity and bud break.', 'Günstiges kumuliertes GDD mit hohem 7-Tage-GDD deutet auf zunehmend günstige Wurzelaktivität hin.', 'GDD cumulato favorevole con GDD 7 giorni elevato suggerisce condizioni sempre più favorevoli.', 'GDD acumulado favorable con GDD 7 días alto sugiere condiciones cada vez más favorables.');
t('gdd_7d_yamadori_point_2', 'Un GDD 7 jours faible peut indiquer une période de stagnation malgré un printemps déjà avancé.', 'Low 7-day GDD may indicate stagnation despite an advanced spring.', 'Niedriges 7-Tage-GDD kann Stagnation trotz fortgeschrittenem Frühling anzeigen.', 'Un GDD 7 giorni basso può indicare stagnazione nonostante una primavera avanzata.', 'Un GDD 7 días bajo puede indicar estancamiento a pesar de una primavera avanzada.');
t('gdd_7d_warning', "Le GDD 7 jours est un indicateur de tendance. Il ne doit pas être utilisé seul pour décider d'un prélèvement. La température du sol, la météo locale et surtout l'observation directe des bourgeons restent les éléments les plus fiables pour évaluer l'état réel de l'arbre.", '7-day GDD is a trend indicator only. Do not use it alone to decide collection. Soil temperature, local weather and direct bud observation remain most reliable.', '7-Tage-GDD ist nur ein Trendindikator. Nicht allein für die Entscheidung nutzen. Bodentemperatur und direkte Knospenbeobachtung bleiben am zuverlässigsten.', 'Il GDD 7 giorni è solo un indicatore di tendenza. Non usarlo da solo per decidere il prelievo.', 'El GDD de 7 días es solo un indicador de tendencia. No usarlo solo para decidir la recolección.');
t('gdd_cumulative', 'GDD cumulé', 'Cumulative GDD', 'Kumuliertes GDD', 'GDD cumulato', 'GDD acumulado');
t('gdd_since_jan1', 'Depuis le 1er janvier', 'Since January 1', 'Seit 1. Januar', 'Dal 1° gennaio', 'Desde el 1 de enero');
t('gdd_degrees_days', '{value} °c.j', '{value} °d', '{value} °d', '{value} °g.g.', '{value} °d.d.');
t('gdd_help_aria', 'Aide : Phénologie thermique (GDD)', 'Help: Thermal phenology (GDD)', 'Hilfe: Thermische Phänologie (GDD)', 'Aiuto: Fenologia termica (GDD)', 'Ayuda: Fenología térmica (GDD)');
t('gdd_7d_help_aria', 'Aide : GDD sur 7 jours', 'Help: GDD over 7 days', 'Hilfe: GDD über 7 Tage', 'Aiuto: GDD su 7 giorni', 'Ayuda: GDD en 7 días');
t('gdd_history_unavailable', 'Historique GDD indisponible', 'GDD history unavailable', 'GDD-Verlauf nicht verfügbar', 'Storico GDD non disponibile', 'Historial GDD no disponible');
t('gdd_sparkline_aria', 'Évolution du cumul de degrés-jours depuis le 1er janvier', 'Cumulative degree-day trend since January 1', 'Kumulierte Gradtagsumme seit 1. Januar', 'Andamento cumulo gradi-giorno dal 1° gennaio', 'Evolución del acumulado de grados-día desde el 1 de enero');

// ── Agri metric help ────────────────────────────────────────────────────────
const agriMetrics = [
	{ key: 'wind', fr: 'Vitesse du vent', en: 'Wind speed', de: 'Windgeschwindigkeit', it: 'Velocità del vento', es: 'Velocidad del viento', help_fr: 'Si le vent est fort, emballez les racines dans de la jute humide ou un sac plastique rapidement afin de contrer la dessiccation des radicelles.', help_en: 'In strong wind, wrap roots in damp burlap or plastic quickly to prevent fine root desiccation.', help_de: 'Bei starkem Wind Wurzeln schnell in feuchtes Jute oder Plastik einwickeln.', help_it: 'Con vento forte, avvolgere le radici in juta umida o plastica rapidamente.', help_es: 'Con viento fuerte, envuelve las raíces en arpillera húmeda o plástico rápidamente.' },
	{ key: 'air', fr: "Température de l'air actuelle", en: 'Current air temperature', de: 'Aktuelle Lufttemperatur', it: 'Temperatura dell\'aria attuale', es: 'Temperatura del aire actual', help_fr: "Adaptez votre équipement et gardez la motte à l'ombre pendant le transport si la température est élevée.", help_en: 'Adapt your gear and keep the root ball shaded during transport in high heat.', help_de: 'Passen Sie die Ausrüstung an und halten Sie den Wurzelballen im Schatten bei Hitze.', help_it: 'Adatta l\'equipaggiamento e tieni il pane di terra all\'ombra durante il trasporto.', help_es: 'Adapta tu equipo y mantén el pan de raíces a la sombra durante el transporte.' },
	{ key: 'soil', fr: 'Température du sol (6 et 18 cm)', en: 'Soil temperature (6 and 18 cm)', de: 'Bodentemperatur (6 und 18 cm)', it: 'Temperatura del suolo (6 e 18 cm)', es: 'Temperatura del suelo (6 y 18 cm)', help_fr: 'À 6 cm, visez une moyenne stabilisée entre 8 °C et 15 °C sur 5 jours. À 18 cm : 9–13 °C parfait, 14–17 °C zone haute exploitable, 18 °C et plus attention au stress hydrique.', help_en: 'At 6 cm, aim for 8–15 °C stabilized over 5 days. At 18 cm: 9–13 °C ideal, 14–17 °C upper zone, 18 °C+ watch for water stress.', help_de: 'Bei 6 cm 8–15 °C über 5 Tage anstreben. Bei 18 cm: 9–13 °C ideal.', help_it: 'A 6 cm puntare a 8–15 °C stabilizzati su 5 giorni. A 18 cm: 9–13 °C ideale.', help_es: 'A 6 cm apunta a 8–15 °C estabilizados en 5 días. A 18 cm: 9–13 °C ideal.' },
	{ key: 'rain', fr: 'Pluviométrie cumulée (3 à 7 jours)', en: 'Cumulative rainfall (3 to 7 days)', de: 'Kumulierter Niederschlag (3 bis 7 Tage)', it: 'Pioggia cumulata (3–7 giorni)', es: 'Pluviometría acumulada (3 a 7 días)', help_fr: "Ciblez une fenêtre après des pluies légères. Une terre gorgée d'eau asphyxie l'arbre et pèse des dizaines de kilos. Une terre trop sèche s'effondre comme du sable, arrachant les précieuses mycorhizes.", help_en: 'Target a window after light rain. Waterlogged soil suffocates the tree; too-dry soil collapses like sand.', help_de: 'Zielen Sie auf ein Fenster nach leichtem Regen. Durchnässter Boden erstickt den Baum.', help_it: 'Punta a una finestra dopo piogge leggere. Terreno saturo soffoca l\'albero.', help_es: 'Apunta a una ventana tras lluvias ligeras. Suelo encharcado asfixia el árbol.' },
	{ key: 'frost', fr: 'Risque de gel nocturne (prévision 7 j)', en: 'Night frost risk (7-day forecast)', de: 'Nachtfrost-Risiko (7-Tage-Prognose)', it: 'Rischio gelate notturne (previsione 7 g)', es: 'Riesgo de heladas nocturnas (previsión 7 d)', help_fr: 'Du gel est prévu les prochains jours : ne prélevez que si vous avez une solution hors gel !', help_en: 'Frost forecast in coming days: collect only if you have frost protection!', help_de: 'Frost in den nächsten Tagen erwartet: nur sammeln mit Frostschutz!', help_it: 'Gelo previsto nei prossimi giorni: preleva solo con protezione antigelo!', help_es: 'Heladas previstas: ¡recolecta solo si tienes protección contra heladas!' },
	{ key: 'et0', fr: 'ET₀ — Évapotranspiration de référence (7 j passés + 7 j prévus)', en: 'ET₀ — Reference evapotranspiration (7d past + 7d forecast)', de: 'ET₀ — Referenz-Evapotranspiration (7 Tage zurück + 7 voraus)', it: 'ET₀ — Evapotraspirazione di riferimento (7 g passati + 7 previsti)', es: 'ET₀ — Evapotranspiración de referencia (7 d pasados + 7 previstos)', help_fr: "L'ET₀ mesure la « soif » absolue de l'atmosphère en millimètres d'eau par jour.", help_en: 'ET₀ measures atmospheric "thirst" in mm of water per day.', help_de: 'ET₀ misst den atmosphärischen "Durst" in mm Wasser pro Tag.', help_it: 'L\'ET₀ misura la "sete" atmosferica in mm d\'acqua al giorno.', help_es: 'La ET₀ mide la "sed" atmosférica en mm de agua al día.' },
	{ key: 'radiation', fr: 'Rayonnement solaire global', en: 'Global solar radiation', de: 'Globale Sonneneinstrahlung', it: 'Radiazione solare globale', es: 'Radiación solar global', help_fr: "La lumière directe force les stomates à s'ouvrir pour la photosynthèse, entraînant une perte d'eau massive.", help_en: 'Direct light forces stomata open for photosynthesis, causing massive water loss.', help_de: 'Direktes Licht öffnet Stomata und verursacht massiven Wasserverlust.', help_it: 'La luce diretta apre gli stomi causando perdita d\'acqua massiccia.', help_es: 'La luz directa abre los estomas causando pérdida masiva de agua.' },
	{ key: 'hydric_balance', fr: 'Bilan hydrique 7 jours', en: '7-day water balance', de: '7-Tage-Wasserbilanz', it: 'Bilancio idrico 7 giorni', es: 'Balance hídrico 7 días', help_fr: "Différence entre la pluie cumulée et l'ET₀ cumulée sur les 7 derniers jours.", help_en: 'Difference between cumulative rain and ET₀ over the last 7 days.', help_de: 'Differenz zwischen kumuliertem Regen und ET₀ der letzten 7 Tage.', help_it: 'Differenza tra pioggia cumulata e ET₀ negli ultimi 7 giorni.', help_es: 'Diferencia entre lluvia acumulada y ET₀ en los últimos 7 días.' },
	{ key: 'wsi', fr: 'Water Stress Index (WSI)', en: 'Water Stress Index (WSI)', de: 'Wasserstress-Index (WSI)', it: 'Indice di stress idrico (WSI)', es: 'Índice de estrés hídrico (WSI)', help_fr: 'Indice combinant le bilan hydrique 7 jours et le tampon du sol.', help_en: 'Index combining 7-day water balance and soil buffer.', help_de: 'Index aus 7-Tage-Wasserbilanz und Bodenpuffer.', help_it: 'Indice che combina bilancio idrico 7 giorni e tampone del suolo.', help_es: 'Índice que combina balance hídrico 7 días y tampón del suelo.' },
	{ key: 'et0_cumul', fr: 'ET₀ cumulée sur 7 jours', en: '7-day cumulative ET₀', de: 'Kumulierte ET₀ über 7 Tage', it: 'ET₀ cumulata su 7 giorni', es: 'ET₀ acumulada en 7 días', help_fr: "Cumul de l'évapotranspiration de référence sur 7 jours (passé et prévu).", help_en: 'Cumulative reference evapotranspiration over 7 days (past and forecast).', help_de: 'Kumulierte Referenz-ET₀ über 7 Tage.', help_it: 'Cumulo ET₀ di riferimento su 7 giorni.', help_es: 'Acumulado de ET₀ de referencia en 7 días.' },
	{ key: 'wind_stress', fr: 'Stress vent sec', en: 'Dry wind stress', de: 'Trockenwind-Stress', it: 'Stress vento secco', es: 'Estrés de viento seco', help_fr: "Indice composite vent × sécheresse de l'air.", help_en: 'Composite wind × air dryness index.', help_de: 'Kombinierter Wind × Lufttrockenheit-Index.', help_it: 'Indice composito vento × secchezza dell\'aria.', help_es: 'Índice compuesto viento × sequedad del aire.' },
	{ key: 'radiation_stress', fr: 'Stress rayonnement', en: 'Radiation stress', de: 'Strahlungsstress', it: 'Stress da radiazione', es: 'Estrés por radiación', help_fr: 'Indice composite rayonnement solaire × demande évaporative (ET₀).', help_en: 'Composite solar radiation × evaporative demand (ET₀) index.', help_de: 'Kombinierter Sonnenstrahlung × ET₀-Index.', help_it: 'Indice composito radiazione solare × domanda evaporativa.', help_es: 'Índice compuesto radiación solar × demanda evaporativa.' },
	{ key: 'heat_stress', fr: 'Jours de canicule (7 j)', en: 'Heatwave days (7d)', de: 'Hitzetage (7 Tage)', it: 'Giorni di calura (7 g)', es: 'Días de calor extremo (7 d)', help_fr: 'Nombre de jours avec température maximale > 30 °C (passés et prévus).', help_en: 'Days with max temperature > 30 °C (past and forecast).', help_de: 'Tage mit Max-Temperatur > 30 °C.', help_it: 'Giorni con temperatura massima > 30 °C.', help_es: 'Días con temperatura máxima > 30 °C.' },
	{ key: 'frost_past', fr: 'Gel passé (7 j)', en: 'Past frost (7d)', de: 'Vergangener Frost (7 Tage)', it: 'Gelo passato (7 g)', es: 'Heladas pasadas (7 d)', help_fr: 'Nuits récentes avec température minimale < 0 °C.', help_en: 'Recent nights with minimum temperature < 0 °C.', help_de: 'Kürzliche Nächte mit Min-Temperatur < 0 °C.', help_it: 'Notti recenti con temperatura minima < 0 °C.', help_es: 'Noches recientes con temperatura mínima < 0 °C.' },
	{ key: 'gdd_season', fr: 'GDD cumulé (saison)', en: 'Cumulative GDD (season)', de: 'Kumuliertes GDD (Saison)', it: 'GDD cumulato (stagione)', es: 'GDD acumulado (temporada)', help_fr: 'Chaleur accumulée depuis le 1er janvier — alimente la couche climat du YRS.', help_en: 'Heat accumulated since January 1 — feeds YRS climate layer.', help_de: 'Seit 1. Januar akkumulierte Wärme — speist YRS-Klimaschicht.', help_it: 'Calore accumulato dal 1° gennaio — alimenta lo strato clima YRS.', help_es: 'Calor acumulado desde el 1 de enero — alimenta la capa clima YRS.' },
	{ key: 'soil_night_drop', fr: 'Chute nocturne du sol', en: 'Soil night drop', de: 'Bodennachtabfall', it: 'Caduta notturna del suolo', es: 'Caída nocturna del suelo', help_fr: 'Chute brutale de température du sol la nuit dernière.', help_en: 'Sharp soil temperature drop last night.', help_de: 'Starker Bodentemperaturabfall letzte Nacht.', help_it: 'Caduta brusca della temperatura del suolo la scorsa notte.', help_es: 'Caída brusca de temperatura del suelo anoche.' },
	{ key: 'soil_history', fr: 'Historique température sol', en: 'Soil temperature history', de: 'Bodentemperatur-Verlauf', it: 'Storico temperatura suolo', es: 'Historial temperatura suelo', help_fr: 'Évolution des températures sol sur 7 jours.', help_en: 'Soil temperature trend over 7 days.', help_de: 'Bodentemperatur-Verlauf über 7 Tage.', help_it: 'Andamento temperature suolo su 7 giorni.', help_es: 'Evolución de temperaturas del suelo en 7 días.' },
	{ key: 'soil_moisture', fr: 'Humidité du sol (0–7 cm)', en: 'Soil moisture (0–7 cm)', de: 'Bodenfeuchte (0–7 cm)', it: 'Umidità del suolo (0–7 cm)', es: 'Humedad del suelo (0–7 cm)', help_fr: 'Teneur en eau du sol superficiel (Open-Meteo).', help_en: 'Surface soil water content (Open-Meteo).', help_de: 'Oberflächen-Bodenwassergehalt (Open-Meteo).', help_it: 'Contenuto d\'acqua del suolo superficiale.', help_es: 'Contenido de agua del suelo superficial.' },
	{ key: 'yrs', fr: 'Yamadori Readiness Score (YRS)', en: 'Yamadori Readiness Score (YRS)', de: 'Yamadori-Bereitschafts-Score (YRS)', it: 'Punteggio di prontezza yamadori (YRS)', es: 'Puntuación de preparación yamadori (YRS)', help_fr: 'Score synthétique 0–100 combinant climat (30 pts), sol (25), phénologie (25) et hydrique (20), moins des pénalités de stress.', help_en: 'Composite 0–100 score: climate (30), soil (25), phenology (25), hydric (20), minus stress penalties.', help_de: 'Zusammengesetzter Score 0–100: Klima, Boden, Phänologie, Hydrik minus Stress.', help_it: 'Punteggio composito 0–100: clima, suolo, fenologia, idrico meno penalità.', help_es: 'Puntuación compuesta 0–100: clima, suelo, fenología, hídrico menos penalizaciones.' },
	{ key: 'water_hydric', fr: 'Eau et hydrique', en: 'Water and hydric', de: 'Wasser und Hydrik', it: 'Acqua e idrico', es: 'Agua e hídrico', help_fr: 'Synthèse pluie récente, bilan hydrique 7 jours, WSI et évapotranspiration.', help_en: 'Summary of recent rain, 7-day water balance, WSI and evapotranspiration.', help_de: 'Zusammenfassung Regen, Wasserbilanz, WSI und Evapotranspiration.', help_it: 'Sintesi pioggia recente, bilancio idrico, WSI ed evapotraspirazione.', help_es: 'Resumen de lluvia reciente, balance hídrico, WSI y evapotranspiración.' },
	{ key: 'climate_instant', fr: 'Climat instantané', en: 'Instant climate', de: 'Aktuelles Klima', it: 'Clima istantaneo', es: 'Clima instantáneo', help_fr: "Conditions air, vent et rayonnement au moment du prélèvement.", help_en: 'Air, wind and radiation conditions at collection time.', help_de: 'Luft-, Wind- und Strahlungsbedingungen beim Sammeln.', help_it: 'Condizioni aria, vento e radiazione al momento del prelievo.', help_es: 'Condiciones de aire, viento y radiación al momento de la recolección.' },
	{ key: 'frost_combined', fr: 'Gel passé et prévu', en: 'Past and forecast frost', de: 'Vergangener und prognostizierter Frost', it: 'Gelo passato e previsto', es: 'Heladas pasadas y previstas', help_fr: 'Croise les nuits de gel récentes et le gel prévu sur 7 jours.', help_en: 'Cross-references recent frost nights and 7-day frost forecast.', help_de: 'Kreuzt kürzliche Frostnächte und 7-Tage-Frostprognose.', help_it: 'Incrocia notti di gelo recenti e gelo previsto su 7 giorni.', help_es: 'Cruza noches de helada recientes y heladas previstas en 7 días.' },
	{ key: 'climate_stress', fr: 'Stress climatique avancé', en: 'Advanced climate stress', de: 'Erweiterter Klimastress', it: 'Stress climatico avanzato', es: 'Estrés climático avanzado', help_fr: 'Indices composites vent sec et rayonnement, plus les jours de canicule (> 30 °C).', help_en: 'Dry wind and radiation composite indices, plus heatwave days (> 30 °C).', help_de: 'Trockenwind- und Strahlungsindizes plus Hitzetage.', help_it: 'Indici vento secco e radiazione, più giorni di calura.', help_es: 'Índices de viento seco y radiación, más días de calor extremo.' }
];
for (const m of agriMetrics) {
	t(`agri_${m.key}_title`, m.fr, m.en, m.de, m.it, m.es);
	t(`agri_${m.key}_help`, m.help_fr, m.help_en, m.help_de, m.help_it, m.help_es);
}

// ── YRS ─────────────────────────────────────────────────────────────────────
t('yrs_score_label', 'Indice de faisabilité (YRS)', 'Yamadori Readiness Score (YRS)', 'Yamadori-Bereitschafts-Score (YRS)', 'Punteggio di prontezza yamadori (YRS)', 'Puntuación de preparación yamadori (YRS)');
t('yrs_decision_optimal', 'Prélever — conditions favorables', 'Collect — favorable conditions', 'Sammeln — günstige Bedingungen', 'Prelevare — condizioni favorevoli', 'Recolectar — condiciones favorables');
t('yrs_decision_acceptable', 'Possible avec précautions', 'Possible with precautions', 'Möglich mit Vorsicht', 'Possibile con precauzioni', 'Posible con precauciones');
t('yrs_decision_risk', 'Reporter', 'Postpone', 'Verschieben', 'Rimandare', 'Posponer');
t('yrs_decision_no_go', 'Ne pas prélever', 'Do not collect', 'Nicht sammeln', 'Non prelevare', 'No recolectar');
t('yrs_layer_climate', 'Climat', 'Climate', 'Klima', 'Clima', 'Clima');
t('yrs_layer_soil', 'Sol', 'Soil', 'Boden', 'Suolo', 'Suelo');
t('yrs_layer_phenology', 'Phénologie', 'Phenology', 'Phänologie', 'Fenologia', 'Fenología');
t('yrs_layer_hydric', 'Hydrique', 'Hydric', 'Hydrik', 'Idrico', 'Hídrico');
t('yrs_layer_penalties', 'Pénalités', 'Penalties', 'Strafpunkte', 'Penalità', 'Penalizaciones');
t('yrs_composition', 'Composition du score', 'Score breakdown', 'Score-Zusammensetzung', 'Composizione del punteggio', 'Composición del puntaje');
t('yrs_score_detail', 'Détail du score {label}', 'Score detail: {label}', 'Score-Detail: {label}', 'Dettaglio punteggio {label}', 'Detalle del puntaje {label}');
t('yrs_no_penalty', 'Aucune pénalité appliquée.', 'No penalty applied.', 'Keine Strafe angewendet.', 'Nessuna penalità applicata.', 'Ninguna penalización aplicada.');
t('yrs_no_points', 'Aucun point attribué.', 'No points awarded.', 'Keine Punkte vergeben.', 'Nessun punto assegnato.', 'Ningún punto asignado.');
t('yrs_calculating', 'Calcul en cours…', 'Calculating…', 'Berechnung…', 'Calcolo in corso…', 'Calculando…');
t('yrs_unavailable', 'Indisponible', 'Unavailable', 'Nicht verfügbar', 'Non disponibile', 'No disponible');
t('yrs_waiting_gps', 'En attente du GPS', 'Waiting for GPS', 'Warte auf GPS', 'In attesa del GPS', 'Esperando GPS');
t('yrs_window_unavailable', 'Fenêtre YRS indisponible', 'YRS window unavailable', 'YRS-Fenster nicht verfügbar', 'Finestra YRS non disponibile', 'Ventana YRS no disponible');
t('yrs_chart_aria', "Évolution du YRS sur 7 jours. Aujourd'hui : {today}. Meilleur jour : {best}.", 'YRS trend over 7 days. Today: {today}. Best day: {best}.', 'YRS-Verlauf über 7 Tage. Heute: {today}. Bester Tag: {best}.', 'Andamento YRS su 7 giorni. Oggi: {today}. Miglior giorno: {best}.', 'Evolución YRS en 7 días. Hoy: {today}. Mejor día: {best}.');
t('yrs_today_short', 'Auj.', 'Today', 'Heute', 'Ogg.', 'Hoy');
t('yrs_field_reminder', "Rappel : l'observation de terrain prime sur cette décision.", 'Reminder: field observation overrides this decision.', 'Erinnerung: Feldbeobachtung hat Vorrang.', 'Promemoria: l\'osservazione sul campo prevale su questa decisione.', 'Recordatorio: la observación de campo prevalece sobre esta decisión.');
t('yrs_recommendation', 'Recommandation :', 'Recommendation:', 'Empfehlung:', 'Raccomandazione:', 'Recomendación:');
t('yrs_help_aria', 'Aide : indice de faisabilité', 'Help: readiness score', 'Hilfe: Bereitschafts-Score', 'Aiuto: indice di prontezza', 'Ayuda: índice de preparación');
t('yrs_refresh_aria', 'Actualiser les prévisions météo', 'Refresh weather forecast', 'Wetterprognose aktualisieren', 'Aggiorna previsioni meteo', 'Actualizar previsión meteorológica');
t('yrs_no_agri_data', 'Aucune donnée agro-météo disponible.', 'No agro-meteorological data available.', 'Keine agrometeorologischen Daten verfügbar.', 'Nessun dato agro-meteo disponibile.', 'No hay datos agrometeorológicos disponibles.');
t('yrs_conditions_terrain', 'Conditions terrain', 'Field conditions', 'Feldbedingungen', 'Condizioni di campo', 'Condiciones de campo');
t('yrs_phenology_section', 'Phénologie', 'Phenology', 'Phänologie', 'Fenologia', 'Fenología');
t('yrs_history', 'Historique', 'History', 'Verlauf', 'Storico', 'Historial');
t('yrs_et0_past_forecast', 'Passé {past} · Prévu {forecast} mm/j', 'Past {past} · Forecast {forecast} mm/d', 'Vergangen {past} · Prognose {forecast} mm/Tag', 'Passato {past} · Previsto {forecast} mm/g', 'Pasado {past} · Previsto {forecast} mm/d');
t('yrs_et0_mean_7d', 'Moyenne ET₀ sur 7 jours', '7-day mean ET₀', '7-Tage-Mittel ET₀', 'Media ET₀ su 7 giorni', 'Media ET₀ en 7 días');
t('yrs_soil_buffer', 'Tampon sol {score}/100', 'Soil buffer {score}/100', 'Bodenpuffer {score}/100', 'Tampone suolo {score}/100', 'Tampón suelo {score}/100');
t('yrs_et0_cumul_7d', 'Cumul ET₀ sur 7 jours', '7-day cumulative ET₀', 'Kumulierte ET₀ über 7 Tage', 'Cumulo ET₀ su 7 giorni', 'Acumulado ET₀ en 7 días');
t('yrs_wind_stress_index', 'Indice vent sec composite', 'Composite dry wind index', 'Kombinierter Trockenwind-Index', 'Indice vento secco composito', 'Índice compuesto de viento seco');
t('yrs_heat_days', 'Jours > 30 °C (7 j)', 'Days > 30 °C (7d)', 'Tage > 30 °C (7 Tage)', 'Giorni > 30 °C (7 g)', 'Días > 30 °C (7 d)');
t('yrs_rain_cumul', 'Pluie cumulée 3 / 5 / 7 j', 'Cumulative rain 3 / 5 / 7 d', 'Kumulierter Regen 3 / 5 / 7 Tage', 'Pioggia cumulata 3 / 5 / 7 g', 'Lluvia acumulada 3 / 5 / 7 d');
t('yrs_offline_forecast', 'Prévision du {time} — mode hors-ligne{distance}', 'Forecast from {time} — offline mode{distance}', 'Prognose vom {time} — Offline-Modus{distance}', 'Previsione del {time} — modalità offline{distance}', 'Previsión del {time} — modo sin conexión{distance}');
t('yrs_pending_offline', 'Hors ligne', 'Offline', 'Offline', 'Offline', 'Sin conexión');
t('weather_cache_stale_days', 'Météo en cache depuis {count} jour(s) — reconnectez-vous pour actualiser.', 'Weather cached {count} day(s) ago — reconnect to refresh.', 'Wetter seit {count} Tag(en) im Cache — zum Aktualisieren verbinden.', 'Meteo in cache da {count} giorno/i — riconnettiti per aggiornare.', 'Meteo en caché desde hace {count} día(s) — reconéctate para actualizar.');
t('weather_cache_stale_hours', 'Météo en cache depuis {count} h — reconnectez-vous pour actualiser.', 'Weather cached {count} h ago — reconnect to refresh.', 'Wetter seit {count} h im Cache — zum Aktualisieren verbinden.', 'Meteo in cache da {count} h — riconnettiti per aggiornare.', 'Meteo en caché desde hace {count} h — reconéctate para actualizar.');
t('yrs_stage_unknown', 'Stade inconnu', 'Unknown stage', 'Unbekanntes Stadium', 'Stadio sconosciuto', 'Estadio desconocido');
t('yrs_cernage_unset', 'Non renseigné', 'Not specified', 'Nicht angegeben', 'Non indicato', 'No indicado');
t('yrs_verdict_good_candidate', 'Bon candidat — fenêtre favorable', 'Good candidate — favorable window', 'Guter Kandidat — günstiges Fenster', 'Buon candidato — finestra favorevole', 'Buen candidato — ventana favorable');
t('yrs_verdict_wait', 'Arbre prometteur — attendre les conditions', 'Promising tree — wait for conditions', 'Vielversprechender Baum — auf Bedingungen warten', 'Albero promettente — attendere le condizioni', 'Árbol prometedor — esperar las condiciones');
t('yrs_verdict_limited_interest', 'Fenêtre favorable — intérêt bonsaï limité', 'Favorable window — limited bonsai interest', 'Günstiges Fenster — begrenztes Bonsai-Interesse', 'Finestra favorevole — interesse bonsai limitato', 'Ventana favorable — interés bonsái limitado');
t('yrs_gdd_favorable', 'GDD {gdd} °c.j — fenêtre favorable', 'GDD {gdd} °d — favorable window', 'GDD {gdd} °d — günstiges Fenster', 'GDD {gdd} °g.g. — finestra favorevole', 'GDD {gdd} °d.d. — ventana favorable');
t('yrs_gdd_early', 'GDD {gdd} °c.j — réveil précoce', 'GDD {gdd} °d — early awakening', 'GDD {gdd} °d — frühes Erwachen', 'GDD {gdd} °g.g. — risveglio precoce', 'GDD {gdd} °d.d. — despertar temprano');
t('yrs_gdd_late', 'GDD {gdd} °c.j — saison avancée', 'GDD {gdd} °d — late season', 'GDD {gdd} °d — späte Saison', 'GDD {gdd} °g.g. — stagione avanzata', 'GDD {gdd} °d.d. — temporada avanzada');
t('yrs_gdd_outside', 'GDD {gdd} °c.j — hors fenêtre', 'GDD {gdd} °d — outside window', 'GDD {gdd} °d — außerhalb Fenster', 'GDD {gdd} °g.g. — fuori finestra', 'GDD {gdd} °d.d. — fuera de ventana');
t('yrs_gdd_unavailable', 'GDD indisponible', 'GDD unavailable', 'GDD nicht verfügbar', 'GDD non disponibile', 'GDD no disponible');
t('yrs_phenology_unavailable', 'Phénologie indisponible (estimation neutre)', 'Phenology unavailable (neutral estimate)', 'Phänologie nicht verfügbar (neutrale Schätzung)', 'Fenologia non disponibile (stima neutra)', 'Fenología no disponible (estimación neutra)');
t('yrs_hydric_unavailable', 'Hydrique indisponible (estimation neutre)', 'Hydric unavailable (neutral estimate)', 'Hydrik nicht verfügbar (neutrale Schätzung)', 'Idrico non disponibile (stima neutra)', 'Hídrico no disponible (estimación neutra)');
t('yrs_soil_night_drop', 'Chute nocturne brutale du sol', 'Sharp soil night drop', 'Starker Bodennachtabfall', 'Caduta notturna brusca del suolo', 'Caída nocturna brusca del suelo');
t('yrs_soil_night_attenuated', 'critère atténué (saison avancée)', 'criterion attenuated (late season)', 'Kriterium abgeschwächt (späte Saison)', 'criterio attenuato (stagione avanzata)', 'criterio atenuado (temporada avanzada)');
t('yrs_soil_night_ignored', 'critère ignoré (pleine végétation)', 'criterion ignored (full vegetation)', 'Kriterium ignoriert (volle Vegetation)', 'criterio ignorato (piena vegetazione)', 'criterio ignorado (vegetación plena)');
t('yrs_soil_night_attenuated_gdd', 'critère atténué (GDD {gdd} °c.j)', 'criterion attenuated (GDD {gdd} °d)', 'Kriterium abgeschwächt (GDD {gdd} °d)', 'criterio attenuato (GDD {gdd} °g.g.)', 'criterio atenuado (GDD {gdd} °d.d.)');
t('yrs_climate_summary_optimal', '{label} — conditions favorables sur les 4 couches.', '{label} — favorable conditions across all 4 layers.', '{label} — günstige Bedingungen in allen 4 Schichten.', '{label} — condizioni favorevoli su tutti e 4 gli strati.', '{label} — condiciones favorables en las 4 capas.');
t('yrs_climate_summary_cold_soil', '{label} — sol 18 cm trop froid ({temp} °C).', '{label} — 18 cm soil too cold ({temp} °C).', '{label} — 18 cm Boden zu kalt ({temp} °C).', '{label} — suolo 18 cm troppo freddo ({temp} °C).', '{label} — suelo 18 cm demasiado frío ({temp} °C).');
t('yrs_climate_summary_hydric', '{label} — stress hydrique (WSI {wsi} mm).', '{label} — water stress (WSI {wsi} mm).', '{label} — Wasserstress (WSI {wsi} mm).', '{label} — stress idrico (WSI {wsi} mm).', '{label} — estrés hídrico (WSI {wsi} mm).');
t('yrs_climate_summary_limiting', '{label} — facteur limitant : {factor}.', '{label} — limiting factor: {factor}.', '{label} — begrenzender Faktor: {factor}.', '{label} — fattore limitante: {factor}.', '{label} — factor limitante: {factor}.');

// ── Agri verdicts / errors ──────────────────────────────────────────────────
t('agri_error_missing_field', 'Donnée météo manquante : {field}.', 'Missing weather data: {field}.', 'Fehlende Wetterdaten: {field}.', 'Dato meteo mancante: {field}.', 'Dato meteorológico faltante: {field}.');
t('agri_error_no_data', 'Aucune donnée météo disponible pour ce point.', 'No weather data available for this location.', 'Keine Wetterdaten für diesen Punkt verfügbar.', 'Nessun dato meteo disponibile per questo punto.', 'No hay datos meteorológicos para este punto.');
t('agri_error_viability', 'Aucune donnée météo disponible pour la fenêtre de viabilité.', 'No weather data for viability window.', 'Keine Wetterdaten für Viabilitätsfenster.', 'Nessun dato meteo per la finestra di viabilità.', 'No hay datos para la ventana de viabilidad.');
t('agri_error_timeout', 'La requête météo a expiré. Réessayez plus tard.', 'Weather request timed out. Try again later.', 'Wetteranfrage abgelaufen. Später erneut versuchen.', 'Richiesta meteo scaduta. Riprova più tardi.', 'La solicitud meteorológica expiró. Inténtalo más tarde.');
t('agri_error_fetch', 'Erreur lors de la récupération des données agro-météo.', 'Error fetching agro-meteorological data.', 'Fehler beim Abrufen agrometeorologischer Daten.', 'Errore nel recupero dei dati agro-meteo.', 'Error al obtener datos agrometeorológicos.');
t('agri_offline_cache', 'Aucune prévision en cache — connectez-vous au Wi-Fi pour actualiser.', 'No cached forecast — connect to Wi-Fi to refresh.', 'Keine gecachte Prognose — mit WLAN verbinden zum Aktualisieren.', 'Nessuna previsione in cache — connettiti al Wi-Fi per aggiornare.', 'Sin previsión en caché — conéctate al Wi-Fi para actualizar.');
t('agri_verdict_frost', 'Gel prévu ({temp}°C) — reporter le prélèvement', 'Frost forecast ({temp}°C) — postpone collection', 'Frost erwartet ({temp}°C) — Sammeln verschieben', 'Gelo previsto ({temp}°C) — rimandare il prelievo', 'Helada prevista ({temp}°C) — posponer la recolección');
t('agri_verdict_wind', 'Vent fort ({speed} km/h) — radicelles à risque de dessèchement', 'Strong wind ({speed} km/h) — fine roots at risk of drying', 'Starker Wind ({speed} km/h) — Feinwurzeln gefährdet', 'Vento forte ({speed} km/h) — radicelle a rischio di disseccamento', 'Viento fuerte ({speed} km/h) — radículas en riesgo de desecación');
t('agri_verdict_extreme_temp', 'Température air extrême ({temp}°C)', 'Extreme air temperature ({temp}°C)', 'Extreme Lufttemperatur ({temp}°C)', 'Temperatura aria estrema ({temp}°C)', 'Temperatura del aire extrema ({temp}°C)');
t('agri_verdict_waterlogged', 'Sol détrempé ({rain} mm sur 3 jours)', 'Waterlogged soil ({rain} mm over 3 days)', 'Durchnässter Boden ({rain} mm in 3 Tagen)', 'Suolo saturo ({rain} mm in 3 giorni)', 'Suelo encharcado ({rain} mm en 3 días)');
t('agri_verdict_soil_cold', 'Sol 18 cm trop froid ({temp}°C)', '18 cm soil too cold ({temp}°C)', '18 cm Boden zu kalt ({temp}°C)', 'Suolo 18 cm troppo freddo ({temp}°C)', 'Suelo 18 cm demasiado frío ({temp}°C)');
t('agri_verdict_soil_warming', 'Sol insuffisamment réchauffé ({days} j stables à 8–15 °C)', 'Soil insufficiently warmed ({days} d stable at 8–15 °C)', 'Boden unzureichend erwärmt ({days} Tage stabil bei 8–15 °C)', 'Suolo insufficientemente riscaldato ({days} g stabili a 8–15 °C)', 'Suelo insuficientemente calentado ({days} d estables a 8–15 °C)');
t('agri_verdict_solar_risk', 'Prélèvement risqué — rayonnement solaire élevé ({rad} W/m²), risque de choc solaire post-extraction', 'Risky collection — high solar radiation ({rad} W/m²), post-extraction sun shock risk', 'Riskantes Sammeln — hohe Sonneneinstrahlung ({rad} W/m²)', 'Prelievo rischioso — alta radiazione solare ({rad} W/m²)', 'Recolección arriesgada — alta radiación solar ({rad} W/m²)');
t('agri_verdict_et0_high', 'ET₀ élevé sur les 7 derniers jours ({et0} mm/j)', 'High ET₀ over last 7 days ({et0} mm/d)', 'Hohe ET₀ in den letzten 7 Tagen ({et0} mm/Tag)', 'ET₀ elevata negli ultimi 7 giorni ({et0} mm/g)', 'ET₀ alta en los últimos 7 días ({et0} mm/d)');
t('agri_verdict_et0_forecast', 'ET₀ élevé prévu sur 7 jours ({et0} mm/j)', 'High ET₀ forecast over 7 days ({et0} mm/d)', 'Hohe ET₀-Prognose über 7 Tage ({et0} mm/Tag)', 'ET₀ elevata prevista su 7 giorni ({et0} mm/g)', 'ET₀ alta prevista en 7 días ({et0} mm/d)');
t('agri_verdict_rain_limits', 'Pluie passée limitée ou excessive ({rain} mm / 3 j)', 'Past rain limited or excessive ({rain} mm / 3 d)', 'Vergangener Regen begrenzt oder übermäßig ({rain} mm / 3 T)', 'Pioggia passata limitata o eccessiva ({rain} mm / 3 g)', 'Lluvia pasada limitada o excesiva ({rain} mm / 3 d)');
t('agri_verdict_soil_high', 'Sol 18 cm élevé ({temp}°C) — attention au stress hydrique', '18 cm soil high ({temp}°C) — watch for water stress', '18 cm Boden hoch ({temp}°C) — Wasserstress beachten', 'Suolo 18 cm elevato ({temp}°C) — attenzione allo stress idrico', 'Suelo 18 cm alto ({temp}°C) — cuidado con el estrés hídrico');
t('agri_verdict_root_awakening', 'Réveil racinaire incomplet ({days} j à 8–15 °C)', 'Incomplete root awakening ({days} d at 8–15 °C)', 'Unvollständiges Wurzelerwachen ({days} Tage bei 8–15 °C)', 'Risveglio radicale incompleto ({days} g a 8–15 °C)', 'Despertar radicular incompleto ({days} d a 8–15 °C)');
t('agri_verdict_root_fragile', 'Chute nocturne brutale du sol — réveil racinaire fragile', 'Sharp soil night drop — fragile root awakening', 'Starker Bodennachtabfall — fragiles Wurzelerwachen', 'Caduta notturna brusca del suolo — risveglio radicale fragile', 'Caída nocturna brusca del suelo — despertar radicular frágil');
t('agri_verdict_soil_stable', 'Sol stable mais sans tendance haussière sur 7 jours', 'Stable soil but no upward trend over 7 days', 'Stabiler Boden aber kein Aufwärtstrend über 7 Tage', 'Suolo stabile ma senza tendenza al rialzo su 7 giorni', 'Suelo estable pero sin tendencia al alza en 7 días');
t('agri_verdict_hydric_stress', 'Stress hydrique probable (ET₀ moyen : {detail})', 'Probable water stress (mean ET₀: {detail})', 'Wahrscheinlicher Wasserstress (mittlere ET₀: {detail})', 'Probabile stress idrico (ET₀ media: {detail})', 'Probable estrés hídrico (ET₀ media: {detail})');
t('agri_verdict_moderate_sun', 'Rayonnement solaire modéré ({rad} W/m²)', 'Moderate solar radiation ({rad} W/m²)', 'Moderate Sonneneinstrahlung ({rad} W/m²)', 'Radiazione solare moderata ({rad} W/m²)', 'Radiación solar moderada ({rad} W/m²)');
t('agri_verdict_moderate_wind', 'Vent modéré ({speed} km/h)', 'Moderate wind ({speed} km/h)', 'Mäßiger Wind ({speed} km/h)', 'Vento moderato ({speed} km/h)', 'Viento moderado ({speed} km/h)');
t('agri_verdict_comfort_limited', 'Confort prospecteur limité ({temp}°C)', 'Limited scout comfort ({temp}°C)', 'Begrenzter Komfort ({temp}°C)', 'Comforto limitato ({temp}°C)', 'Confort limitado ({temp}°C)');
t('agri_field_air_temp', "température de l'air", 'air temperature', 'Lufttemperatur', 'temperatura dell\'aria', 'temperatura del aire');
t('agri_field_humidity', 'humidité relative', 'relative humidity', 'relative Luftfeuchte', 'umidità relativa', 'humedad relativa');
t('agri_field_soil_6', 'température du sol (6 cm)', 'soil temperature (6 cm)', 'Bodentemperatur (6 cm)', 'temperatura del suolo (6 cm)', 'temperatura del suelo (6 cm)');
t('agri_field_soil_18', 'température du sol (18 cm)', 'soil temperature (18 cm)', 'Bodentemperatur (18 cm)', 'temperatura del suolo (18 cm)', 'temperatura del suelo (18 cm)');

// ── GPS / location ──────────────────────────────────────────────────────────
t('gps_accuracy_unknown', 'Précision inconnue', 'Unknown accuracy', 'Unbekannte Genauigkeit', 'Precisione sconosciuta', 'Precisión desconocida');
t('gps_accuracy_format', '±{meters} m', '±{meters} m', '±{meters} m', '±{meters} m', '±{meters} m');
t('gps_locating', 'Localisation en cours…', 'Locating…', 'Standort wird ermittelt…', 'Localizzazione in corso…', 'Localizando…');
t('gps_accuracy_aria', 'Précision GPS {accuracy}', 'GPS accuracy {accuracy}', 'GPS-Genauigkeit {accuracy}', 'Precisione GPS {accuracy}', 'Precisión GPS {accuracy}');
t('gps_waiting_online', "En attente d'un fix GPS — restez immobile quelques secondes, ciel dégagé si possible.", 'Waiting for GPS fix — stay still a few seconds, clear sky if possible.', 'Warte auf GPS-Fix — einige Sekunden stillhalten, freier Himmel wenn möglich.', 'In attesa del fix GPS — resta fermo qualche secondo, cielo libero se possibile.', 'Esperando fix GPS — quédate quieto unos segundos, cielo despejado si es posible.');
t('gps_waiting_offline', 'Hors-ligne : le GPS fonctionne sans réseau, mais le premier fix peut prendre 30 s à 2 min. Restez immobile, ciel dégagé.', 'Offline: GPS works without network, but first fix may take 30s–2min. Stay still, clear sky.', 'Offline: GPS funktioniert ohne Netz, erster Fix kann 30s–2min dauern.', 'Offline: il GPS funziona senza rete, il primo fix può richiedere 30s–2min.', 'Sin conexión: el GPS funciona sin red, pero el primer fix puede tardar 30s–2min.');
t('gps_ready_excellent', 'Précision excellente — vous pouvez photographier et enregistrer.', 'Excellent accuracy — you can photograph and save.', 'Ausgezeichnete Genauigkeit — fotografieren und speichern.', 'Precisione eccellente — puoi fotografare e salvare.', 'Precisión excelente — puedes fotografiar y guardar.');
t('gps_ready_online', 'Attendez que la précision se stabilise (idéalement ≤ 10 m) avant la photo. La meilleure position est mémorisée automatiquement.', 'Wait for accuracy to stabilize (ideally ≤ 10 m) before photo. Best position is saved automatically.', 'Warten Sie auf stabile Genauigkeit (idealerweise ≤ 10 m). Beste Position wird automatisch gespeichert.', 'Attendi che la precisione si stabilizzi (idealmente ≤ 10 m). La migliore posizione viene memorizzata.', 'Espera a que la precisión se estabilice (idealmente ≤ 10 m). La mejor posición se guarda automáticamente.');
t('gps_ready_offline', 'En montagne hors-ligne : évitez le couvert forestier, restez immobile. Sans réseau, le GPS met plus de temps à converger — attendez le meilleur ± affiché.', 'Offline in mountains: avoid forest canopy, stay still. Without network GPS takes longer — wait for best ± shown.', 'Offline in den Bergen: Waldbedeckung meiden, stillhalten. Ohne Netz braucht GPS länger.', 'In montagna offline: evita la copertura forestale, resta fermo. Senza rete il GPS impiega più tempo.', 'En montaña sin conexión: evita el dosel forestal, quédate quieto. Sin red el GPS tarda más.');
t('gps_tip_photo', 'Prenez la photo au moment où la précision est la meilleure (badge vert si possible).', 'Take the photo when accuracy is best (green badge if possible).', 'Foto machen wenn Genauigkeit am besten (grünes Badge wenn möglich).', 'Scatta la foto quando la precisione è migliore (badge verde se possibile).', 'Toma la foto cuando la precisión sea mejor (insignia verde si es posible).');
t('gps_tip_still', "Restez immobile pendant l'acquisition GPS — le téléphone mémorise le meilleur fix.", 'Stay still during GPS acquisition — phone saves the best fix.', 'Während GPS-Erfassung stillhalten — Telefon speichert besten Fix.', 'Resta fermo durante l\'acquisizione GPS — il telefono memorizza il miglior fix.', 'Quédate quieto durante la adquisición GPS — el teléfono guarda el mejor fix.');
t('gps_tip_sky', 'Cherchez une trouée de ciel : sous couvert dense, la précision se dégrade fortement.', 'Find a sky gap: under dense canopy accuracy degrades sharply.', 'Himmelsspalte suchen: unter dichtem Blätterdach verschlechtert sich die Genauigkeit.', 'Cerca uno spiraglio di cielo: sotto copertura fitta la precisione peggiora.', 'Busca un claro de cielo: bajo dosel denso la precisión empeora mucho.');
t('gps_tip_offline_mountain', 'Hors-ligne en montagne : pas de Wi‑Fi/réseau, uniquement les satellites — prévoyez 30 s à 2 min au premier fix.', 'Offline in mountains: no Wi-Fi/network, satellites only — allow 30s–2min for first fix.', 'Offline in den Bergen: nur Satelliten — 30s–2min für ersten Fix einplanen.', 'Offline in montagna: solo satelliti — prevedi 30s–2min per il primo fix.', 'Sin conexión en montaña: solo satélites — prevé 30s–2min para el primer fix.');
t('gps_tip_android_precise', 'Vérifiez Android → Autorisations → Position → « Précise » (pas « Approximative »).', 'Check Android → Permissions → Location → "Precise" (not "Approximate").', 'Android → Berechtigungen → Standort → „Genau" (nicht „Ungefähr").', 'Verifica Android → Autorizzazioni → Posizione → «Precisa» (non «Approssimativa»).', 'Verifica Android → Permisos → Ubicación → «Precisa» (no «Aproximada»).');
t('gps_volume_hint', "Volume Bas = note vocale (démarrer / arrêter) · Volume Haut = photo (si besoin) puis enregistrer l'arbre.", 'Vol Down = voice note (start/stop) · Vol Up = photo (if needed) then save tree.', 'Lautstärke runter = Sprachnotiz · Lautstärke hoch = Foto dann Baum speichern.', 'Volume giù = nota vocale · Volume su = foto poi salva albero.', 'Vol abajo = nota de voz · Vol arriba = foto luego guardar árbol.');
t('gps_poor_warning', 'Précision faible ({accuracy}) — position approximative en forêt', 'Poor accuracy ({accuracy}) — approximate position in forest', 'Geringe Genauigkeit ({accuracy}) — ungefähre Position im Wald', 'Precisione bassa ({accuracy}) — posizione approssimativa in foresta', 'Precisión baja ({accuracy}) — posición aproximada en bosque');
t('gps_saved', 'Position enregistrée ({accuracy})', 'Position saved ({accuracy})', 'Position gespeichert ({accuracy})', 'Posizione registrata ({accuracy})', 'Posición guardada ({accuracy})');
t('gps_no_coords_saved', 'Enregistré sans coordonnées GPS — repérez cet arbre sur la carte ou via la boussole.', 'Saved without GPS coordinates — locate this tree on the map or via compass.', 'Ohne GPS-Koordinaten gespeichert — Baum auf Karte oder per Kompass finden.', 'Salvato senza coordinate GPS — individua l\'albero sulla mappa o con la bussola.', 'Guardado sin coordenadas GPS — localiza este árbol en el mapa o con la brújula.');
t('gps_confirm_no_position', 'Aucune position GPS obtenue. Enregistrer cet arbre sans coordonnées ?', 'No GPS position obtained. Save this tree without coordinates?', 'Keine GPS-Position erhalten. Baum ohne Koordinaten speichern?', 'Nessuna posizione GPS ottenuta. Salvare senza coordinate?', '¿Sin posición GPS? ¿Guardar este árbol sin coordenadas?');
t('gps_confirm_poor', 'Précision faible ({accuracy}). Enregistrer avec une position approximative ?', 'Poor accuracy ({accuracy}). Save with approximate position?', 'Geringe Genauigkeit ({accuracy}). Mit ungefährer Position speichern?', 'Precisione bassa ({accuracy}). Salvare con posizione approssimativa?', '¿Precisión baja ({accuracy})? ¿Guardar con posición aproximada?');
t('gps_confirm_title', 'Position GPS incertaine', 'Uncertain GPS position', 'Unsichere GPS-Position', 'Posizione GPS incerta', 'Posición GPS incierta');
t('gps_forest_tips_title', 'Précision GPS en forêt et montagne', 'GPS accuracy in forest and mountains', 'GPS-Genauigkeit im Wald und in den Bergen', 'Precisione GPS in foresta e montagna', 'Precisión GPS en bosque y montaña');
t('location_precise_required', 'Position précise requise — dans Autorisations Android, choisissez « Précise » pour Yamadori.', 'Precise location required — in Android Permissions, choose "Precise" for Yamadori.', 'Genaue Position erforderlich — in Android-Berechtigungen „Genau" wählen.', 'Posizione precisa richiesta — nelle autorizzazioni Android scegli «Precisa».', 'Ubicación precisa requerida — en Permisos Android elige «Precisa».');
t('location_denied', 'Localisation refusée — activez la position dans les réglages Android.', 'Location denied — enable location in Android settings.', 'Standort verweigert — in Android-Einstellungen aktivieren.', 'Localizzazione negata — attiva la posizione nelle impostazioni Android.', 'Ubicación denegada — activa la ubicación en ajustes Android.');
t('location_denied_yrs_required', 'Localisation refusée — activez la position pour calculer le score YRS.', 'Location denied — enable location to compute the YRS score.', 'Standort verweigert — aktivieren Sie die Position für den YRS-Score.', 'Localizzazione negata — attiva la posizione per calcolare il punteggio YRS.', 'Ubicación denegada — activa la ubicación para calcular el puntaje YRS.');
t('location_unsupported', 'Géolocalisation non supportée sur cet appareil.', 'Geolocation not supported on this device.', 'Geolokalisierung auf diesem Gerät nicht unterstützt.', 'Geolocalizzazione non supportata su questo dispositivo.', 'Geolocalización no compatible con este dispositivo.');
t('location_unavailable', 'Géolocalisation non disponible.', 'Geolocation unavailable.', 'Geolokalisierung nicht verfügbar.', 'Geolocalizzazione non disponibile.', 'Geolocalización no disponible.');
t('location_not_supported', 'Géolocalisation non supportée', 'Geolocation not supported', 'Geolokalisierung nicht unterstützt', 'Geolocalizzazione non supportata', 'Geolocalización no compatible');
t('location_unavailable_short', 'Position indisponible', 'Position unavailable', 'Position nicht verfügbar', 'Posizione non disponibile', 'Posición no disponible');
t('location_bg_unsupported', 'Suivi en arrière-plan non supporté sur cette plateforme', 'Background tracking not supported on this platform', 'Hintergrundverfolgung auf dieser Plattform nicht unterstützt', 'Tracciamento in background non supportato', 'Seguimiento en segundo plano no compatible');
t('location_bg_message', 'Yamadori suit votre position en forêt. Désactivez dans Réglages pour économiser la batterie.', 'Yamadori tracks your position in the forest. Disable in Settings to save battery.', 'Yamadori verfolgt Ihre Position im Wald. In Einstellungen deaktivieren um Akku zu sparen.', 'Yamadori traccia la tua posizione in foresta. Disattiva in Impostazioni per risparmiare batteria.', 'Yamadori rastrea tu posición en el bosque. Desactiva en Ajustes para ahorrar batería.');
t('location_bg_title', 'Yamadori — suivi GPS', 'Yamadori — GPS tracking', 'Yamadori — GPS-Verfolgung', 'Yamadori — tracciamento GPS', 'Yamadori — seguimiento GPS');
t('location_bg_denied', "Autorisation de localisation refusée — activez « Tout le temps » dans les réglages Android.", 'Location permission denied — enable "All the time" in Android settings.', 'Standortberechtigung verweigert — „Immer" in Android-Einstellungen aktivieren.', 'Autorizzazione posizione negata — attiva «Sempre» nelle impostazioni Android.', 'Permiso de ubicación denegado — activa «Todo el tiempo» en ajustes Android.');

// ── Compass / altitude ──────────────────────────────────────────────────────
batch('compass_cardinal', [
	{ key: 'n', fr: 'Nord', en: 'North', de: 'Nord', it: 'Nord', es: 'Norte' },
	{ key: 'ne', fr: 'Nord-Est', en: 'North-East', de: 'Nordost', it: 'Nord-Est', es: 'Noreste' },
	{ key: 'e', fr: 'Est', en: 'East', de: 'Ost', it: 'Est', es: 'Este' },
	{ key: 'se', fr: 'Sud-Est', en: 'South-East', de: 'Südost', it: 'Sud-Est', es: 'Sureste' },
	{ key: 's', fr: 'Sud', en: 'South', de: 'Süd', it: 'Sud', es: 'Sur' },
	{ key: 'sw', fr: 'Sud-Ouest', en: 'South-West', de: 'Südwest', it: 'Sud-Ovest', es: 'Suroeste' },
	{ key: 'w', fr: 'Ouest', en: 'West', de: 'West', it: 'Ovest', es: 'Oeste' },
	{ key: 'nw', fr: 'Nord-Ouest', en: 'North-West', de: 'Nordwest', it: 'Nord-Ovest', es: 'Noroeste' }
]);
t('compass_front', 'Front : {heading}', 'Front: {heading}', 'Front: {heading}', 'Fronte: {heading}', 'Frente: {heading}');
t('compass_no_gps', 'Aucune coordonnée GPS disponible.', 'No GPS coordinates available.', 'Keine GPS-Koordinaten verfügbar.', 'Nessuna coordinata GPS disponibile.', 'No hay coordenadas GPS disponibles.');
t('compass_permission_denied', 'Permission boussole refusée — appuyez pour réessayer', 'Compass permission denied — tap to retry', 'Kompass-Berechtigung verweigert — tippen zum Wiederholen', 'Permesso bussola negato — tocca per riprovare', 'Permiso de brújula denegado — toca para reintentar');
t('compass_north_up', 'Nord en haut', 'North up', 'Norden oben', 'Nord in alto', 'Norte arriba');
t('compass_lock_heading', 'Verrouiller le cap', 'Lock heading', 'Kurs sperren', 'Blocca rotta', 'Bloquear rumbo');
t('compass_calculating', 'Calcul de la position…', 'Calculating position…', 'Position wird berechnet…', 'Calcolo della posizione…', 'Calculando posición…');
t('altitude_label', 'Altitude : {altitude}', 'Altitude: {altitude}', 'Höhe: {altitude}', 'Altitudine: {altitude}', 'Altitud: {altitude}');
batch('altitude_tier', [
	{ key: 'plaine', fr: 'Plaine et vallées', en: 'Plains and valleys', de: 'Ebene und Täler', it: 'Pianura e valli', es: 'Llanuras y valles' },
	{ key: 'collines', fr: 'Collines et bocage', en: 'Hills and hedgerows', de: 'Hügel und Heckenlandschaft', it: 'Colline e bocage', es: 'Colinas y bocage' },
	{ key: 'montagne', fr: 'Montagne moyenne', en: 'Mid-mountain', de: 'Mittelgebirge', it: 'Montagna media', es: 'Montaña media' },
	{ key: 'subalpin', fr: 'Étage subalpin', en: 'Subalpine zone', de: 'Subalpin-Stufe', it: 'Fascia subalpina', es: 'Estrato subalpino' },
	{ key: 'alpin', fr: 'Étage alpin', en: 'Alpine zone', de: 'Alpinstufe', it: 'Fascia alpina', es: 'Estrato alpino' }
]);
t('altitude_short_plaine', 'Plaine', 'Plain', 'Ebene', 'Pianura', 'Llanura');
t('altitude_short_collines', 'Collines', 'Hills', 'Hügel', 'Colline', 'Colinas');
t('altitude_short_montagne', 'Montagne', 'Mountain', 'Berg', 'Montagna', 'Montaña');
t('altitude_short_subalpin', 'Subalpin', 'Subalpine', 'Subalpin', 'Subalpino', 'Subalpino');
t('altitude_short_alpin', 'Alpin', 'Alpine', 'Alpin', 'Alpino', 'Alpino');

// ── Voice / photo / camera ──────────────────────────────────────────────────
t('voice_note', 'Note vocale', 'Voice note', 'Sprachnotiz', 'Nota vocale', 'Nota de voz');
t('voice_note_optional', 'Note vocale (optionnel)', 'Voice note (optional)', 'Sprachnotiz (optional)', 'Nota vocale (opzionale)', 'Nota de voz (opcional)');
t('voice_recorded_on', 'Enregistrée le {date}', 'Recorded on {date}', 'Aufgenommen am {date}', 'Registrata il {date}', 'Grabada el {date}');
t('voice_play', 'Lire la note vocale', 'Play voice note', 'Sprachnotiz abspielen', 'Riproduci nota vocale', 'Reproducir nota de voz');
t('voice_pause', 'Pause', 'Pause', 'Pause', 'Pausa', 'Pausa');
t('voice_hint', 'Appuyez sur Enregistrer, parlez, puis Stop (max 30 s)', 'Press Record, speak, then Stop (max 30 s)', 'Aufnehmen drücken, sprechen, dann Stopp (max. 30 s)', 'Premi Registra, parla, poi Stop (max 30 s)', 'Pulsa Grabar, habla, luego Stop (máx. 30 s)');
t('voice_recording', 'Enregistrement en cours', 'Recording in progress', 'Aufnahme läuft', 'Registrazione in corso', 'Grabación en curso');
t('voice_mic_denied_android', 'Accès au micro refusé. Paramètres Android → Applications → Yamadori → Autorisations → Microphone → Autoriser.', 'Microphone access denied. Android Settings → Apps → Yamadori → Permissions → Microphone → Allow.', 'Mikrofonzugriff verweigert. Android-Einstellungen → Apps → Yamadori → Mikrofon → Erlauben.', 'Accesso microfono negato. Impostazioni Android → App → Yamadori → Microfono → Consenti.', 'Acceso al micrófono denegado. Ajustes Android → Apps → Yamadori → Micrófono → Permitir.');
t('voice_mic_denied_web', 'Accès au micro refusé. Dans Brave : menu du site → Réglages du site → Microphone → Autoriser.', 'Microphone access denied. In Brave: site menu → Site settings → Microphone → Allow.', 'Mikrofonzugriff verweigert. In Brave: Website-Menü → Mikrofon → Erlauben.', 'Accesso microfono negato. In Brave: menu sito → Microfono → Consenti.', 'Acceso al micrófono denegado. En Brave: menú del sitio → Micrófono → Permitir.');
t('voice_no_mic', 'Aucun micro détecté sur cet appareil.', 'No microphone detected on this device.', 'Kein Mikrofon auf diesem Gerät erkannt.', 'Nessun microfono rilevato su questo dispositivo.', 'No se detectó micrófono en este dispositivo.');
t('voice_mic_busy', 'Le micro est utilisé par une autre application.', 'Microphone is in use by another app.', 'Mikrofon wird von einer anderen App verwendet.', 'Il microfono è usato da un\'altra app.', 'El micrófono está en uso por otra aplicación.');
t('voice_start_error', "Impossible de démarrer l'enregistrement", 'Unable to start recording', 'Aufnahme kann nicht gestartet werden', 'Impossibile avviare la registrazione', 'No se puede iniciar la grabación');
t('voice_stop_error', "Erreur à l'arrêt de l'enregistrement", 'Error stopping recording', 'Fehler beim Stoppen der Aufnahme', 'Errore nell\'arresto della registrazione', 'Error al detener la grabación');
t('voice_read_error', "Impossible de lire l'enregistrement audio", 'Unable to read audio recording', 'Audioaufnahme kann nicht gelesen werden', 'Impossibile leggere la registrazione audio', 'No se puede leer la grabación de audio');
t('voice_empty', 'Enregistrement vide', 'Empty recording', 'Leere Aufnahme', 'Registrazione vuota', 'Grabación vacía');
t('voice_no_session', 'Aucun enregistrement en cours', 'No recording in progress', 'Keine Aufnahme läuft', 'Nessuna registrazione in corso', 'No hay grabación en curso');
t('voice_recording_error', "Erreur pendant l'enregistrement", 'Error during recording', 'Fehler während der Aufnahme', 'Errore durante la registrazione', 'Error durante la grabación');
t('voice_unsupported_device', 'Micro non supporté sur cet appareil', 'Microphone not supported on this device', 'Mikrofon auf diesem Gerät nicht unterstützt', 'Microfono non supportato su questo dispositivo', 'Micrófono no compatible con este dispositivo');
t('voice_unsupported_browser', 'Micro non supporté sur ce navigateur', 'Microphone not supported in this browser', 'Mikrofon in diesem Browser nicht unterstützt', 'Microfono non supportato in questo browser', 'Micrófono no compatible con este navegador');
t('photo_label', 'Photo', 'Photo', 'Foto', 'Foto', 'Foto');
t('photo_take', 'Prendre une photo', 'Take a photo', 'Foto aufnehmen', 'Scatta una foto', 'Tomar una foto');
t('photo_camera', 'Appareil photo', 'Camera', 'Kamera', 'Fotocamera', 'Cámara');
t('photo_interrupted', 'Prise de photo interrompue — réessayez.', 'Photo capture interrupted — try again.', 'Fotoaufnahme unterbrochen — erneut versuchen.', 'Scatto interrotto — riprova.', 'Captura de foto interrumpida — reintenta.');
t('photo_not_received', 'Photo non reçue — réessayez.', 'Photo not received — try again.', 'Foto nicht empfangen — erneut versuchen.', 'Foto non ricevuta — riprova.', 'Foto no recibida — reintenta.');
t('photo_fullscreen', 'Photo en plein écran', 'Full-screen photo', 'Foto im Vollbild', 'Foto a schermo intero', 'Foto a pantalla completa');
t('camera_denied', "Accès à la caméra refusé — autorisez la Caméra dans les réglages Android.", 'Camera access denied — allow Camera in Android settings.', 'Kamerazugriff verweigert — Kamera in Android-Einstellungen erlauben.', 'Accesso fotocamera negato — consenti Fotocamera nelle impostazioni Android.', 'Acceso a la cámara denegado — permite Cámara en ajustes Android.');
t('camera_no_data', 'Photo sans données', 'Photo without data', 'Foto ohne Daten', 'Foto senza dati', 'Foto sin datos');

// ── Capture form ────────────────────────────────────────────────────────────
t('capture_species_optional', 'Espèce (optionnel)', 'Species (optional)', 'Art (optional)', 'Specie (opzionale)', 'Especie (opcional)');
t('capture_species_placeholder', 'Ex. Pin sylvestre, Genévrier...', 'E.g. Scots pine, Juniper...', 'Z.B. Waldkiefer, Wacholder...', 'Es. Pino silvestre, Ginepro...', 'Ej. Pino silvestre, Enebro...');
t('capture_species_suggestions', "Suggestions d'espèces selon votre position", 'Species suggestions for your location', 'Artvorschläge für Ihren Standort', 'Suggerimenti di specie per la tua posizione', 'Sugerencias de especies según tu posición');
t('capture_no_suggestions', 'Aucune suggestion pour cette zone.', 'No suggestions for this area.', 'Keine Vorschläge für dieses Gebiet.', 'Nessun suggerimento per questa zona.', 'Sin sugerencias para esta zona.');
t('capture_species_selected', '{name} sélectionnée', '{name} selected', '{name} ausgewählt', '{name} selezionata', '{name} seleccionada');
t('capture_location_identifying', 'Identification du lieu…', 'Identifying location…', 'Ort wird identifiziert…', 'Identificazione del luogo…', 'Identificando el lugar…');
t('capture_quick_assessment', 'Évaluation rapide (optionnel)', 'Quick assessment (optional)', 'Schnellbewertung (optional)', 'Valutazione rapida (opzionale)', 'Evaluación rápida (opcional)');
t('capture_quick_assessment_hint', 'Potentiel, calibre et nébari', 'Potential, caliber and nebari', 'Potenzial, Kaliber und Nebari', 'Potenziale, calibro e nebari', 'Potencial, calibre y nebari');
t('capture_notes', 'Notes', 'Notes', 'Notizen', 'Note', 'Notas');
t('capture_notes_placeholder', 'Taille, exposition, état sanitaire, accès...', 'Size, exposure, health, access...', 'Größe, Exposition, Gesundheit, Zugang...', 'Dimensione, esposizione, salute, accesso...', 'Tamaño, exposición, salud, acceso...');
t('capture_climate_error', 'Erreur lors de la récupération du climat.', 'Error fetching climate data.', 'Fehler beim Abrufen der Klimadaten.', 'Errore nel recupero del clima.', 'Error al obtener datos climáticos.');
t('capture_submit', "Enregistrer l'arbre", 'Save tree', 'Baum speichern', 'Salva albero', 'Guardar árbol');

// ── Visit / share / feedback ────────────────────────────────────────────────
t('visit_added', 'Visite ajoutée', 'Visit added', 'Besuch hinzugefügt', 'Visita aggiunta', 'Visita añadida');
t('visit_new', 'Nouvelle visite', 'New visit', 'Neuer Besuch', 'Nuova visita', 'Nueva visita');
t('visit_placeholder', 'Ex. Cernage des racines, taille de structure… (optionnel si photo ou note vocale)', 'E.g. Root ring prep, structural pruning… (optional if photo or voice note)', 'Z.B. Wurzelring, Strukturschnitt… (optional bei Foto oder Sprachnotiz)', 'Es. Cernaggio radici, potatura strutturale… (opzionale con foto o nota vocale)', 'Ej. Preparación radicular, poda estructural… (opcional con foto o nota de voz)');
t('visit_add', 'Ajouter une visite', 'Add a visit', 'Besuch hinzufügen', 'Aggiungi una visita', 'Añadir una visita');
t('share_tree_title', 'Yamadori — {label}', 'Yamadori — {label}', 'Yamadori — {label}', 'Yamadori — {label}', 'Yamadori — {label}');
t('share_date', 'Date : {date}', 'Date: {date}', 'Datum: {date}', 'Data: {date}', 'Fecha: {date}');
t('share_location', 'Repéré à : {location}', 'Spotted at: {location}', 'Gesichtet bei: {location}', 'Rilevato a: {location}', 'Localizado en: {location}');
t('share_gps', 'GPS : {lat}, {lng}', 'GPS: {lat}, {lng}', 'GPS: {lat}, {lng}', 'GPS: {lat}, {lng}', 'GPS: {lat}, {lng}');
t('share_accuracy', 'Précision : {accuracy}', 'Accuracy: {accuracy}', 'Genauigkeit: {accuracy}', 'Precisione: {accuracy}', 'Precisión: {accuracy}');
t('share_notes', 'Notes : {notes}', 'Notes: {notes}', 'Notizen: {notes}', 'Note: {notes}', 'Notas: {notes}');
t('share_photo', 'Partager la photo', 'Share photo', 'Foto teilen', 'Condividi foto', 'Compartir foto');
t('feedback_shared', 'Partagé', 'Shared', 'Geteilt', 'Condiviso', 'Compartido');
t('feedback_copied', 'Informations copiées', 'Information copied', 'Informationen kopiert', 'Informazioni copiate', 'Información copiada');
t('feedback_coords_copied', 'Coordonnées copiées', 'Coordinates copied', 'Koordinaten kopiert', 'Coordinate copiate', 'Coordenadas copiadas');
t('feedback_copy_failed', 'Copie impossible', 'Copy failed', 'Kopieren fehlgeschlagen', 'Copia non riuscita', 'Copia fallida');
t('feedback_photo_shared', 'Photo partagée', 'Photo shared', 'Foto geteilt', 'Foto condivisa', 'Foto compartida');
t('feedback_map_offline', 'Carte IGN indisponible hors-ligne — boussole recommandée', 'IGN map unavailable offline — compass recommended', 'IGN-Karte offline nicht verfügbar — Kompass empfohlen', 'Mappa IGN non disponibile offline — bussola consigliata', 'Mapa IGN no disponible sin conexión — brújula recomendada');
t('feedback_compass_recommended', 'Boussole recommandée', 'Compass recommended', 'Kompass empfohlen', 'Bussola consigliata', 'Brújula recomendada');

// ── Map / offline tiles ─────────────────────────────────────────────────────
t('map_nearest_trees', 'Arbres les plus proches', 'Nearest trees', 'Nächste Bäume', 'Alberi più vicini', 'Árboles más cercanos');
t('map_geolocated_trees', 'Arbres géolocalisés', 'Geolocated trees', 'Geolokalisierte Bäume', 'Alberi geolocalizzati', 'Árboles geolocalizados');
t('map_offline_zone', 'Zone hors-ligne', 'Offline zone', 'Offline-Zone', 'Zona offline', 'Zona sin conexión');
t('map_offline_select', 'Sélection de zone hors-ligne', 'Offline zone selection', 'Offline-Zonenauswahl', 'Selezione zona offline', 'Selección de zona sin conexión');
t('map_downloading', 'Téléchargement…', 'Downloading…', 'Herunterladen…', 'Download…', 'Descargando…');
t('map_download', 'Télécharger (~{count})', 'Download (~{count})', 'Herunterladen (~{count})', 'Scarica (~{count})', 'Descargar (~{count})');
t('map_preparing', 'Préparation…', 'Preparing…', 'Vorbereitung…', 'Preparazione…', 'Preparando…');
t('map_tiles_downloaded', '{count} tuiles téléchargées', '{count} tiles downloaded', '{count} Kacheln heruntergeladen', '{count} tessere scaricate', '{count} teselas descargadas');
t('map_tiles_with_failures', '{count} tuiles téléchargées ({failed} échecs)', '{count} tiles downloaded ({failed} failures)', '{count} Kacheln heruntergeladen ({failed} Fehler)', '{count} tessere scaricate ({failed} errori)', '{count} teselas descargadas ({failed} fallos)');
t('map_download_failed', 'Téléchargement de la zone impossible', 'Zone download failed', 'Zonendownload fehlgeschlagen', 'Download zona non riuscito', 'Descarga de zona fallida');
t('map_tiles_error', 'Impossible de charger les tuiles IGN — vérifiez votre connexion', 'Unable to load IGN tiles — check your connection', 'IGN-Kacheln können nicht geladen werden — Verbindung prüfen', 'Impossibile caricare le tessere IGN — verifica la connessione', 'No se pueden cargar las teselas IGN — verifica tu conexión');
t('map_tile_progress', '{layer} : {done}/{total} tuiles', '{layer}: {done}/{total} tiles', '{layer}: {done}/{total} Kacheln', '{layer}: {done}/{total} tessere', '{layer}: {done}/{total} teselas');
t('map_layer_plan', 'Plan', 'Map', 'Plan', 'Mappa', 'Mapa');
t('map_layer_satellite', 'Satellite', 'Satellite', 'Satellit', 'Satellite', 'Satélite');
t('map_layer_cadastre', 'Cadastre', 'Cadastre', 'Kataster', 'Catasto', 'Catastro');
t(
	'map_cadastre_tap_hint',
	'Appuyer sur la carte ou un arbre pour identifier la parcelle',
	'Tap the map or a tree to identify the parcel',
	'Auf Karte oder Baum tippen, um das Flurstück zu identifizieren',
	'Tocca la mappa o un albero per identificare la particella',
	'Toca el mapa o un árbol para identificar la parcela'
);
t('map_orient_north', 'Orienter vers le nord et centrer sur ma position', 'Orient north and center on my position', 'Nach Norden ausrichten und auf meine Position zentrieren', 'Orienta a nord e centra sulla mia posizione', 'Orientar al norte y centrar en mi posición');
t('map_north_position', 'Nord et ma position', 'North and my position', 'Nord und meine Position', 'Nord e la mia posizione', 'Norte y mi posición');
t('map_offline_button', 'Hors-ligne', 'Offline', 'Offline', 'Offline', 'Sin conexión');

// ── Parking ─────────────────────────────────────────────────────────────────
t('parking_calculating', 'Calcul de la position…', 'Calculating position…', 'Position wird berechnet…', 'Calcolo della posizione…', 'Calculando posición…');
t('parking_distance', 'La voiture est à {distance} au {direction}', 'Car is {distance} to the {direction}', 'Auto ist {distance} nach {direction}', 'L\'auto è a {distance} verso {direction}', 'El coche está a {distance} al {direction}');
t('parking_gps_unavailable', 'Position GPS indisponible — réessayez en plein air.', 'GPS position unavailable — try again in open air.', 'GPS-Position nicht verfügbar — im Freien erneut versuchen.', 'Posizione GPS non disponibile — riprova all\'aperto.', 'Posición GPS no disponible — reintenta al aire libre.');
t('parking_saved', 'Position de la voiture enregistrée', 'Car position saved', 'Autoposition gespeichert', 'Posizione auto registrata', 'Posición del coche guardada');
t('parking_save', 'Enregistrer la position de la voiture', 'Save car position', 'Autoposition speichern', 'Registra posizione auto', 'Guardar posición del coche');
t('parking_resave', 'Réenregistrer', 'Re-save', 'Erneut speichern', 'Riregistra', 'Volver a guardar');
t('parking_load_error', 'Point de départ local illisible.', 'Local starting point unreadable.', 'Lokaler Startpunkt unlesbar.', 'Punto di partenza locale illeggibile.', 'Punto de partida local ilegible.');

// ── Climate panel ───────────────────────────────────────────────────────────
t('climate_section_title', 'Conditions agro-météo', 'Agro-meteorological conditions', 'Agrometeorologische Bedingungen', 'Condizioni agro-meteo', 'Condiciones agrometeorológicas');
t('climate_loading', 'chargement…', 'loading…', 'laden…', 'caricamento…', 'cargando…');
t('climate_history_title', 'Historique climatique du biotope', 'Biotope climate history', 'Biotop-Klimaverlauf', 'Storico climatico del biotopo', 'Historial climático del biotopo');
t('climate_approximate', 'Position approximative — le climat affiché est indicatif pour la zone.', 'Approximate position — climate shown is indicative for the area.', 'Ungefähre Position — angezeigtes Klima ist indikativ für die Zone.', 'Posizione approssimativa — il clima mostrato è indicativo per la zona.', 'Posición aproximada — el clima mostrado es indicativo para la zona.');
t('climate_analyzing', 'Analyse du climat local (3 ans)…', 'Analyzing local climate (3 years)…', 'Lokales Klima wird analysiert (3 Jahre)…', 'Analisi del clima locale (3 anni)…', 'Analizando clima local (3 años)…');
t('climate_min_temp', 'Température minimale absolue', 'Absolute minimum temperature', 'Absolute Mindesttemperatur', 'Temperatura minima assoluta', 'Temperatura mínima absoluta');
t('climate_min_temp_hint', 'Minimum subi sur 3 ans', 'Minimum over 3 years', 'Minimum über 3 Jahre', 'Minimo su 3 anni', 'Mínimo en 3 años');
t('climate_precipitation', 'Pluviométrie annuelle moyenne', 'Average annual precipitation', 'Durchschnittlicher Jahresniederschlag', 'Precipitazione annua media', 'Precipitación anual media');
t('climate_precipitation_hint', "Essentiel pour doser l'arrosage chez soi", 'Essential for watering at home', 'Wichtig für die Bewässerung zu Hause', 'Essenziale per irrigare a casa', 'Esencial para regar en casa');
t('climate_frost_days', 'Jours de gel par an', 'Frost days per year', 'Frosttage pro Jahr', 'Giorni di gelo all\'anno', 'Días de helada al año');
t('climate_error_historical', 'Impossible de récupérer les données météo historiques.', 'Unable to fetch historical weather data.', 'Historische Wetterdaten können nicht abgerufen werden.', 'Impossibile recuperare dati meteo storici.', 'No se pueden obtener datos meteorológicos históricos.');
t('climate_error_no_data', 'Aucune donnée climatique disponible pour ce point.', 'No climate data available for this location.', 'Keine Klimadaten für diesen Punkt verfügbar.', 'Nessun dato climatico disponibile per questo punto.', 'No hay datos climáticos para este punto.');
t('climate_error_fetch', 'Erreur lors de la récupération des données climatiques.', 'Error fetching climate data.', 'Fehler beim Abrufen der Klimadaten.', 'Errore nel recupero dei dati climatici.', 'Error al obtener datos climáticos.');
t('climate_online_required', 'Disponible avec connexion internet.', 'Available with internet connection.', 'Mit Internetverbindung verfügbar.', 'Disponibile con connessione internet.', 'Disponible con conexión a internet.');
t('soil_history_unavailable', 'Historique indisponible', 'History unavailable', 'Verlauf nicht verfügbar', 'Storico non disponibile', 'Historial no disponible');
t('soil_sparkline_aria', 'Évolution des températures du sol à 6 et 18 cm sur 7 jours', 'Soil temperature trend at 6 and 18 cm over 7 days', 'Bodentemperatur-Verlauf bei 6 und 18 cm über 7 Tage', 'Andamento temperature suolo a 6 e 18 cm su 7 giorni', 'Evolución de temperaturas del suelo a 6 y 18 cm en 7 días');

// ── Geocoding ───────────────────────────────────────────────────────────────
t('geocode_online_required', 'Connexion requise pour identifier le lieu.', 'Connection required to identify location.', 'Verbindung erforderlich um Ort zu identifizieren.', 'Connessione richiesta per identificare il luogo.', 'Conexión requerida para identificar el lugar.');
t('geocode_fetch_error', 'Impossible de récupérer le nom du lieu.', 'Unable to fetch location name.', 'Ortsname kann nicht abgerufen werden.', 'Impossibile recuperare il nome del luogo.', 'No se puede obtener el nombre del lugar.');
t('geocode_not_found', 'Aucun lieu identifié pour ces coordonnées.', 'No location identified for these coordinates.', 'Kein Ort für diese Koordinaten identifiziert.', 'Nessun luogo identificato per queste coordinate.', 'Ningún lugar identificado para estas coordenadas.');
t('geocode_timeout', 'La requête de géocodage a expiré. Réessayez plus tard.', 'Geocoding request timed out. Try again later.', 'Geocodierungsanfrage abgelaufen. Später erneut versuchen.', 'Richiesta di geocodifica scaduta. Riprova più tardi.', 'La solicitud de geocodificación expiró. Inténtalo más tarde.');
t('geocode_error', 'Erreur lors du géocodage inverse.', 'Reverse geocoding error.', 'Fehler bei der Reverse-Geocodierung.', 'Errore nella geocodifica inversa.', 'Error en la geocodificación inversa.');

// ── Cadastre / régime foncier ───────────────────────────────────────────────
t('cadastre_loading', 'Identification cadastrale…', 'Cadastral lookup…', 'Katasterabfrage…', 'Identificazione catastale…', 'Identificación catastral…');
t('cadastre_unavailable', 'Cadastre indisponible', 'Cadastre unavailable', 'Kataster nicht verfügbar', 'Catasto non disponibile', 'Catastro no disponible');
t('cadastre_parcel_short', 'Parcelle {section} n°{number}', 'Parcel {section} no. {number}', 'Flurstück {section} Nr. {number}', 'Particella {section} n. {number}', 'Parcela {section} n.º {number}');
t('cadastre_private_title', 'Terrain privé détecté (Parcelle {section} n°{number})', 'Private land detected (Parcel {section} no. {number})', 'Privatgrundstück erkannt (Flurstück {section} Nr. {number})', 'Terreno privato rilevato (Particella {section} n. {number})', 'Terreno privado detectado (Parcela {section} n.º {number})');
t('cadastre_private_detail', "Pour obtenir l'autorisation, présentez ce numéro de parcelle à la mairie de {commune}. Elle est légalement autorisée à vous donner le nom du propriétaire ou à le contacter pour vous.", 'To obtain permission, present this parcel number to the town hall of {commune}. They may legally provide the owner\'s name or contact them for you.', 'Für eine Genehmigung wenden Sie sich mit dieser Flurstücksnummer an das Rathaus von {commune}.', 'Per ottenere l\'autorizzazione, presenta questo numero di particella al comune di {commune}.', 'Para obtener autorización, presenta este número de parcela al ayuntamiento de {commune}.');
t('cadastre_state_forest_title', 'Forêt domaniale (ONF)', 'State forest (ONF)', 'Staatsforst (ONF)', 'Foresta demaniale (ONF)', 'Bosque demanial (ONF)');
t('cadastre_state_forest_detail', "Le prélèvement nécessite une autorisation de l'Office National des Forêts de cette région.", 'Collection requires authorization from the National Forestry Office (ONF) for this region.', 'Die Entnahme erfordert eine Genehmigung des ONF dieser Region.', 'Il prelievo richiede l\'autorizzazione dell\'ONF di questa regione.', 'La recolección requiere autorización del ONF de esta región.');
t('cadastre_communal_title', 'Forêt communale (ONF)', 'Communal forest (ONF)', 'Kommunalforst (ONF)', 'Foresta comunale (ONF)', 'Bosque comunal (ONF)');
t('cadastre_communal_detail', "Contactez la mairie de {commune} et l'ONF local pour obtenir une autorisation de prélèvement.", 'Contact the town hall of {commune} and the local ONF office for collection permission.', 'Wenden Sie sich an das Rathaus von {commune} und das örtliche ONF.', 'Contatta il comune di {commune} e l\'ONF locale per l\'autorizzazione.', 'Contacta el ayuntamiento de {commune} y el ONF local para obtener autorización.');
t('cadastre_summary_private', 'Terrain privé · {parcel} · {commune}', 'Private land · {parcel} · {commune}', 'Privatgrund · {parcel} · {commune}', 'Terreno privato · {parcel} · {commune}', 'Terreno privado · {parcel} · {commune}');
t('cadastre_summary_state_forest', 'Forêt domaniale · {parcel} · {commune}', 'State forest · {parcel} · {commune}', 'Staatsforst · {parcel} · {commune}', 'Foresta demaniale · {parcel} · {commune}', 'Bosque demanial · {parcel} · {commune}');
t('cadastre_summary_communal_forest', 'Forêt communale · {parcel} · {commune}', 'Communal forest · {parcel} · {commune}', 'Kommunalforst · {parcel} · {commune}', 'Foresta comunale · {parcel} · {commune}', 'Bosque comunal · {parcel} · {commune}');
t('cadastre_expand_hint', 'Appuyer pour les démarches à suivre', 'Tap for next steps', 'Tippen für nächste Schritte', 'Tocca per i passi da seguire', 'Toca para ver los pasos a seguir');
t('cadastre_collapse_hint', 'Réduire', 'Collapse', 'Einklappen', 'Comprimi', 'Contraer');
t('cadastre_legal_heading', 'Références légales', 'Legal references', 'Rechtliche Verweise', 'Riferimenti legali', 'Referencias legales');
t('cadastre_law_link', 'Lire le texte sur Légifrance', 'Read the text on Légifrance', 'Text auf Légifrance lesen', 'Leggi il testo su Légifrance', 'Leer el texto en Légifrance');
t(
	'cadastre_law_civil_546_title',
	'Code civil — article 546',
	'Civil Code — Article 546',
	'Zivilgesetzbuch — Artikel 546',
	'Codice civile — articolo 546',
	'Código civil — artículo 546'
);
t(
	'cadastre_law_civil_546_summary',
	"La propriété d'un bien immobilier confère au propriétaire le droit sur tout ce qu'il produit et sur ce qui s'y rattache (droit d'accession) : les arbres et végétaux du terrain lui appartiennent.",
	"Ownership of real property gives the owner rights over everything it produces and what is attached to it (right of accession): trees and plants on the land belong to the owner.",
	'Das Eigentum an einem Grundstück gewährt dem Eigentümer Rechte an allem, was es hervorbringt und daran haftet (Zubehörrecht): Bäume und Pflanzen auf dem Grund gehören ihm.',
	'La proprietà di un immobile conferisce al proprietario il diritto su tutto ciò che produce e su ciò che vi si unisce (diritto di accessione): gli alberi e le piante del terreno gli appartengono.',
	'La propiedad de un inmueble confiere al propietario el derecho sobre todo lo que produce y lo que se une a él (derecho de accesión): los árboles y plantas del terreno le pertenecen.'
);
t(
	'cadastre_law_forest_l163_11_title',
	'Code forestier — article L163-11',
	'Forestry Code — Article L163-11',
	'Forstgesetzbuch — Artikel L163-11',
	'Codice forestale — articolo L163-11',
	'Código forestal — artículo L163-11'
);
t(
	'cadastre_law_forest_l163_11_summary',
	"Sans autorisation du propriétaire, le prélèvement de truffes (quelle qu'en soit la quantité) ou de plus de 10 litres d'autres produits des bois et forêts (champignons, fruits, semences) est puni comme un vol au sens du code pénal.",
	"Without the landowner's authorization, harvesting truffles (any quantity) or more than 10 litres of other woodland products (mushrooms, fruit, seeds) is punishable as theft under the Penal Code.",
	'Ohne Genehmigung des Eigentümers ist die Entnahme von Trüffeln (jede Menge) oder mehr als 10 Liter anderer Waldprodukte (Pilze, Früchte, Samen) als Diebstahl nach dem Strafgesetzbuch strafbar.',
	'Senza autorizzazione del proprietario, il prelievo di tartufi (qualsiasi quantità) o di oltre 10 litri di altri prodotti del bosco (funghi, frutti, semi) è punito come furto secondo il codice penale.',
	'Sin autorización del propietario, la recolección de trufas (cualquier cantidad) o de más de 10 litros de otros productos forestales (setas, frutos, semillas) se castiga como robo según el código penal.'
);

t('settings_cadastre_offline', 'Cadastre hors-ligne', 'Offline cadastre', 'Offline-Kataster', 'Catasto offline', 'Catastro sin conexión');
t(
	'settings_cadastre_offline_hint',
	'Les parcelles cadastrales consultées sont mises en cache 30 jours pour afficher le statut foncier sans connexion.',
	'Cadastral parcel lookups are cached for 30 days to show land ownership hints offline.',
	'Abgerufene Katasterparzellen werden 30 Tage zwischengespeichert, um Eigentumshinweise offline anzuzeigen.',
	'Le parcelle catastali consultate vengono memorizzate per 30 giorni per mostrare lo stato di proprietà offline.',
	'Las consultas catastrales se guardan en caché 30 días para mostrar el régimen de propiedad sin conexión.'
);
t('settings_cadastre_cached_one', 'parcelle en cache', 'parcel cached', 'Flurstück im Cache', 'particella in cache', 'parcela en caché');
t('settings_cadastre_cached_many', 'parcelles en cache', 'parcels cached', 'Flurstücke im Cache', 'particelle in cache', 'parcelas en caché');
t('settings_clear_cadastre_cache', 'Vider le cache cadastre', 'Clear cadastre cache', 'Kataster-Cache leeren', 'Svuota cache catasto', 'Vaciar caché catastral');
t('settings_cadastre_cache_cleared', 'Cache cadastre vidé.', 'Cadastre cache cleared.', 'Kataster-Cache geleert.', 'Cache catasto svuotata.', 'Caché catastral vaciado.');
t('settings_cadastre_cache_clear_failed', 'Impossible de vider le cache cadastre.', 'Unable to clear cadastre cache.', 'Kataster-Cache konnte nicht geleert werden.', 'Impossibile svuotare la cache catasto.', 'No se pudo vaciar el caché catastral.');

// ── Veto Legal Layer (checklist éthique) ─────────────────────────────────────
t('veto_checklist_title', 'Checklist éthique et juridique', 'Ethical and legal checklist', 'Ethische und rechtliche Checkliste', 'Checklist etica e legale', 'Lista ética y jurídica');
t('veto_open_checklist', 'Ouvrir la checklist de prélèvement', 'Open harvest checklist', 'Ernte-Checkliste öffnen', 'Apri checklist di prelievo', 'Abrir lista de recolección');
t('veto_close_checklist', 'Fermer la checklist', 'Close checklist', 'Checkliste schließen', 'Chiudi checklist', 'Cerrar lista');
t('veto_confirm_harvest', 'Confirmer le prélèvement', 'Confirm collection', 'Entnahme bestätigen', 'Conferma prelievo', 'Confirmar recolección');
t('veto_confirm_success', 'Prélèvement confirmé — engagement enregistré.', 'Collection confirmed — commitment saved.', 'Entnahme bestätigt — Verpflichtung gespeichert.', 'Prelievo confermato — impegno registrato.', 'Recolección confirmada — compromiso guardado.');
t('veto_already_confirmed', 'Prélèvement déjà confirmé le {date}', 'Collection already confirmed on {date}', 'Entnahme bereits bestätigt am {date}', 'Prelievo già confermato il {date}', 'Recolección ya confirmada el {date}');
t('veto_info_label', 'Rappel de la loi', 'Legal reminder', 'Gesetzliche Erinnerung', 'Promemoria legale', 'Recordatorio legal');
t('veto_pillar_property', '1. Statut du sol & propriété', '1. Land status & ownership', '1. Bodenstatus & Eigentum', '1. Stato del suolo e proprietà', '1. Estado del suelo y propiedad');
t('veto_pillar_environment', '2. Périmètre de protection', '2. Protected area perimeter', '2. Schutzgebiet', '2. Perimetro di protezione', '2. Perímetro de protección');
t('veto_pillar_species', "3. Statut de l'espèce", '3. Species status', '3. Artstatus', '3. Stato della specie', '3. Estado de la especie');
t('veto_pillar_restoration', "4. Remise en état", '4. Site restoration', '4. Wiederherstellung', '4. Ripristino del sito', '4. Restauración del sitio');
t('veto_pillar_disclaimer', '5. Information indicative', '5. Informational notice', '5. Hinweis zur Information', '5. Informativa', '5. Información indicativa');
t('veto_parcel_label', 'Parcelle cadastrale : {parcel} — {commune}', 'Cadastral parcel: {parcel} — {commune}', 'Katasterflurstück: {parcel} — {commune}', 'Particella catastale: {parcel} — {commune}', 'Parcela catastral: {parcel} — {commune}');
t('veto_species_label', 'Espèce repérée : {species}', 'Scouted species: {species}', 'Erfasste Art: {species}', 'Specie rilevata: {species}', 'Especie registrada: {species}');
t('veto_check_property', "Je certifie détenir l'autorisation écrite et signée du propriétaire de cette parcelle (particulier, mairie ou convention ONF).", 'I certify that I hold written, signed authorization from the owner of this parcel (private owner, town hall, or ONF agreement).', 'Ich bestätige, eine schriftliche, unterschriebene Genehmigung des Flurstückseigentümers zu besitzen.', 'Certifico di possedere l\'autorizzazione scritta e firmata del proprietario di questa particella.', 'Certifico que dispongo de la autorización escrita y firmada del propietario de esta parcela.');
t('veto_check_protected_area', "Je certifie que la parcelle ne se trouve pas dans un espace protégé réglementé.", 'I certify that the parcel is not in a regulated protected area.', 'Ich bestätige, dass das Flurstück nicht in einem geschützten Gebiet liegt.', 'Certifico che la particella non si trova in un\'area protetta regolamentata.', 'Certifico que la parcela no está en un espacio protegido regulado.');
t('veto_check_species', "Je certifie avoir consulté l'INPN et que cette espèce ne figure pas parmi les espèces végétales protégées (arrêtés nationaux et régionaux).", 'I certify that I checked INPN and this species is not among protected plant species (national and regional orders).', 'Ich bestätige, die INPN konsultiert zu haben und dass diese Art nicht unter den geschützten Pflanzenarten steht.', 'Certifico di aver consultato l\'INPN e che questa specie non figura tra le specie vegetali protette.', 'Certifico haber consultado el INPN y que esta especie no figura entre las especies vegetales protegidas.');
t('veto_check_restoration', "Je m'engage à reboucher le trou d'extraction avec la terre d'origine et à restituer l'aspect initial du sol.", 'I commit to filling the extraction hole with original soil and restoring the ground to its initial appearance.', 'Ich verpflichte mich, das Extraktionsloch mit Ursprungserde zu füllen und den Boden wiederherzustellen.', 'Mi impegno a riempire la buca con la terra originale e a ripristinare l\'aspetto iniziale del suolo.', 'Me comprometo a rellenar el hoyo con la tierra original y restaurar el aspecto inicial del suelo.');
t('veto_disclaimer_body', "Les zonages protégés, données cadastrales, références légales et liens externes affichés dans cette application sont fournis à titre purement indicatif. Ils ne constituent en aucun cas un avis juridique, une autorisation de prélèvement ni une garantie d'exactitude. L'éditeur de Yamadori ne saurait être tenu responsable d'une erreur, omission, décalage des données sources ou interprétation. Vous restez seul responsable de vérifier la réglementation applicable auprès des autorités compétentes avant tout prélèvement.", 'Protected zoning, cadastral data, legal references and external links shown in this app are provided for information only. They do not constitute legal advice, collection permission or a guarantee of accuracy. The Yamadori publisher cannot be held liable for any error, omission, outdated source data or interpretation. You remain solely responsible for checking applicable regulations with the competent authorities before any collection.', 'Schutzgebiete, Katasterdaten, Rechtstexte und externe Links in dieser App dienen nur der Information. Sie stellen keine Rechtsberatung, keine Sammelerlaubnis und keine Genauigkeitsgarantie dar. Der Herausgeber von Yamadori haftet nicht für Fehler, Auslassungen, veraltete Quelldaten oder Auslegungen. Sie allein sind verantwortlich, die geltenden Vorschriften bei den zuständigen Behörden zu prüfen.', "Zonizzazioni protette, dati catastali, riferimenti legali e link esterni mostrati in questa app sono forniti a titolo puramente informativo. Non costituiscono parere legale, autorizzazione al prelievo né garanzia di accuratezza. L'editore di Yamadori non può essere ritenuto responsabile di errori, omissioni, dati obsoleti o interpretazioni. Resti l'unico responsabile del controllo della normativa applicabile presso le autorità competenti prima di ogni prelievo.", 'Las zonificaciones protegidas, datos catastrales, referencias legales y enlaces externos mostrados en esta aplicación se proporcionan únicamente a título informativo. No constituyen asesoramiento jurídico, autorización de recolección ni garantía de exactitud. El editor de Yamadori no puede ser considerado responsable de errores, omisiones, datos desactualizados o interpretaciones. Usted es el único responsable de verificar la normativa aplicable ante las autoridades competentes antes de cualquier recolección.');
t('veto_check_disclaimer', "J'ai pris connaissance de cette clause et comprends que les informations sont fournies à titre indicatif, sans engagement de responsabilité de l'éditeur.", 'I have read this clause and understand that information is provided for guidance only, without liability on the part of the publisher.', 'Ich habe diese Klausel zur Kenntnis genommen und verstehe, dass die Informationen unverbindlich sind und der Herausgeber nicht haftet.', "Ho preso visione di questa clausola e comprendo che le informazioni sono indicative, senza responsabilità dell'editore.", 'He leído esta cláusula y entiendo que la información es orientativa, sin responsabilidad del editor.');
t('veto_property_intro', "En France, l'arbre appartient au propriétaire du terrain sur lequel il a germé.", 'In France, the tree belongs to the owner of the land where it germinated.', 'In Frankreich gehört der Baum dem Eigentümer des Bodens, auf dem er keimte.', 'In Francia l\'albero appartiene al proprietario del terreno su cui è germogliato.', 'En Francia, el árbol pertenece al propietario del terreno en el que germinó.');
t('veto_legal_resources_title', 'Aide légale — textes fondateurs', 'Legal help — founding texts', 'Rechtliche Hilfe — Grundtexte', 'Aiuto legale — testi fondamentali', 'Ayuda legal — textos fundadores');
t('veto_law_property_heading', 'A. Droit de propriété (Code civil & Code pénal)', 'A. Property law (Civil Code & Penal Code)', 'A. Eigentumsrecht (Zivil- & Strafgesetzbuch)', 'A. Diritto di proprietà (Codice civile e penale)', 'A. Derecho de propiedad (Código civil y penal)');
t('veto_law_forest_heading', 'B. Sanctions en forêt (Code forestier)', 'B. Forest penalties (Forestry Code)', 'B. Waldsanktionen (Forstgesetzbuch)', 'B. Sanzioni forestali (Codice forestale)', 'B. Sanciones forestales (Código forestal)');
t('veto_law_env_heading', "C. Protection de la nature (Code de l'environnement)", 'C. Nature protection (Environment Code)', 'C. Naturschutz (Umweltgesetzbuch)', 'C. Protezione della natura (Codice dell\'ambiente)', 'C. Protección de la naturaleza (Código de medio ambiente)');
t('veto_law_cc552_title', 'Code civil — article 552', 'Civil Code — Article 552', 'Zivilgesetzbuch — Artikel 552', 'Codice civile — articolo 552', 'Código civil — artículo 552');
t('veto_law_cc552_text', '« La propriété du sol emporte la propriété du dessus et du dessous. » Cela inclut les arbres, les arbustes et le substrat prélevé avec la motte.', '"Ownership of the land carries ownership of what is above and below it." This includes trees, shrubs, and the soil/substrate taken with the root ball.', '«Das Eigentum am Boden umfasst das Eigentum an dem, was darüber und darunter ist.» Einschließlich Bäume, Sträucher und Substrat.', '«La proprietà del suolo comporta la proprietà del di sopra e del di sotto.» Include alberi, arbusti e substrato.', '«La propiedad del suelo conlleva la del encima y del debajo.» Incluye árboles, arbustos y sustrato.');
t('veto_law_cc547_title', 'Code civil — article 547', 'Civil Code — Article 547', 'Zivilgesetzbuch — Artikel 547', 'Codice civile — articolo 547', 'Código civil — artículo 547');
t('veto_law_cc547_text', '« Les fruits naturels ou industriels de la terre […] appartiennent au propriétaire par droit d\'accession. »', '"The natural or industrial fruits of the land [...] belong to the owner by right of accession."', '«Die natürlichen oder industriellen Früchte der Erde [...] gehören dem Eigentümer durch Zubehörrecht.»', '«I frutti naturali o industriali della terra [...] appartengono al proprietario per diritto di accessione.»', '«Los frutos naturales o industriales de la tierra [...] pertenecen al propietario por derecho de accesión.»');
t('veto_law_cp311_1_title', 'Code pénal — article 311-1', 'Penal Code — Article 311-1', 'Strafgesetzbuch — Artikel 311-1', 'Codice penale — articolo 311-1', 'Código penal — artículo 311-1');
t('veto_law_cp311_1_text', '« Le vol est la soustraction frauduleuse de la chose d\'autrui. » Prélever un arbre sans accord explicite du propriétaire (public ou privé) est juridiquement qualifié de vol.', '"Theft is the fraudulent taking of another\'s property." Removing a tree without the owner\'s explicit consent (public or private) is legally theft.', '«Diebstahl ist die betrügerische Wegnahme fremder Sachen.» Entnahme ohne ausdrückliche Zustimmung ist Diebstahl.', '«Il furto è la sottrazione fraudolenta della cosa altrui.» Il prelievo senza consenso esplicito è furto.', '«El robo es la sustracción fraudulenta de cosa ajena.» La recolección sin consentimiento explícito es robo.');
t('veto_law_cf_l331_2_title', 'Code forestier — article L331-2', 'Forestry Code — Article L331-2', 'Forstgesetzbuch — Artikel L331-2', 'Codice forestale — articolo L331-2', 'Código forestal — artículo L331-2');
t('veto_law_cf_l331_2_text', "Punit sévèrement l'arrachage ou la coupe non autorisée. Les amendes sont calculées selon le volume ou le nombre d'arbres ; le matériel utilisé (véhicule, pelles, pioches) peut être confisqué.", 'Severely punishes unauthorized uprooting or cutting. Fines are based on volume or tree count; equipment used (vehicle, shovels, picks) may be confiscated.', 'Bestraft unbefugtes Entwurzeln oder Fällen schwer. Bußen nach Volumen oder Baumzahl; Ausrüstung kann beschlagnahmt werden.', 'Punisce severamente lo sradicamento o il taglio non autorizzato. Le multe dipendono dal volume o dal numero di alberi; il materiale può essere confiscato.', 'Castiga severamente el arranque o la tala no autorizada. Las multas se calculan por volumen o número de árboles; el material puede ser confiscado.');
t('veto_law_cf_l161_1_title', 'Code forestier — article L161-1', 'Forestry Code — Article L161-1', 'Forstgesetzbuch — Artikel L161-1', 'Codice forestale — articolo L161-1', 'Código forestal — artículo L161-1');
t('veto_law_cf_l161_1_text', "Punit la dégradation des sols forestiers ou des pistes forestières — d'où l'obligation de reboucher le trou et de restituer l'aspect initial du sol.", 'Punishes degradation of forest soils or tracks — hence the obligation to fill the hole and restore the ground.', 'Bestraft die Verschlechterung von Waldböden oder Wegen — daher die Pflicht zur Wiederherstellung.', 'Punisce il degrado dei suoli o dei percorsi forestali — da qui l\'obbligo di ripristino.', 'Castiga la degradación de suelos o caminos forestales — de ahí la obligación de restaurar.');
t('veto_law_ce_l411_1_title', "Code de l'environnement — article L411-1", 'Environment Code — Article L411-1', 'Umweltgesetzbuch — Artikel L411-1', 'Codice dell\'ambiente — articolo L411-1', 'Código de medio ambiente — artículo L411-1');
t('veto_law_ce_l411_1_text', "Interdit « la destruction, la coupe, la mutilation, l'arrachage, la cueillette ou l'enlèvement » de végétaux d'espèces protégées — même avec l'accord du propriétaire.", 'Prohibits "destruction, cutting, mutilation, uprooting, picking or removal" of protected plant species — even with the landowner\'s consent.', 'Verbietet Zerstörung, Fällung, Verstümmelung, Entwurzelung oder Entnahme geschützter Pflanzenarten — auch mit Zustimmung des Eigentümers.', 'Vieta distruzione, taglio, mutilazione, sradicamento o prelievo di specie protette — anche con consenso del proprietario.', 'Prohíbe destrucción, corte, mutilación, arranque o recolección de especies protegidas — incluso con consentimiento del propietario.');
t('veto_law_ce_l415_3_title', "Code de l'environnement — article L415-3", 'Environment Code — Article L415-3', 'Umweltgesetzbuch — Artikel L415-3', 'Codice dell\'ambiente — articolo L415-3', 'Código de medio ambiente — artículo L415-3');
t('veto_law_ce_l415_3_text', "Volet répressif : atteinte à la conservation d'espèces végétales protégées — délit puni de 3 ans d'emprisonnement et 150 000 € d'amende.", 'Criminal provisions: harming protected plant species — offence punishable by 3 years\' imprisonment and €150,000 fine.', 'Strafrechtliche Bestimmungen: Schädigung geschützter Pflanzenarten — bis zu 3 Jahre Haft und 150.000 € Buße.', 'Disposizioni penali: offesa alla conservazione di specie protette — fino a 3 anni di reclusione e 150.000 € di multa.', 'Disposiciones penales: atentado contra especies protegidas — hasta 3 años de prisión y 150.000 € de multa.');
t('veto_species_inpn_title', "Vérification du statut de l'espèce", 'Species status verification', 'Überprüfung des Artstatus', 'Verifica dello stato della specie', 'Verificación del estado de la especie');
t('veto_species_inpn_body', "Avant tout prélèvement, vérifiez sur la base officielle INPN (MNHN) que l'essence visée n'est pas protégée par un arrêté national ou régional. Si le badge « Espèce protégée » apparaît, le prélèvement est un délit pénal, même avec l'accord du propriétaire.", 'Before any collection, check on the official INPN (MNHN) database that the species is not protected by a national or regional order. A red "Protected species" badge means collection is a criminal offence, even with owner consent.', 'Vor jeder Entnahme auf der offiziellen INPN-Datenbank prüfen. Ein rotes «Geschützte Art»-Badge bedeutet Straftat, auch mit Eigentümerzustimmung.', 'Prima di ogni prelievo verifica sul database INPN ufficiale. Il badge «Specie protetta» indica un reato penale, anche con consenso del proprietario.', 'Antes de cualquier recolección verifica en la base INPN oficial. La insignia «Especie protegida» indica delito penal, incluso con consentimiento del propietario.');
t('veto_species_inpn_link', 'Rechercher sur la base INPN (MNHN)', 'Search on INPN database (MNHN)', 'Auf INPN-Datenbank suchen (MNHN)', 'Cerca nel database INPN (MNHN)', 'Buscar en la base INPN (MNHN)');
t('veto_species_regional_pdl', "Région Pays de la Loire détectée (GPS) : vous êtes soumis à l'arrêté du 25 janvier 1993. Les milieux humides, landes et dunes littorales (Gâvre, coteaux de Loire, marais) comportent de nombreuses espèces strictement protégées.", 'Pays de la Loire region detected (GPS): subject to the 25 January 1993 order. Wetlands, heathland and coastal dunes (Gâvre, Loire hillsides, marshes) have many strictly protected species.', 'Region Pays de la Loire erkannt (GPS): Arrêté vom 25. Januar 1993 gilt. Feuchtgebiete, Heiden und Küstendünen haben viele geschützte Arten.', 'Regione Pays de la Loire rilevata (GPS): si applica l\'arrêté del 25 gennaio 1993. Zone umide, lande e dune costiere con molte specie protette.', 'Región Pays de la Loire detectada (GPS): aplica el arrêté del 25 de enero de 1993. Humedales, landas y dunas costeras con muchas especies protegidas.');
t('veto_species_regional_generic', "Plus de 400 espèces sont protégées au niveau national, et des centaines d'autres au niveau régional. Consultez toujours l'INPN — ne vous fiez pas à une liste figée dans l'application.", 'Over 400 species are nationally protected, and hundreds more regionally. Always check INPN — do not rely on a fixed in-app list.', 'Über 400 Arten sind national geschützt, hunderte regional. Immer INPN prüfen — keine feste App-Liste.', 'Oltre 400 specie sono protette a livello nazionale e centinaia a livello regionale. Consulta sempre l\'INPN.', 'Más de 400 especies están protegidas a nivel nacional y cientos más a nivel regional. Consulta siempre el INPN.');
t('veto_species_examples_title', 'Exemples d\'espèces ligneuses protégées (national)', 'Examples of protected woody species (national)', 'Beispiele geschützter holziger Arten (national)', 'Esempi di specie legnose protette (nazionale)', 'Ejemplos de especies leñosas protegidas (nacional)');
t('veto_species_examples_body', "Arrêté du 20 janvier 1982 (liste non exhaustive) : Bouleau nain (Betula nana), Pin de Salzmann (Pinus nigra subsp. salzmannii), certaines variétés de Saules sauvages (Salix lapponum, S. repens…), Daphné / Bois-joli (Daphne blagayana…).", 'Order of 20 January 1982 (non-exhaustive): Dwarf birch (Betula nana), Salzmann pine (Pinus nigra subsp. salzmannii), some wild willows (Salix lapponum, S. repens…), Daphne species.', 'Erlass vom 20. Januar 1982 (nicht abschließend): Zwergbirke, Salzmann-Kiefer, einige Weiden, Daphne-Arten.', 'Arrêté del 20 gennaio 1982 (non esaustivo): Betula nana, Pinus nigra subsp. salzmannii, alcuni salici, Daphne.', 'Orden del 20 de enero de 1982 (no exhaustivo): Betula nana, Pinus nigra subsp. salzmannii, algunos sauces, Daphne.');
t('veto_scan_loading', 'Analyse des zones protégées…', 'Scanning protected areas…', 'Schutzgebiete werden geprüft…', 'Analisi aree protette…', 'Analizando zonas protegidas…');
t('veto_scan_unavailable', 'Analyse indisponible — vérifiez manuellement les zonages.', 'Scan unavailable — check zoning manually.', 'Analyse nicht verfügbar — Zonierung manuell prüfen.', 'Analisi non disponibile — verifica manualmente.', 'Análisis no disponible — verifica manualmente.');
t('veto_scan_clear', 'Aucun parc national ni réserve naturelle nationale détecté à ce point GPS.', 'No national park or national nature reserve detected at this GPS point.', 'Kein Nationalpark oder Naturschutzgebiet an diesem GPS-Punkt erkannt.', 'Nessun parco nazionale o riserva naturale rilevato in questo punto GPS.', 'Ningún parque nacional o reserva natural detectado en este punto GPS.');
t('veto_scan_cached', 'Résultat issu du cache local (zone déjà analysée ou mode hors-ligne).', 'Result from local cache (area already scanned or offline mode).', 'Ergebnis aus lokalem Cache (bereits gescannt oder Offline-Modus).', 'Risultato dalla cache locale (zona già analizzata o modalità offline).', 'Resultado de la caché local (zona ya analizada o modo sin conexión).');
t('veto_automatic_block', 'Prélèvement interdit — zone de protection absolue détectée.', 'Collection forbidden — absolute protection zone detected.', 'Entnahme verboten — absolutes Schutzgebiet erkannt.', 'Prelievo vietato — area di protezione assoluta rilevata.', 'Recolección prohibida — zona de protección absoluta detectada.');
t('veto_zone_pn', 'Parc national', 'National park', 'Nationalpark', 'Parco nazionale', 'Parque nacional');
t('veto_zone_pn_hint', 'Interdiction absolue de prélèvement (veto automatique).', 'Absolute collection ban (automatic veto).', 'Absolutes Entnahmeverbot (automatisches Veto).', 'Divieto assoluto di prelievo (veto automatico).', 'Prohibición absoluta de recolección (veto automático).');
t('veto_zone_rnn', 'Réserve naturelle nationale', 'National nature reserve', 'Nationales Naturschutzgebiet', 'Riserva naturale nazionale', 'Reserva natural nacional');
t('veto_zone_rnn_hint', 'Interdiction absolue de prélèvement (veto automatique).', 'Absolute collection ban (automatic veto).', 'Absolutes Entnahmeverbot (automatisches Veto).', 'Divieto assoluto di prelievo (veto automatico).', 'Prohibición absoluta de recolección (veto automático).');
t('veto_zone_pnr', 'Parc naturel régional', 'Regional nature park', 'Regionaler Naturpark', 'Parco naturale regionale', 'Parque natural regional');
t('veto_zone_pnr_hint', 'Charte du parc — vérifiez les règlements locaux avant tout prélèvement.', 'Park charter — check local rules before any collection.', 'Parkcharta — lokale Regeln vor jeder Entnahme prüfen.', 'Carta del parco — verifica i regolamenti locali prima di ogni prelievo.', 'Carta del parque — verifica las normas locales antes de recolectar.');
t('veto_zone_rnr_regional', 'Réserve naturelle régionale', 'Regional nature reserve', 'Regionales Naturschutzgebiet', 'Riserva naturale regionale', 'Reserva natural regional');
t('veto_zone_rnr_regional_hint', 'Réserves régionales, corses ou cynégétiques — contraintes selon l\'arrêté.', 'Regional, Corsican or hunting reserves — constraints vary by order.', 'Regionale, korsische oder jagdliche Reservate — Auflagen je Erlass.', 'Riserve regionali, corse o cinegetiche — vincoli secondo il decreto.', 'Reservas regionales, corso o cinegéticas — restricciones según el decreto.');
t('veto_zone_natura2000', 'Natura 2000', 'Natura 2000', 'Natura 2000', 'Natura 2000', 'Natura 2000');
t('veto_zone_natura_hint', 'Soumis à évaluation d\'impact ou arrêté préfectoral spécifique.', 'Subject to impact assessment or specific prefectural order.', 'Auswirkungsbewertung oder spezielle Präfekturerlass erforderlich.', 'Soggetto a valutazione d\'impatto o decreto prefettizio.', 'Sujeto a evaluación de impacto o decreto prefectural.');
t('veto_zone_znieff', 'ZNIEFF', 'ZNIEFF', 'ZNIEFF', 'ZNIEFF', 'ZNIEFF');
t('veto_zone_znieff_hint', 'Zone d\'intérêt écologique — vérifiez les contraintes locales.', 'Ecological interest zone — check local constraints.', 'Ökologisch wertvolle Zone — lokale Auflagen prüfen.', 'Zona di interesse ecologico — verifica i vincoli locali.', 'Zona de interés ecológico — verifica las restricciones locales.');
t('veto_zone_appb', 'APPB (biotope protégé)', 'APPB (protected biotope)', 'APPB (geschütztes Biotop)', 'APPB (biotopo protetto)', 'APPB (biotopo protegido)');
t('veto_zone_appb_hint', 'Protection stricte du milieu — vérifiez les arrêtés préfectoraux.', 'Strict habitat protection — check prefectural orders.', 'Strenger Biotopschutz — Präfekturerlasse prüfen.', 'Protezione rigorosa dell\'habitat — verifica i decreti prefettizi.', 'Protección estricta del hábitat — verifica los decretos prefecturales.');
t('veto_zone_status_certain', 'Zone détectée à votre position GPS.', 'Zone detected at your GPS position.', 'Zone an Ihrer GPS-Position erkannt.', 'Zona rilevata alla tua posizione GPS.', 'Zona detectada en tu posición GPS.');
t('veto_zone_status_potential', 'Votre parcelle cadastrale chevauche peut-être cette zone.', 'Your cadastral parcel may overlap this zone.', 'Ihre Katasterparzelle könnte diese Zone überlappen.', 'La tua particella catastale potrebbe sovrapporsi a questa zona.', 'Tu parcela catastral podría solaparse con esta zona.');
t('veto_zone_appb_manual', 'Pas de couverture nationale — vérifiez les arrêtés préfectoraux de votre département.', 'No national coverage — check prefectural orders for your department.', 'Keine nationale Abdeckung — Präfekturerlasse Ihres Départements prüfen.', 'Nessuna copertura nazionale — verifica i decreti prefettizi del tuo dipartimento.', 'Sin cobertura nacional — verifica los decretos prefecturales de tu departamento.');

// ── Settings / backup ───────────────────────────────────────────────────────
t('settings_display', 'Affichage', 'Display', 'Anzeige', 'Visualizzazione', 'Pantalla');
t('settings_display_hint', 'Interface haute lisibilité pour utilisation en plein soleil. Moins esthétique, mais lisible dehors.', 'High-readability interface for use in bright sunlight. Less aesthetic, but readable outdoors.', 'Hochlesbare Oberfläche für Sonnenlicht. Weniger ästhetisch, aber draußen lesbar.', 'Interfaccia ad alta leggibilità per il pieno sole. Meno estetica, ma leggibile fuori.', 'Interfaz de alta legibilidad para pleno sol. Menos estética, pero legible al aire libre.');
t('settings_outdoor_mode', 'Mode plein soleil', 'Bright sun mode', 'Sonnenmodus', 'Modalità pieno sole', 'Modo pleno sol');
t('settings_outdoor_hint', 'Fond blanc, texte noir, bordures épaisses et polices en gras.', 'White background, black text, thick borders and bold fonts.', 'Weißer Hintergrund, schwarzer Text, dicke Ränder und fette Schrift.', 'Sfondo bianco, testo nero, bordi spessi e caratteri in grassetto.', 'Fondo blanco, texto negro, bordes gruesos y fuentes en negrita.');
t('settings_outdoor_android_brightness', "Sur l'app Android, la luminosité de l'écran passe au maximum.", 'On the Android app, screen brightness goes to maximum.', 'In der Android-App wird die Bildschirmhelligkeit maximiert.', "Nell'app Android, la luminosità dello schermo va al massimo.", 'En la app Android, el brillo de pantalla pasa al máximo.');
t('settings_dark_mode', 'Mode sombre OLED', 'OLED dark mode', 'OLED-Dunkelmodus', 'Modalità scura OLED', 'Modo oscuro OLED');
t('settings_dark_hint', 'Fond noir pur pour économiser la batterie sur écran OLED. Exclusif avec le mode plein soleil.', 'Pure black background to save battery on OLED screens. Mutually exclusive with bright sun mode.', 'Reiner schwarzer Hintergrund zum Akkusparen auf OLED-Bildschirmen. Schließt den Sonnenmodus aus.', 'Sfondo nero puro per risparmiare batteria su schermi OLED. Esclusivo con la modalità pieno sole.', 'Fondo negro puro para ahorrar batería en pantallas OLED. Exclusivo con el modo pleno sol.');
t('settings_android_app', 'Application Android', 'Android app', 'Android-App', 'App Android', 'Aplicación Android');
t('settings_version_loading', 'Version en cours de chargement…', 'Loading version…', 'Version wird geladen…', 'Caricamento versione…', 'Cargando versión…');
t('settings_offline_tiles', '{count} tuiles cartographiques hors-ligne', '{count} offline map tiles', '{count} Offline-Kartenkacheln', '{count} tessere cartografiche offline', '{count} teselas cartográficas sin conexión');
t('settings_offline_map', 'Carte hors-ligne', 'Offline map', 'Offline-Karte', 'Mappa offline', 'Mapa sin conexión');
t('settings_offline_map_hint', 'Sur la carte, touchez Hors-ligne, puis pincez et déplacez la carte pour positionner la zone sous le carré vert centré.', 'On the map, tap Offline, then pinch and drag to position the zone under the centered green square.', 'Auf der Karte Offline tippen, dann zoomen und verschieben um die Zone unter dem grünen Quadrat zu positionieren.', 'Sulla mappa tocca Offline, poi pizzica e sposta per posizionare la zona sotto il quadrato verde.', 'En el mapa toca Sin conexión, luego pellizca y arrastra para posicionar la zona bajo el cuadrado verde.');
t('settings_offline_tip_1', 'Plan topographique et satellite téléchargés ensemble', 'Topographic and satellite maps downloaded together', 'Topografische und Satellitenkarten zusammen heruntergeladen', 'Mappe topografiche e satellite scaricate insieme', 'Mapas topográficos y satélite descargados juntos');
t('settings_offline_tip_2', 'Deux niveaux de zoom autour de la vue actuelle', 'Two zoom levels around current view', 'Zwei Zoomstufen um die aktuelle Ansicht', 'Due livelli di zoom intorno alla vista attuale', 'Dos niveles de zoom alrededor de la vista actual');
t('settings_offline_tip_3', "Conservation environ 30 jours · jusqu'à 10 000 tuiles", 'Kept about 30 days · up to 10,000 tiles', 'Ca. 30 Tage Aufbewahrung · bis zu 10.000 Kacheln', 'Conservazione circa 30 giorni · fino a 10.000 tessere', 'Conservación unos 30 días · hasta 10.000 teselas');
t('settings_tiles_count', '{count} tuiles', '{count} tiles', '{count} Kacheln', '{count} tessere', '{count} teselas');
t('settings_clear_map_cache', 'Vider le cache cartographique', 'Clear map cache', 'Karten-Cache leeren', 'Svuota cache cartografica', 'Vaciar caché cartográfica');
t('settings_weather_offline', 'Météo hors-ligne', 'Offline weather', 'Offline-Wetter', 'Meteo offline', 'Meteo sin conexión');
t('settings_weather_offline_hint', "Les prévisions Open-Meteo sont conservées pour alimenter le score YRS sans réseau, dans un rayon d'environ 30 km.", 'Open-Meteo forecasts are cached to power YRS score offline, within about 30 km.', 'Open-Meteo-Prognosen werden für YRS offline zwischengespeichert, im Radius von ca. 30 km.', 'Le previsioni Open-Meteo sono conservate per il punteggio YRS offline, entro circa 30 km.', 'Las previsiones Open-Meteo se conservan para el puntaje YRS sin red, en un radio de unos 30 km.');
t('settings_forecast_cached_one', 'prévision en cache', 'forecast cached', 'Prognose im Cache', 'previsione in cache', 'previsión en caché');
t('settings_forecast_cached_many', 'prévisions en cache', 'forecasts cached', 'Prognosen im Cache', 'previsioni in cache', 'previsiones en caché');
t('settings_clear_weather_cache', 'Vider le cache météo', 'Clear weather cache', 'Wetter-Cache leeren', 'Svuota cache meteo', 'Vaciar caché meteorológica');
t('settings_backup', 'Sauvegarde', 'Backup', 'Sicherung', 'Backup', 'Copia de seguridad');
t('settings_backup_hint', 'Sauvegarde complète de vos données ({count} arbre{s} actuellement). Les coordonnées et métadonnées sont chiffrées dans le fichier — seule l\'application Yamadori peut les restaurer.', 'Full backup of your data ({count} tree{s} currently). Coordinates and metadata are encrypted — only Yamadori can restore them.', 'Vollständige Sicherung Ihrer Daten ({count} Baum{en} aktuell). Koordinaten und Metadaten sind verschlüsselt.', 'Backup completo dei tuoi dati ({count} alber{o/i} attualmente). Coordinate e metadati sono cifrati.', 'Copia completa de tus datos ({count} árbol{es} actualmente). Coordenadas y metadatos cifrados.');
t('settings_backup_received', 'Sauvegarde reçue', 'Backup received', 'Sicherung empfangen', 'Backup ricevuto', 'Copia recibida');
t('settings_backup_received_hint', '{name} — choisissez comment l\'importer.', '{name} — choose how to import.', '{name} — wählen Sie die Importmethode.', '{name} — scegli come importare.', '{name} — elige cómo importar.');
t('settings_replace_all', 'Remplacer tout', 'Replace all', 'Alles ersetzen', 'Sostituisci tutto', 'Reemplazar todo');
t('settings_download_backup', 'Télécharger la sauvegarde', 'Download backup', 'Sicherung herunterladen', 'Scarica backup', 'Descargar copia de seguridad');
t('settings_save_downloads', 'Enregistrer dans Téléchargements', 'Save to Downloads', 'In Downloads speichern', 'Salva in Download', 'Guardar en Descargas');
t('settings_import_replace', 'Importer (remplacer tout)', 'Import (replace all)', 'Importieren (alles ersetzen)', 'Importa (sostituisci tutto)', 'Importar (reemplazar todo)');
t('settings_show_legacy_json', 'Importer une ancienne sauvegarde JSON', 'Import legacy JSON backup', 'Alte JSON-Sicherung importieren', 'Importa vecchio backup JSON', 'Importar copia JSON antigua');
t('settings_hide_legacy_json', "Masquer l'import JSON ancien format", 'Hide legacy JSON import', 'Alten JSON-Import ausblenden', 'Nascondi import JSON legacy', 'Ocultar importación JSON antigua');
t('settings_legacy_json_hint', 'Ancien format JSON v1 (sans mot de passe). Préférez le ZIP pour les nouvelles sauvegardes.', 'Legacy JSON v1 format (no password). Prefer ZIP for new backups.', 'Altes JSON v1-Format (ohne Passwort). ZIP für neue Sicherungen bevorzugen.', 'Vecchio formato JSON v1 (senza password). Preferisci ZIP per i nuovi backup.', 'Formato JSON v1 antiguo (sin contraseña). Prefiere ZIP para nuevas copias.');
t('settings_import_json_merge', 'Importer JSON (fusionner)', 'Import JSON (merge)', 'JSON importieren (zusammenführen)', 'Importa JSON (unisci)', 'Importar JSON (fusionar)');
t('settings_import_json_replace', 'Importer JSON (remplacer tout)', 'Import JSON (replace all)', 'JSON importieren (alles ersetzen)', 'Importa JSON (sostituisci tutto)', 'Importar JSON (reemplazar todo)');
t('settings_gps_android', 'GPS Android (APK)', 'Android GPS (APK)', 'Android-GPS (APK)', 'GPS Android (APK)', 'GPS Android (APK)');
t('settings_gps_android_hint', "La précision GPS au moment de la photo est essentielle pour le repérage. L'app utilise le mode haute précision et mémorise le meilleur fix pendant la capture.", 'GPS accuracy at photo time is essential for scouting. The app uses high-precision mode and saves the best fix during capture.', 'GPS-Genauigkeit bei der Fotoaufnahme ist essentiell. Die App nutzt Hochpräzisionsmodus.', 'La precisione GPS al momento della foto è essenziale. L\'app usa la modalità alta precisione.', 'La precisión GPS al tomar la foto es esencial. La app usa modo de alta precisión.');
t('settings_gps_tip_precise', 'Autorisation Précise (pas « Approximative »)', 'Precise permission (not "Approximate")', 'Genaue Berechtigung (nicht „Ungefähr")', 'Autorizzazione Precisa (non «Approssimativa»)', 'Permiso Preciso (no «Aproximada»)');
t('settings_gps_tip_offline', 'En montagne hors-ligne : le GPS fonctionne sans réseau, mais le premier fix peut prendre plus longtemps', 'Offline in mountains: GPS works without network but first fix may take longer', 'Offline in den Bergen: GPS funktioniert ohne Netz, erster Fix dauert länger', 'In montagna offline: il GPS funziona senza rete ma il primo fix può richiedere più tempo', 'En montaña sin conexión: el GPS funciona sin red pero el primer fix puede tardar más');
t('settings_gps_tip_still', 'Restez immobile, ciel dégagé, avant de photographier', 'Stay still, clear sky, before photographing', 'Stillhalten, freier Himmel, vor dem Fotografieren', 'Resta fermo, cielo libero, prima di fotografare', 'Quédate quieto, cielo despejado, antes de fotografiar');
t('settings_bg_tracking', 'Suivi GPS en arrière-plan', 'Background GPS tracking', 'GPS-Hintergrundverfolgung', 'Tracciamento GPS in background', 'Seguimiento GPS en segundo plano');
t('settings_bg_tracking_hint', "Android exige l'autorisation « Tout le temps » et affiche une notification pendant le suivi.", 'Android requires "All the time" permission and shows a notification during tracking.', 'Android erfordert „Immer"-Berechtigung und zeigt eine Benachrichtigung.', 'Android richiede l\'autorizzazione «Sempre» e mostra una notifica.', 'Android requiere permiso «Todo el tiempo» y muestra una notificación.');
t('settings_open_location', 'Ouvrir les réglages de localisation Android', 'Open Android location settings', 'Android-Standorteinstellungen öffnen', 'Apri impostazioni posizione Android', 'Abrir ajustes de ubicación Android');
t('settings_reset_onboarding', "Relancer l'assistant permissions", 'Restart permissions wizard', 'Berechtigungsassistent neu starten', 'Riavvia assistente permessi', 'Reiniciar asistente de permisos');
t('settings_bg_enabled', 'Suivi en arrière-plan activé. Android affichera une notification persistante sur la carte et la boussole.', 'Background tracking enabled. Android will show a persistent notification on map and compass.', 'Hintergrundverfolgung aktiviert. Android zeigt eine dauerhafte Benachrichtigung.', 'Tracciamento in background attivato. Android mostrerà una notifica persistente.', 'Seguimiento en segundo plano activado. Android mostrará una notificación persistente.');
t('settings_bg_disabled', 'Suivi en arrière-plan désactivé.', 'Background tracking disabled.', 'Hintergrundverfolgung deaktiviert.', 'Tracciamento in background disattivato.', 'Seguimiento en segundo plano desactivado.');
t('settings_onboarding_reset', "Assistant permissions réinitialisé — relancez l'application.", 'Permissions wizard reset — restart the app.', 'Berechtigungsassistent zurückgesetzt — App neu starten.', 'Assistente permessi reimpostato — riavvia l\'app.', 'Asistente de permisos reiniciado — reinicia la aplicación.');
t('settings_export_saved', 'Export réussi — enregistré dans Téléchargements', 'Export successful — saved to Downloads', 'Export erfolgreich — in Downloads gespeichert', 'Esportazione riuscita — salvata in Download', 'Exportación exitosa — guardada en Descargas');
t('settings_export_shared', 'Export réussi — prêt à partager', 'Export successful — ready to share', 'Export erfolgreich — bereit zum Teilen', 'Esportazione riuscita — pronta per la condivisione', 'Exportación exitosa — lista para compartir');
t('settings_export_downloaded', 'Export réussi — fichier téléchargé', 'Export successful — file downloaded', 'Export erfolgreich — Datei heruntergeladen', 'Esportazione riuscita — file scaricato', 'Exportación exitosa — archivo descargado');
t('settings_import_restored', 'Import réussi — {count} {trees} restauré{s}', 'Import successful — {count} {trees} restored', 'Import erfolgreich — {count} {trees} wiederhergestellt', 'Import riuscito — {count} {trees} ripristinat{o/i}', 'Importación exitosa — {count} {trees} restaurado{s}');
t('settings_import_merged', 'Import réussi — {count} {trees} fusionné{s}', 'Import successful — {count} {trees} merged', 'Import erfolgreich — {count} {trees} zusammengeführt', 'Import riuscito — {count} {trees} unit{o/i}', 'Importación exitosa — {count} {trees} fusionado{s}');
t('settings_tree_one', 'arbre', 'tree', 'Baum', 'albero', 'árbol');
t('settings_trees_many', 'arbres', 'trees', 'Bäume', 'alberi', 'árboles');
t('settings_loading_wait', 'Chargement des données en cours — réessayez dans un instant.', 'Data still loading — try again in a moment.', 'Daten werden noch geladen — gleich erneut versuchen.', 'Caricamento dati in corso — riprova tra un attimo.', 'Cargando datos — inténtalo en un momento.');
t('settings_backup_restored', 'Sauvegarde restaurée ({count} {trees}).', 'Backup restored ({count} {trees}).', 'Sicherung wiederhergestellt ({count} {trees}).', 'Backup ripristinato ({count} {trees}).', 'Copia restaurada ({count} {trees}).');
t('settings_backup_merged', "Sauvegarde fusionnée — {count} {trees} au total dans l'app.", 'Backup merged — {count} {trees} total in app.', 'Sicherung zusammengeführt — {count} {trees} insgesamt in der App.', 'Backup unito — {count} {trees} in totale nell\'app.', 'Copia fusionada — {count} {trees} en total en la app.');
t('settings_backup_not_found', 'Sauvegarde reçue introuvable.', 'Received backup not found.', 'Empfangene Sicherung nicht gefunden.', 'Backup ricevuto non trovato.', 'Copia recibida no encontrada.');
t('settings_backup_failed', 'Sauvegarde impossible.', 'Backup failed.', 'Sicherung fehlgeschlagen.', 'Backup non riuscito.', 'Copia de seguridad fallida.');
t('settings_restore_failed', 'Restauration impossible.', 'Restore failed.', 'Wiederherstellung fehlgeschlagen.', 'Ripristino non riuscito.', 'Restauración fallida.');
t('settings_weather_cache_cleared', 'Cache météo vidé.', 'Weather cache cleared.', 'Wetter-Cache geleert.', 'Cache meteo svuotata.', 'Caché meteorológica vaciada.');
t('settings_weather_cache_clear_failed', 'Impossible de vider le cache météo.', 'Unable to clear weather cache.', 'Wetter-Cache kann nicht geleert werden.', 'Impossibile svuotare la cache meteo.', 'No se puede vaciar la caché meteorológica.');
t('settings_map_cache_cleared', 'Cache cartographique vidé.', 'Map cache cleared.', 'Karten-Cache geleert.', 'Cache cartografica svuotata.', 'Caché cartográfica vaciada.');
t('settings_map_cache_clear_failed', 'Impossible de vider le cache.', 'Unable to clear cache.', 'Cache kann nicht geleert werden.', 'Impossibile svuotare la cache.', 'No se puede vaciar la caché.');
t('settings_replace_title', 'Remplacer toutes les données ?', 'Replace all data?', 'Alle Daten ersetzen?', 'Sostituire tutti i dati?', '¿Reemplazar todos los datos?');
t('settings_replace_message', 'Les arbres et le parking locaux seront remplacés par ceux de la sauvegarde. Cette action est irréversible.', 'Local trees and parking will be replaced by the backup. This action is irreversible.', 'Lokale Bäume und Parkplatz werden durch die Sicherung ersetzt. Unwiderruflich.', 'Gli alberi e il parcheggio locali saranno sostituiti dal backup. Azione irreversibile.', 'Los árboles y el parking locales serán reemplazados por la copia. Acción irreversible.');

// ── Backup reminder ─────────────────────────────────────────────────────────
t('backup_advised', 'Sauvegarde conseillée — exportez vos données', 'Backup advised — export your data', 'Sicherung empfohlen — Daten exportieren', 'Backup consigliato — esporta i tuoi dati', 'Copia de seguridad recomendada — exporta tus datos');
t('backup_changed', 'Modifications locales — pensez à exporter', 'Local changes — consider exporting', 'Lokale Änderungen — Export erwägen', 'Modifiche locali — pensa a esportare', 'Cambios locales — considera exportar');
t('backup_stale_1', 'Dernière sauvegarde il y a 1 jour', 'Last backup 1 day ago', 'Letzte Sicherung vor 1 Tag', 'Ultimo backup 1 giorno fa', 'Última copia hace 1 día');
t('backup_stale_days', 'Dernière sauvegarde il y a {days} jours', 'Last backup {days} days ago', 'Letzte Sicherung vor {days} Tagen', 'Ultimo backup {days} giorni fa', 'Última copia hace {days} días');

// ── Archive import errors ─────────────────────────────────────────────────────
t('archive_empty_file', 'Fichier vide ou inaccessible — réessayez de sélectionner la sauvegarde.', 'Empty or inaccessible file — try selecting the backup again.', 'Leere oder unzugängliche Datei — Sicherung erneut auswählen.', 'File vuoto o inaccessibile — riprova a selezionare il backup.', 'Archivo vacío o inaccesible — reintenta seleccionar la copia.');
t('archive_read_failed', 'Impossible de lire le fichier de sauvegarde.', 'Unable to read backup file.', 'Sicherungsdatei kann nicht gelesen werden.', 'Impossibile leggere il file di backup.', 'No se puede leer el archivo de copia.');
t('archive_invalid_zip', 'Fichier ZIP invalide ou corrompu.', 'Invalid or corrupted ZIP file.', 'Ungültige oder beschädigte ZIP-Datei.', 'File ZIP non valido o corrotto.', 'Archivo ZIP inválido o corrupto.');
t('archive_legacy_format', "Cette sauvegarde utilise l'ancien format (mot de passe). Réexportez-la avec la version actuelle de l'app.", 'This backup uses the legacy format (password). Re-export with the current app version.', 'Diese Sicherung nutzt das alte Format (Passwort). Mit aktueller App neu exportieren.', 'Questo backup usa il vecchio formato (password). Riesporta con la versione attuale.', 'Esta copia usa el formato antiguo (contraseña). Reexporta con la versión actual.');
t('archive_unsupported_version', 'Version de sauvegarde non supportée.', 'Unsupported backup version.', 'Nicht unterstützte Sicherungsversion.', 'Versione backup non supportata.', 'Versión de copia no compatible.');
t('archive_invalid_manifest', 'Manifeste de sauvegarde invalide.', 'Invalid backup manifest.', 'Ungültiges Sicherungsmanifest.', 'Manifesto backup non valido.', 'Manifiesto de copia inválido.');
t('archive_manifest_missing', 'Manifeste introuvable dans l\'archive.', 'Manifest not found in archive.', 'Manifest in Archiv nicht gefunden.', 'Manifest non trovato nell\'archivio.', 'Manifiesto no encontrado en el archivo.');
t('archive_file_missing', "Fichier manquant dans l'archive : {path}", 'Missing file in archive: {path}', 'Fehlende Datei im Archiv: {path}', 'File mancante nell\'archivio: {path}', 'Archivo faltante en el archivo: {path}');
t('archive_checksum_mismatch', 'Fichier altéré ou corrompu : {path}', 'Altered or corrupted file: {path}', 'Veränderte oder beschädigte Datei: {path}', 'File alterato o corrotto: {path}', 'Archivo alterado o corrupto: {path}');
t('archive_media_missing', 'Média manquant : {path}', 'Missing media: {path}', 'Fehlendes Medium: {path}', 'Media mancante: {path}', 'Medio faltante: {path}');
t('archive_media_ref_missing', 'Média référencé absent : {path}', 'Referenced media missing: {path}', 'Referenziertes Medium fehlt: {path}', 'Media referenziato assente: {path}', 'Medio referenciado ausente: {path}');
t('archive_invalid_payload', 'Contenu de sauvegarde invalide.', 'Invalid backup content.', 'Ungültiger Sicherungsinhalt.', 'Contenuto backup non valido.', 'Contenido de copia inválido.');
t('archive_too_large', "Archive trop volumineuse pour être importée sur cet appareil.", 'Archive too large to import on this device.', 'Archiv zu groß für Import auf diesem Gerät.', 'Archivio troppo grande per l\'import su questo dispositivo.', 'Archivo demasiado grande para importar en este dispositivo.');
t('archive_encrypted_missing', 'Données chiffrées introuvables.', 'Encrypted data not found.', 'Verschlüsselte Daten nicht gefunden.', 'Dati cifrati non trovati.', 'Datos cifrados no encontrados.');
t('archive_corrupt_encrypted', 'Sauvegarde corrompue ou données chiffrées invalides.', 'Corrupt backup or invalid encrypted data.', 'Beschädigte Sicherung oder ungültige verschlüsselte Daten.', 'Backup corrotto o dati cifrati non validi.', 'Copia corrupta o datos cifrados inválidos.');
t('archive_incoming_read_failed', 'Impossible de lire la sauvegarde reçue.', 'Unable to read received backup.', 'Empfangene Sicherung kann nicht gelesen werden.', 'Impossibile leggere il backup ricevuto.', 'No se puede leer la copia recibida.');

// ── Onboarding ────────────────────────────────────────────────────────────────
t('onboarding_welcome_title', 'Bienvenue sur Yamadori', 'Welcome to Yamadori', 'Willkommen bei Yamadori', 'Benvenuto su Yamadori', 'Bienvenido a Yamadori');
t('onboarding_welcome_desc', "Ne perdez plus jamais la trace de vos Yamadori : l'application vous permet de garder un emplacement GPS pour chacune de vos trouvailles ! Quelques autorisations seront demandées ensuite (GPS, photos, notes vocales).", 'Never lose track of your yamadori again — the app saves a GPS location for each of your finds! A few permissions will be requested next (GPS, photos, voice notes).', 'Verlieren Sie Ihre Yamadori-Funde nie wieder — die App speichert für jeden Fund einen GPS-Standort! Als Nächstes werden einige Berechtigungen abgefragt (GPS, Fotos, Sprachnotizen).', 'Non perdere mai più le tracce dei tuoi yamadori: l\'app conserva una posizione GPS per ogni ritrovamento! Subito dopo verranno richieste alcune autorizzazioni (GPS, foto, note vocali).', 'No pierdas nunca el rastro de tus yamadori: la app guarda una ubicación GPS para cada hallazgo. A continuación se solicitarán algunos permisos (GPS, fotos, notas de voz).');
t('onboarding_location_title', 'Localisation précise', 'Precise location', 'Genaue Standortbestimmung', 'Posizione precisa', 'Ubicación precisa');
t('onboarding_location_desc', "Le GPS géolocalise chaque photo d'arbre. Choisissez « Précise » (pas « Approximative ») quand Android le demande. Pour le suivi en arrière-plan, « Autoriser tout le temps » dans les réglages.", 'GPS geotags each tree photo. Choose "Precise" (not "Approximate") when Android asks. For background tracking, "Allow all the time" in settings.', 'GPS geotaggt jedes Baumfoto. „Genau" wählen (nicht „Ungefähr"). Für Hintergrundverfolgung „Immer erlauben".', 'Il GPS geolocalizza ogni foto. Scegli «Precisa» (non «Approssimativa»). Per il tracciamento in background, «Consenti sempre».', 'El GPS geolocaliza cada foto. Elige «Precisa» (no «Aproximada»). Para seguimiento en segundo plano, «Permitir todo el tiempo».');
t('onboarding_camera_title', 'Caméra et micro', 'Camera and microphone', 'Kamera und Mikrofon', 'Fotocamera e microfono', 'Cámara y micrófono');
t('onboarding_camera_desc', 'Pour photographier les arbres et enregistrer des notes vocales sur le terrain.', 'To photograph trees and record voice notes in the field.', 'Um Bäume zu fotografieren und Sprachnotizen aufzunehmen.', 'Per fotografare gli alberi e registrare note vocali sul campo.', 'Para fotografiar árboles y grabar notas de voz en el campo.');
t('onboarding_notifications_title', 'Notifications', 'Notifications', 'Benachrichtigungen', 'Notifiche', 'Notificaciones');
t('onboarding_notifications_desc', 'Android affiche une notification pendant le suivi GPS en arrière-plan. Recommandé si vous activez cette option dans Réglages.', 'Android shows a notification during background GPS tracking. Recommended if you enable this in Settings.', 'Android zeigt eine Benachrichtigung bei GPS-Hintergrundverfolgung. Empfohlen wenn in Einstellungen aktiviert.', 'Android mostra una notifica durante il tracciamento GPS in background. Consigliato se attivi questa opzione.', 'Android muestra una notificación durante el seguimiento GPS en segundo plano. Recomendado si activas esta opción.');
t('onboarding_compass_title', 'Boussole (optionnel)', 'Compass (optional)', 'Kompass (optional)', 'Bussola (opzionale)', 'Brújula (opcional)');
t('onboarding_compass_desc', "L'orientation de l'appareil améliore la navigation vers vos arbres. Vous pourrez aussi l'activer plus tard.", 'Device orientation improves navigation to your trees. You can also enable it later.', 'Geräteausrichtung verbessert die Navigation zu Ihren Bäumen. Später aktivierbar.', 'L\'orientamento del dispositivo migliora la navigazione verso i tuoi alberi. Attivabile anche dopo.', 'La orientación del dispositivo mejora la navegación hacia tus árboles. También puedes activarla después.');
t('onboarding_location_ok', 'Localisation autorisée.', 'Location authorized.', 'Standort autorisiert.', 'Localizzazione autorizzata.', 'Ubicación autorizada.');
t('onboarding_location_denied', "Localisation refusée — vous pourrez l'activer dans Réglages Android.", 'Location denied — you can enable it in Android Settings.', 'Standort verweigert — in Android-Einstellungen aktivierbar.', 'Localizzazione negata — potrai attivarla nelle impostazioni Android.', 'Ubicación denegada — puedes activarla en Ajustes Android.');
t('onboarding_camera_ok', 'Caméra et micro autorisés.', 'Camera and microphone authorized.', 'Kamera und Mikrofon autorisiert.', 'Fotocamera e microfono autorizzati.', 'Cámara y micrófono autorizados.');
t('onboarding_camera_partial', 'Autorisations partielles — complétez dans Réglages si besoin.', 'Partial permissions — complete in Settings if needed.', 'Teilweise Berechtigungen — in Einstellungen vervollständigen.', 'Autorizzazioni parziali — completa nelle impostazioni se necessario.', 'Permisos parciales — completa en Ajustes si es necesario.');
t('onboarding_camera_denied', 'Accès refusé — vous pourrez autoriser lors de la capture.', 'Access denied — you can authorize during capture.', 'Zugriff verweigert — bei der Aufnahme autorisierbar.', 'Accesso negato — potrai autorizzare durante la cattura.', 'Acceso denegado — puedes autorizar durante la captura.');
t('onboarding_notifications_ok', 'Notifications autorisées.', 'Notifications authorized.', 'Benachrichtigungen autorisiert.', 'Notifiche autorizzate.', 'Notificaciones autorizadas.');
t('onboarding_notifications_denied', 'Notifications refusées — le suivi GPS arrière-plan reste utilisable.', 'Notifications denied — background GPS tracking still usable.', 'Benachrichtigungen verweigert — GPS-Hintergrundverfolgung weiter nutzbar.', 'Notifiche negate — il tracciamento GPS in background resta utilizzabile.', 'Notificaciones denegadas — el seguimiento GPS en segundo plano sigue siendo usable.');
t('onboarding_compass_ok', 'Boussole activée.', 'Compass enabled.', 'Kompass aktiviert.', 'Bussola attivata.', 'Brújula activada.');
t('onboarding_compass_denied', "Boussole non activée — bouton disponible sur l'écran boussole.", 'Compass not enabled — button available on compass screen.', 'Kompass nicht aktiviert — Schaltfläche auf Kompassbildschirm verfügbar.', 'Bussola non attivata — pulsante disponibile nella schermata bussola.', 'Brújula no activada — botón disponible en la pantalla de brújula.');
t('onboarding_skip', 'Passer cette étape', 'Skip this step', 'Diesen Schritt überspringen', 'Salta questo passaggio', 'Omitir este paso');
t('onboarding_finish_skip', 'Terminer sans activer', 'Finish without enabling', 'Ohne Aktivierung beenden', 'Termina senza attivare', 'Terminar sin activar');
t('onboarding_legal_title', 'Responsabilité & Éthique', 'Liability & Ethics', 'Verantwortung & Ethik', 'Responsabilità ed etica', 'Responsabilidad y ética');
t('onboarding_legal_desc', "Le prélèvement d'arbres dans la nature (Yamadori) est soumis à l'autorisation stricte du propriétaire du terrain (Code Civil art. 546) et au respect des espèces protégées. L'éditeur de cette application fournit uniquement des données météorologiques et agronomiques. En utilisant cet outil, vous vous engagez à respecter les lois en vigueur et l'environnement.", 'Collecting trees in the wild (yamadori) requires the landowner\'s explicit permission (French Civil Code art. 546) and compliance with protected species rules. This app publisher only provides weather and agronomic data. By using this tool, you agree to comply with applicable laws and protect the environment.', 'Die Entnahme von Bäumen in der Natur (Yamadori) erfordert die ausdrückliche Zustimmung des Grundeigentümers (französisches Zivilgesetzbuch Art. 546) und die Einhaltung geschützter Arten. Der Herausgeber stellt ausschließlich Wetter- und agronomische Daten bereit. Mit der Nutzung verpflichten Sie sich, geltendes Recht und die Umwelt zu respektieren.', 'Il prelievo di alberi in natura (yamadori) richiede l\'autorizzazione esplicita del proprietario del terreno (Codice civile art. 546) e il rispetto delle specie protette. L\'editore fornisce solo dati meteorologici e agronomici. Usando questo strumento, ti impegni a rispettare le leggi vigenti e l\'ambiente.', 'La recolección de árboles en la naturaleza (yamadori) requiere la autorización expresa del propietario del terreno (Código Civil art. 546) y el respeto de las especies protegidas. El editor solo proporciona datos meteorológicos y agronómicos. Al usar esta herramienta, te comprometes a respetar las leyes vigentes y el medio ambiente.');
t('onboarding_legal_accept', "J'ai compris et j'accepte", 'I understand and accept', 'Ich habe verstanden und akzeptiere', 'Ho capito e accetto', 'Entiendo y acepto');
t('onboarding_backup_title', 'Sauvegarde locale', 'Local backup', 'Lokale Sicherung', 'Backup locale', 'Copia de seguridad local');
t('onboarding_backup_desc', "Vos repérages sont enregistrés uniquement sur cet appareil : vos données restent privées, sécurisées et à l'abri. Par conséquent, exportez régulièrement une sauvegarde vers un autre support physique (clé USB, ordinateur…) ou un cloud personnel (Google Drive, etc.) depuis Réglages → Sauvegarde.", 'Your scouting data is stored only on this device: your data stays private, secure and protected. Export a backup regularly to another physical medium (USB drive, computer…) or personal cloud (Google Drive, etc.) from Settings → Backup.', 'Ihre Daten werden nur auf diesem Gerät gespeichert: privat, sicher und geschützt. Exportieren Sie regelmäßig eine Sicherung auf ein anderes Medium (USB-Stick, Computer…) oder in eine persönliche Cloud (Google Drive usw.) unter Einstellungen → Sicherung.', 'I tuoi dati sono salvati solo su questo dispositivo: restano privati, sicuri e protetti. Esporta regolarmente un backup su un altro supporto (chiavetta USB, computer…) o cloud personale (Google Drive, ecc.) da Impostazioni → Backup.', 'Tus datos se guardan solo en este dispositivo: permanecen privados, seguros y protegidos. Exporta regularmente una copia a otro soporte físico (USB, ordenador…) o nube personal (Google Drive, etc.) en Ajustes → Copia de seguridad.');

// ── Layout / toggles / stores ─────────────────────────────────────────────────
t('layout_back', 'Retour à la liste', 'Back to list', 'Zurück zur Liste', 'Torna alla lista', 'Volver a la lista');
t('layout_export_backup', 'Exporter la sauvegarde dans les réglages', 'Export backup in settings', 'Sicherung in Einstellungen exportieren', 'Esporta backup nelle impostazioni', 'Exportar copia en ajustes');
t('outdoor_mode_enable', 'Activer le mode plein soleil', 'Enable bright sun mode', 'Sonnenmodus aktivieren', 'Attiva modalità pieno sole', 'Activar modo pleno sol');
t('outdoor_mode_disable', 'Désactiver le mode plein soleil', 'Disable bright sun mode', 'Sonnenmodus deaktivieren', 'Disattiva modalità pieno sole', 'Desactivar modo pleno sol');
t('simple_mode_enable', 'Activer le mode simple', 'Enable simple mode', 'Einfachen Modus aktivieren', 'Attiva modalità semplice', 'Activar modo simple');
t('simple_mode_disable', 'Désactiver le mode simple', 'Disable simple mode', 'Einfachen Modus deaktivieren', 'Disattiva modalità semplice', 'Desactivar modo simple');
t('simple_mode_active', 'Mode simple actif', 'Simple mode active', 'Einfacher Modus aktiv', 'Modalità semplice attiva', 'Modo simple activo');
t('simple_mode_inactive', 'Mode simple', 'Simple mode', 'Einfacher Modus', 'Modalità semplice', 'Modo simple');
t('store_trees_corrupt', "Données locales illisibles — essayez une sauvegarde ou réinstallez l'app.", 'Local data unreadable — try a backup or reinstall the app.', 'Lokale Daten unlesbar — Sicherung versuchen oder App neu installieren.', 'Dati locali illeggibili — prova un backup o reinstalla l\'app.', 'Datos locales ilegibles — prueba una copia o reinstala la app.');
t('agri_help_prefix', 'Aide : {title}', 'Help: {title}', 'Hilfe: {title}', 'Aiuto: {title}', 'Ayuda: {title}');
t('open_meteo_error', 'Open-Meteo ({status}) : {reason}', 'Open-Meteo ({status}): {reason}', 'Open-Meteo ({status}): {reason}', 'Open-Meteo ({status}): {reason}', 'Open-Meteo ({status}): {reason}');
t('agri_loading', 'Chargement des données agro-météo…', 'Loading agro-meteorological data…', 'Agrometeorologische Daten werden geladen…', 'Caricamento dati agro-meteo…', 'Cargando datos agrometeorológicos…');
t('yrs_detailed_indicators', 'Indicateurs détaillés', 'Detailed indicators', 'Detaillierte Indikatoren', 'Indicatori dettagliati', 'Indicadores detallados');
t('settings_language', 'Langue', 'Language', 'Sprache', 'Lingua', 'Idioma');
t('app_meta_description', "Repérage d'arbres en forêt — Yamadori Scouting", 'Forest tree scouting — Yamadori Scouting', 'Waldbaum-Sichtung — Yamadori Scouting', 'Rilevamento alberi in foresta — Yamadori Scouting', 'Registro de árboles en bosque — Yamadori Scouting');
t('error_photo_read', "Impossible de lire l'image", 'Unable to read image', 'Bild kann nicht gelesen werden', 'Impossibile leggere l\'immagine', 'No se puede leer la imagen');
t('error_photo_canvas', 'Impossible de créer le canvas', 'Unable to create canvas', 'Canvas kann nicht erstellt werden', 'Impossibile creare il canvas', 'No se puede crear el lienzo');
t('error_photo_load', "Impossible de charger l'image", 'Unable to load image', 'Bild kann nicht geladen werden', 'Impossibile caricare l\'immagine', 'No se puede cargar la imagen');
t('error_compression_timeout', 'Compression trop longue', 'Compression took too long', 'Komprimierung dauerte zu lange', 'Compressione troppo lunga', 'Compresión demasiado larga');
t('error_incoming_backup_read', 'Impossible de lire la sauvegarde reçue.', 'Unable to read received backup.', 'Empfangene Sicherung kann nicht gelesen werden.', 'Impossibile leggere il backup ricevuto.', 'No se puede leer la copia recibida.');
t('error_file_read', 'Lecture du fichier impossible.', 'Unable to read file.', 'Datei kann nicht gelesen werden.', 'Impossibile leggere il file.', 'No se puede leer el archivo.');
t('backup_export_dialog_title', 'Exporter la sauvegarde', 'Export backup', 'Sicherung exportieren', 'Esporta backup', 'Exportar copia de seguridad');


import { writeFileSync, mkdirSync } from 'node:fs';
const locales = ['fr', 'en', 'de', 'it', 'es'];
mkdirSync('messages', { recursive: true });
for (const loc of locales) {
	const out = {};
	for (const [key, vals] of Object.entries(catalog)) {
		out[key] = vals[loc];
	}
	writeFileSync(`messages/${loc}.json`, JSON.stringify(out, null, '\t') + '\n');
}
console.log('Keys:', Object.keys(catalog).length);
