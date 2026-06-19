import type { VoiceNote } from '$lib/types/tree';

export const MAX_DURATION_MS = 30_000;
export const MIN_DURATION_MS = 1_500;

const MIME_CANDIDATES = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];

export function isVoiceRecordingSupported(): boolean {
	return (
		typeof navigator !== 'undefined' &&
		!!navigator.mediaDevices?.getUserMedia &&
		typeof MediaRecorder !== 'undefined'
	);
}

export function getPreferredAudioMimeType(): string {
	for (const mime of MIME_CANDIDATES) {
		if (MediaRecorder.isTypeSupported(mime)) {
			return mime;
		}
	}
	return '';
}

export function getVoiceRecordingErrorMessage(err: unknown): string {
	if (err instanceof DOMException) {
		switch (err.name) {
			case 'NotAllowedError':
				return 'Accès au micro refusé. Dans Brave : menu du site → Réglages du site → Microphone → Autoriser.';
			case 'NotFoundError':
				return 'Aucun micro détecté sur cet appareil.';
			case 'NotReadableError':
				return 'Le micro est utilisé par une autre application.';
			default:
				return err.message || 'Impossible de démarrer l\'enregistrement';
		}
	}
	if (err instanceof Error) {
		return err.message;
	}
	return 'Impossible de démarrer l\'enregistrement';
}

export function isVoiceRecordingPermissionError(err: unknown): boolean {
	return err instanceof DOMException && err.name === 'NotAllowedError';
}

export function formatVoiceDuration(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(new Error('Impossible de lire l\'enregistrement audio'));
		reader.readAsDataURL(blob);
	});
}

function createMediaRecorder(stream: MediaStream): MediaRecorder {
	const preferredMime = getPreferredAudioMimeType();
	if (preferredMime) {
		try {
			return new MediaRecorder(stream, { mimeType: preferredMime });
		} catch {
			/* fallback below */
		}
	}
	return new MediaRecorder(stream);
}

export class VoiceRecorderSession {
	private stream: MediaStream | null = null;
	private recorder: MediaRecorder | null = null;
	private chunks: Blob[] = [];
	private mimeType = '';
	private startedAt = 0;

	async start(): Promise<void> {
		if (!isVoiceRecordingSupported()) {
			throw new Error('Micro non supporté sur ce navigateur');
		}

		this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

		this.chunks = [];
		try {
			this.recorder = createMediaRecorder(this.stream);
		} catch (err) {
			this.cleanup();
			throw err;
		}

		this.mimeType = this.recorder.mimeType || getPreferredAudioMimeType() || 'audio/mp4';
		this.startedAt = Date.now();

		this.recorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				this.chunks.push(event.data);
			}
		};

		this.recorder.start();
	}

	stop(): Promise<{ blob: Blob; durationMs: number; mimeType: string }> {
		return new Promise((resolve, reject) => {
			const recorder = this.recorder;
			if (!recorder || recorder.state === 'inactive') {
				this.cleanup();
				reject(new Error('Aucun enregistrement en cours'));
				return;
			}

			recorder.onstop = () => {
				const durationMs = Date.now() - this.startedAt;
				const mimeType = recorder.mimeType || this.mimeType;
				const blob = new Blob(this.chunks, { type: mimeType });
				this.cleanup();
				resolve({ blob, durationMs, mimeType });
			};

			recorder.onerror = () => {
				this.cleanup();
				reject(new Error('Erreur pendant l\'enregistrement'));
			};

			recorder.stop();
		});
	}

	cancel(): void {
		if (this.recorder && this.recorder.state !== 'inactive') {
			this.recorder.stop();
		}
		this.cleanup();
	}

	private cleanup(): void {
		for (const track of this.stream?.getTracks() ?? []) {
			track.stop();
		}
		this.stream = null;
		this.recorder = null;
		this.chunks = [];
	}
}

export async function createVoiceNoteFromBlob(
	blob: Blob,
	durationMs: number,
	mimeType: string
): Promise<VoiceNote> {
	return {
		recordedAt: new Date().toISOString(),
		durationMs,
		mimeType,
		audioBase64: await blobToDataUrl(blob)
	};
}
