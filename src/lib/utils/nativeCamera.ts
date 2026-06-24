import * as m from '$lib/paraglide/messages.js';
import { Camera, CameraResultType, CameraSource, type Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { isNativeApp } from '$lib/utils/platform';
import { CAPTURE_JPEG_QUALITY, PHOTO_MAX_WIDTH } from '$lib/utils/photo';

export type NativePhotoCapture = {
	file: File;
	previewUrl: string;
};

async function blobFromPhoto(photo: Photo): Promise<Blob> {
	if (photo.dataUrl) {
		return (await fetch(photo.dataUrl)).blob();
	}

	if (photo.base64String) {
		return (await fetch(`data:image/jpeg;base64,${photo.base64String}`)).blob();
	}

	const path = photo.webPath ?? photo.path;
	if (!path) {
		throw new Error(m.camera_no_data());
	}

	return (await fetch(Capacitor.convertFileSrc(path))).blob();
}

export async function capturePhoto(): Promise<NativePhotoCapture | null> {
	if (!isNativeApp()) {
		return null;
	}

	const permissions = await Camera.requestPermissions({
		permissions: ['camera']
	});
	if (permissions.camera === 'denied') {
		throw new Error(m.camera_denied());
	}

	const photo = await Camera.getPhoto({
		source: CameraSource.Camera,
		resultType: CameraResultType.Uri,
		quality: CAPTURE_JPEG_QUALITY,
		width: PHOTO_MAX_WIDTH,
		correctOrientation: true,
		saveToGallery: false
	});

	const blob = await blobFromPhoto(photo);
	if (blob.size === 0) {
		return null;
	}

	const extension = blob.type === 'image/png' ? 'png' : 'jpg';
	const fileName = `yamadori-${Date.now()}.${extension}`;
	const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
	const previewUrl = URL.createObjectURL(blob);

	return { file, previewUrl };
}
