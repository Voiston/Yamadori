<script lang="ts">
	import { base } from '$app/paths';
	import {
		DEFAULT_SYNC_CONFIG,
		loadSyncConfig,
		saveSyncConfig
	} from '$lib/sync/config';
	import {
		initSyncEngine,
		runSync,
		stopSyncEngine,
		syncState,
		testConnection
	} from '$lib/sync/engine.svelte';

	let config = $state({ ...DEFAULT_SYNC_CONFIG });
	let password = $state('');
	let saving = $state(false);
	let testing = $state(false);
	let feedback = $state<{ type: 'ok' | 'error'; message: string } | null>(null);

	$effect(() => {
		void loadSyncConfig().then((stored) => {
			config = { ...stored };
		});
	});

	function formatLastSync(value: string | null): string {
		if (!value) return 'Jamais';
		return new Date(value).toLocaleString('fr-FR');
	}

	async function handleSave() {
		saving = true;
		feedback = null;
		try {
			await saveSyncConfig({ ...config });
			stopSyncEngine();
			if (config.enabled) {
				await initSyncEngine();
			}
			feedback = { type: 'ok', message: 'Réglages enregistrés.' };
		} catch (error) {
			feedback = {
				type: 'error',
				message: error instanceof Error ? error.message : 'Enregistrement impossible.'
			};
		} finally {
			saving = false;
		}
	}

	async function handleTestLogin() {
		testing = true;
		feedback = null;
		const result = await testConnection({ ...config, enabled: true }, password);
		if (result.ok) {
			await saveSyncConfig({ ...config, enabled: true });
			config.enabled = true;
			stopSyncEngine();
			await initSyncEngine();
			feedback = { type: 'ok', message: 'Connexion réussie. Synchronisation activée.' };
		} else {
			feedback = { type: 'error', message: result.error };
		}
		testing = false;
	}

	async function handleSyncNow() {
		testing = true;
		feedback = null;
		const ok = await runSync({ fullPush: false });
		if (ok) {
			feedback = { type: 'ok', message: 'Synchronisation terminée.' };
		} else if (syncState.lastError) {
			feedback = { type: 'error', message: syncState.lastError };
		} else if (syncState.status === 'offline') {
			feedback = { type: 'error', message: 'Serveur injoignable pour le moment.' };
		}
		testing = false;
	}

	async function handleFullPull() {
		testing = true;
		feedback = null;
		const ok = await runSync({ fullPull: true });
		if (ok) {
			feedback = syncState.lastError
				? { type: 'ok', message: `Récupération partielle. ${syncState.lastError}` }
				: { type: 'ok', message: 'Fiches récupérées depuis le serveur.' };
		} else {
			feedback = { type: 'error', message: syncState.lastError ?? 'Récupération impossible.' };
		}
		testing = false;
	}

	async function handleFullPush() {
		testing = true;
		feedback = null;
		const ok = await runSync({ fullPush: true });
		feedback = ok
			? { type: 'ok', message: 'Toutes les fiches locales ont été envoyées.' }
			: { type: 'error', message: syncState.lastError ?? 'Envoi impossible.' };
		testing = false;
	}
</script>

<svelte:head>
	<title>Réglages — Yamadori Scouting</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-lg font-semibold text-forest-900">Synchronisation</h2>
		<p class="mt-1 text-sm text-muted">
			Connectez l'app à votre PocketBase via Tailscale. Commencez par votre propre PC pour vous
			familiariser.
		</p>
	</div>

	<label class="flex flex-col gap-1.5">
		<span class="text-sm font-medium text-forest-900">URL du serveur</span>
		<input
			type="url"
			bind:value={config.serverUrl}
			placeholder="https://david-pc.mon-tailnet.ts.net"
			class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest-600"
		/>
		<span class="text-xs text-muted">URL Tailscale Serve ou PocketBase local</span>
	</label>

	<label class="flex flex-col gap-1.5">
		<span class="text-sm font-medium text-forest-900">Email</span>
		<input
			type="email"
			bind:value={config.email}
			autocomplete="username"
			class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest-600"
		/>
	</label>

	<label class="flex flex-col gap-1.5">
		<span class="text-sm font-medium text-forest-900">Mot de passe</span>
		<input
			type="password"
			bind:value={password}
			autocomplete="current-password"
			class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-forest-600"
		/>
		<span class="text-xs text-muted">Non stocké — sert uniquement à la connexion</span>
	</label>

	<label class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3">
		<input type="checkbox" bind:checked={config.enabled} class="h-4 w-4 rounded" />
		<span class="text-sm text-forest-900">Activer la synchronisation automatique</span>
	</label>

	<div class="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-muted">
		<p>État : <strong class="text-forest-900">{syncState.status}</strong></p>
		<p>En attente : <strong class="text-forest-900">{syncState.pendingCount}</strong></p>
		<p>Dernière sync : <strong class="text-forest-900">{formatLastSync(syncState.lastSyncedAt)}</strong></p>
		{#if syncState.lastError}
			<p class="mt-2 text-red-700">
				Erreur : <strong class="text-red-800">{syncState.lastError}</strong>
			</p>
		{/if}
	</div>

	{#if feedback}
		<p
			class="rounded-xl px-3 py-2 text-sm {feedback.type === 'ok'
				? 'bg-green-50 text-green-800'
				: 'bg-red-50 text-red-800'}"
			role="status"
		>
			{feedback.message}
		</p>
	{/if}

	<div class="flex flex-col gap-3">
		<button
			type="button"
			onclick={handleTestLogin}
			disabled={testing || saving}
			class="rounded-xl bg-forest-800 px-4 py-3 text-sm font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
		>
			Tester la connexion
		</button>

		<button
			type="button"
			onclick={handleSave}
			disabled={saving || testing}
			class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
		>
			Enregistrer
		</button>

		<button
			type="button"
			onclick={handleSyncNow}
			disabled={testing || !config.enabled}
			class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-forest-800 transition active:scale-[0.98] disabled:opacity-50"
		>
			Synchroniser maintenant
		</button>

		<button
			type="button"
			onclick={handleFullPull}
			disabled={testing || !config.enabled}
			class="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900 transition active:scale-[0.98] disabled:opacity-50"
		>
			Récupérer depuis le serveur
		</button>

		<button
			type="button"
			onclick={handleFullPush}
			disabled={testing || !config.enabled}
			class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 transition active:scale-[0.98] disabled:opacity-50"
		>
			Envoyer toutes les fiches locales
		</button>
	</div>

	<div class="rounded-xl border border-gray-100 bg-white px-4 py-4 text-sm text-muted">
		<p class="font-medium text-forest-900">Guide rapide (ton PC)</p>
		<ol class="mt-2 list-decimal space-y-1 pl-5">
			<li>Installer Tailscale sur ton PC et ton téléphone</li>
			<li>Lancer PocketBase : <code class="text-xs">pocketbase serve --http=127.0.0.1:8090</code></li>
			<li>Exposer via Tailscale : <code class="text-xs">tailscale serve --bg http://127.0.0.1:8090</code></li>
			<li>Créer la collection <code class="text-xs">trees</code> (voir docs/SYNC-SETUP.md)</li>
			<li>Créer un compte utilisateur dans l'admin PocketBase</li>
		</ol>
	</div>

	<a href="{base}/" class="text-center text-sm font-medium text-forest-800">Retour à la liste</a>
</div>
