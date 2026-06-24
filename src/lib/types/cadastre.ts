export type CadastreZoneType = 'state_forest' | 'communal_forest' | 'private';

export interface CadastreInfo {
	commune: string;
	section: string;
	parcelNumber: string;
	codeInsee: string;
	zoneType: CadastreZoneType;
	fetchedAt: string;
}
