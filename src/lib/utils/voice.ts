import * as m from '$lib/paraglide/messages.js';
import type { VoiceNote } from '$lib/types/tree';
import { debugLog } from '$lib/utils/debug-log';
import { isNativeApp } from '$lib/utils/platform';
import { RecordingStatus, VoiceRecorder } from 'capacitor-voice-recorder';

export const MAX_DURATION_MS = 30_000;
export const MIN_DURATION_MS = 1_500;

const MIME_CANDIDATES = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];

export function isVoiceRecordingSupported(): boolean {
	return (
		typeof navigator !== 'undefined' &&
		(!!navigator.mediaDevices?.getUserMedia || isNativeApp()) &&
		(typeof MediaRecorder !== 'undefined' || isNativeApp())
	);
}

export async function ensureMicrophonePermission(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	const hasPermission = await VoiceRecorder.hasAudioRecordingPermission();
	if (hasPermission.value) {
		return;
	}

	const { value } = await VoiceRecorder.requestAudioRecordingPermission();
	if (value !== true) {
		throw new DOMException('Permission denied', 'NotAllowedError');
	}
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
				return isNativeApp() ? m.voice_mic_denied_android() : m.voice_mic_denied_web();
			case 'NotFoundError':
				return m.voice_no_mic();
			case 'NotReadableError':
				return m.voice_mic_busy();
			default:
				return err.message || m.voice_start_error();
		}
	}
	if (err instanceof Error) {
		return err.message;
	}
	return m.voice_start_error();
}

export function isVoiceRecordingPermissionError(err: unknown): boolean {
	if (err instanceof DOMException && err.name === 'NotAllowedError') {
		return true;
	}
	return err instanceof Error && /permission/i.test(err.message);
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
		reader.onerror = () => reject(new Error(m.voice_read_error()));
		reader.readAsDataURL(blob);
	});
}

function base64ToBlob(base64: string, mimeType: string): Blob {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Blob([bytes], { type: mimeType });
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
	private useNative = false;
	private stream: MediaStream | null = null;
	private recorder: MediaRecorder | null = null;
	private chunks: Blob[] = [];
	private mimeType = '';
	private startedAt = 0;

	async start(): Promise<void> {
		if (isNativeApp()) {
			try {
				await ensureMicrophonePermission();
				await this.startWeb();
				return;
			} catch (webError) {
				if (isVoiceRecordingPermissionError(webError)) {
					throw webError;
				}
				try {
					await this.startNative();
					return;
				} catch {
					throw webError;
				}
			}
		}

		await this.startWeb();
	}

	private async startNative(): Promise<void> {
		// #region agent log
		debugLog('voice:startNative', 'native record start', {}, 'H51');
		// #endregion

		const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
		if (!canRecord.value) {
			throw new Error(m.voice_unsupported_device());
		}

		await ensureMicrophonePermission();

		const started = await VoiceRecorder.startRecording();
		if (!started.value) {
			throw new Error(m.voice_start_error());
		}

		this.useNative = true;
		this.startedAt = Date.now();

		// #region agent log
		debugLog('voice:startNative', 'native record started', {}, 'H51');
		// #endregion
	}

	private async startWeb(): Promise<void> {
		if (!isVoiceRecordingSupported()) {
			throw new Error(m.voice_unsupported_browser());
		}

		this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

		this.chunks = [];
		try {
			this.recorder = createMediaRecorder(this.stream);
		} catch (err) {
			this.cleanupWeb();
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

	async stop(): Promise<{ blob: Blob; durationMs: number; mimeType: string }> {
		if (this.useNative) {
			const result = await VoiceRecorder.stopRecording();
			const { recordDataBase64, msDuration, mimeType } = result.value;

			if (!recordDataBase64) {
				this.useNative = false;
				throw new Error(m.voice_empty());
			}

			const blob = base64ToBlob(recordDataBase64, mimeType);
			this.useNative = false;

			// #region agent log
			debugLog(
				'voice:stopNative',
				'native record stopped',
				{ durationMs: msDuration, mimeType },
				'H51'
			);
			// #endregion

			return {
				blob,
				durationMs: msDuration,
				mimeType
			};
		}

		return new Promise((resolve, reject) => {
			const recorder = this.recorder;
			if (!recorder || recorder.state === 'inactive') {
				this.cleanupWeb();
				reject(new Error(m.voice_no_session()));
				return;
			}

			recorder.onstop = () => {
				const durationMs = Date.now() - this.startedAt;
				const mimeType = recorder.mimeType || this.mimeType;
				const blob = new Blob(this.chunks, { type: mimeType });
				this.cleanupWeb();
				resolve({ blob, durationMs, mimeType });
			};

			recorder.onerror = () => {
				this.cleanupWeb();
				reject(new Error(m.voice_recording_error()));
			};

			recorder.stop();
		});
	}

	cancel(): void {
		if (this.useNative) {
			void VoiceRecorder.getCurrentStatus().then(async (status) => {
				if (status.status === RecordingStatus.RECORDING) {
					await VoiceRecorder.stopRecording().catch(() => {});
				}
			});
			this.useNative = false;
			return;
		}

		if (this.recorder && this.recorder.state !== 'inactive') {
			this.recorder.stop();
		}
		this.cleanupWeb();
	}

	private cleanupWeb(): void {
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
