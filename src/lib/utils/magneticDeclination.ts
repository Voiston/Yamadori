import geomagnetism from 'geomagnetism';

export function getMagneticDeclinationDeg(latitude: number, longitude: number): number {
	const model = geomagnetism.model();
	const info = model.point([latitude, longitude]);
	return info.decl;
}
