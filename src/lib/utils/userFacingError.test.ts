import { describe, expect, it } from 'vitest';
import { ArchiveError } from '$lib/utils/archive/types';
import {
	formatErrorToast,
	formatUserFacingError,
	resolveErrorCopy,
	UserFacingError,
	type ErrorCopy
} from './userFacingError';

const fallback: ErrorCopy = {
	what: 'L’arbre n’a pas été enregistré.',
	why: 'L’écriture locale a échoué.',
	action: { label: 'Réessayer', kind: 'retry' }
};

describe('formatUserFacingError', () => {
	it('keeps localized ArchiveError messages', () => {
		expect(formatUserFacingError(new ArchiveError('ARCHIVE_TOO_LARGE', 'Trop gros'), 'fallback')).toBe(
			'Trop gros'
		);
	});

	it('hides native error strings', () => {
		expect(formatUserFacingError(new Error('disk_full'), 'Sauvegarde impossible')).toBe(
			'Sauvegarde impossible'
		);
	});

	it('formats UserFacingError as What — Action', () => {
		expect(
			formatUserFacingError(new UserFacingError(fallback), 'Sauvegarde impossible')
		).toBe('L’arbre n’a pas été enregistré. L’écriture locale a échoué. — Réessayer');
	});
});

describe('resolveErrorCopy', () => {
	it('returns UserFacingError copy', () => {
		expect(resolveErrorCopy(new UserFacingError(fallback), fallback)).toEqual(fallback);
	});

	it('keeps ArchiveError message as what', () => {
		const copy = resolveErrorCopy(new ArchiveError('ARCHIVE_WRONG_PASSWORD', 'Mot de passe incorrect.'), fallback);
		expect(copy.what).toBe('Mot de passe incorrect.');
		expect(copy.action).toEqual(fallback.action);
	});

	it('uses fallback for native errors', () => {
		expect(resolveErrorCopy(new Error('QuotaExceededError'), fallback)).toEqual(fallback);
	});
});

describe('formatErrorToast', () => {
	it('joins what, short why, and action', () => {
		expect(formatErrorToast(fallback)).toBe(
			'L’arbre n’a pas été enregistré. L’écriture locale a échoué. — Réessayer'
		);
	});

	it('omits a long why', () => {
		expect(
			formatErrorToast({
				what: 'Les tuiles de la carte n’ont pas chargé.',
				why: 'La connexion réseau est trop lente ou le service cartographique ne répond pas pour le moment.',
				action: { label: 'Réessayer', kind: 'retry' }
			})
		).toBe('Les tuiles de la carte n’ont pas chargé. — Réessayer');
	});
});
