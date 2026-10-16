<script lang="ts">
	import { untrack } from 'svelte';
	import { harvestWindowNotifyPlan } from '$lib/geo/harvestWindowPrior';
	import { appearanceSettingsState } from '$lib/stores/appearanceSettings.svelte';
	import { flushTreesPersist, treeStore, updateTree } from '$lib/stores/trees.svelte';
	import { refreshWeekWindow, weekWindowState } from '$lib/stores/weekWindow.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { speciesDisplayName } from '$lib/constants/species-i18n';
	import type { Tree } from '$lib/types/tree';
	import { formatCalendarDate } from '$lib/utils/date';
	import {
		calendarDaysUntil,
		localDateString,
		parseIsoDate,
		revisitDateStatus
	} from '$lib/utils/revisit';
	import {
		cancelHarvestWindowNotification,
		cancelRevisitDateNotification,
		requestRevisitNotificationPermission,
		scheduleHarvestWindowNotification,
		scheduleRevisitDateNotification
	} from '$lib/utils/revisitNotifications';
	import { hapticSelection } from '$lib/utils/haptics';
	import { earliestWindowNotifyAt, nextYrsNotifyAt } from '$lib/utils/weekWindow';

	let { tree, embedded = false }: { tree: Tree; embedded?: boolean } = $props();

	let dateDraft = $state(untrack(() => tree.nextRevisitAt ?? ''));
	let pickerNonce = $state(0);
	let notifyGen = 0;
	let dateError = $state('');
	let notifyError = $state('');

	let notifyChecked = $state(untrack(() => tree.notifyOnWindow === true));

	let windowPlan = $derived(
		harvestWindowNotifyPlan(tree.species, tree.latitude, tree.longitude)
	);

	let yrsAt = $derived(nextYrsNotifyAt(weekWindowState.viabilityById[tree.id]));

	let windowAlertAt = $derived(
		earliestWindowNotifyAt(windowPlan.status === 'upcoming' ? windowPlan.at : null, yrsAt)
	);

	let windowAlertLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (!notifyChecked || !windowAlertAt) return '';
		return m.revisit_alert_on({ date: formatCalendarDate(localDateString(windowAlertAt)) });
	});

	let formattedDate = $derived.by(() => {
		void appearanceSettingsState.locale;
		return dateDraft ? formatCalendarDate(dateDraft) : '';
	});

	let dateStatus = $derived(revisitDateStatus(dateDraft || null));

	let soonLabel = $derived.by(() => {
		void appearanceSettingsState.locale;
		if (dateStatus !== 'soon') return '';
		const days = calendarDaysUntil(dateDraft || null);
		if (days === 1) return m.revisit_in_one_day();
		if (days !== null) return m.revisit_in_days({ count: String(days) });
		return '';
	});

	function treeTitle(): string {
		void appearanceSettingsState.locale;
		const raw = tree.species.trim();
		return raw ? speciesDisplayName(raw) : tree.species;
	}

	function persistDate(next: string | null): void {
		dateDraft = next ?? '';
		pickerNonce += 1;
		void updateTree(tree.id, { nextRevisitAt: next, dateNotifySentFor: null }).catch((error) => {
			console.error('persist revisit date failed:', error);
		});
		void applyDateNotification(next);
	}

	async function applyDateNotification(next: string | null): Promise<void> {
		dateError = '';
		if (!next) {
			await cancelRevisitDateNotification(tree.id);
			return;
		}
		const granted = await requestRevisitNotificationPermission();
		if (!granted) {
			dateError = m.revisit_notify_denied();
			return;
		}
		try {
			const result = await scheduleRevisitDateNotification(tree.id, treeTitle(), next, {
				interactive: true,
				alreadySentFor: null
			});
			if (result === 'scheduled-inexact') {
				dateError = m.revisit_exact_alarm_denied();
			}
			if (result === 'fired') {
				await updateTree(tree.id, { dateNotifySentFor: next });
			}
		} catch (error) {
			console.error('schedule revisit date failed:', error);
			dateError = m.revisit_notify_failed();
		}
	}

	function onDateChange(event: Event): void {
		const value = (event.currentTarget as HTMLInputElement).value;
		persistDate(parseIsoDate(value));
	}

	function clearDate(): void {
		persistDate(null);
	}

	async function persistNotify(enabled: boolean, armed: boolean): Promise<void> {
		try {
			await updateTree(tree.id, { notifyOnWindow: enabled, windowNotifyArmed: armed });
			await flushTreesPersist();
		} catch (error) {
			console.error(
				enabled ? 'enable window notify failed:' : 'disable window notify failed:',
				error
			);
		}
	}

	async function onNotifyChange(event: Event): Promise<void> {
		const enabled = (event.currentTarget as HTMLInputElement).checked;
		notifyChecked = enabled;
		void hapticSelection();
		notifyError = '';

		if (!enabled) {
			notifyGen += 1;
			await persistNotify(false, false);
			await cancelHarvestWindowNotification(tree.id);
			return;
		}

		const gen = ++notifyGen;
		await refreshWeekWindow(treeStore.trees);
		if (gen !== notifyGen) return;

		const plan = harvestWindowNotifyPlan(tree.species, tree.latitude, tree.longitude);
		const nextYrsAt = nextYrsNotifyAt(weekWindowState.viabilityById[tree.id]);
		if (plan.status === 'unavailable' && !nextYrsAt) {
			notifyChecked = false;
			notifyError = m.revisit_notify_unavailable();
			return;
		}

		const granted = await requestRevisitNotificationPermission();
		if (gen !== notifyGen) return;
		if (!granted) {
			notifyChecked = false;
			notifyError = m.revisit_notify_denied();
			return;
		}

		try {
			const result = await scheduleHarvestWindowNotification(tree, treeTitle(), {
				interactive: true,
				yrsAt: nextYrsAt
			});
			if (gen !== notifyGen) return;
			if (result === 'unavailable') {
				notifyChecked = false;
				notifyError = m.revisit_notify_unavailable();
				return;
			}

			if (result === 'scheduled-inexact') {
				notifyError = m.revisit_exact_alarm_denied();
			}

			await persistNotify(true, result === 'scheduled' || result === 'scheduled-inexact');
		} catch (error) {
			console.error('schedule harvest window failed:', error);
			if (gen !== notifyGen) return;
			notifyChecked = false;
			notifyError = m.revisit_notify_failed();
		}
	}
</script>

<section class={['flex flex-col gap-3 p-4', !embedded && 'app-card-muted']}>
	<h3 class="text-sm font-medium text-forest-900">{m.revisit_date_label()}</h3>

	<div class="flex items-center gap-2">
		{#key pickerNonce}
			<label
				class="relative min-h-11 min-w-0 flex-1 overflow-hidden rounded-xl border px-3 py-2.5 text-base focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-forest-600 {dateDraft
					? 'border-gray-200 bg-white'
					: 'border-dashed border-gray-300 bg-white/70'}"
			>
				<span class="flex flex-wrap items-center gap-2" aria-live="polite">
					{#if dateDraft}
						<span class="font-medium text-forest-900">{formattedDate}</span>
						{#if dateStatus === 'today'}
							<span
								class="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-900"
							>
								{m.revisit_due_today()}
							</span>
						{:else if dateStatus === 'soon' && soonLabel}
							<span
								class="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-900"
							>
								{soonLabel}
							</span>
						{:else if dateStatus === 'overdue'}
							<span
								class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
							>
								{m.revisit_overdue()}
							</span>
						{/if}
					{:else}
						<span class="text-muted">{m.revisit_date_choose()}</span>
					{/if}
				</span>
				<input
					type="date"
					value={dateDraft}
					onchange={onDateChange}
					aria-label={dateDraft ? formattedDate : m.revisit_date_choose()}
					class="absolute inset-0 cursor-pointer text-base opacity-0"
				/>
			</label>
		{/key}
		{#if dateDraft}
			<button
				type="button"
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-forest-900 transition active:scale-95"
				aria-label={m.revisit_clear()}
				onclick={clearDate}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="h-5 w-5"
					aria-hidden="true"
				>
					<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
				</svg>
			</button>
		{/if}
	</div>

	{#if dateError}
		<p class="text-sm text-amber-800" role="alert">{dateError}</p>
	{/if}

	<label class="flex items-center gap-3 border-t border-gray-200 pt-3">
		<input
			type="checkbox"
			class="h-4 w-4 shrink-0 rounded border-gray-300 text-forest-800 focus:ring-forest-600"
			bind:checked={notifyChecked}
			onchange={onNotifyChange}
		/>
		<span
			class="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm font-medium text-forest-900"
		>
			{m.revisit_notify_window()}
			{#if notifyChecked}
				<span class="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-900">
					{m.revisit_notify_on()}
				</span>
			{/if}
		</span>
	</label>

	{#if windowAlertLabel}
		<p class="text-sm text-muted">{windowAlertLabel}</p>
	{/if}

	{#if notifyError}
		<p class="text-sm text-amber-800" role="alert">{notifyError}</p>
	{/if}
</section>
